/**
 * Distributed rate limits for the auth surface.
 *
 * The auth package applies its own per-process limits, but those are per
 * replica and reset on restart. This middleware runs first and is Redis-backed
 * (see lib/rateLimit.ts), so the budget is shared across every replica.
 *
 * Credential-guessing buckets (login, register, OAuth, reset) fail CLOSED in
 * production: if Redis is down, deny rather than silently degrade to per-process
 * counters that an attacker can spread across replicas. `refresh` fails open —
 * it needs a valid signed token to be worth anything, and locking it out would
 * sign every user out during a Redis blip.
 */
import type { Context, Next } from "hono";
import { getRateLimitClientKey } from "../lib/clientIp.js";
import { defaultRateLimitConfig, enforceRateLimit } from "../lib/rateLimit.js";

type Bucket = {
  /** Requests allowed per window. */
  max: number;
  windowMs: number;
  failClosed: boolean;
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Keyed by the path segment after `/api/v1/auth/`. */
const BUCKETS: Record<string, Bucket> = {
  login: { max: 10, windowMs: MINUTE, failClosed: true },
  register: { max: 10, windowMs: MINUTE, failClosed: true },
  google: { max: 10, windowMs: MINUTE, failClosed: true },
  apple: { max: 10, windowMs: MINUTE, failClosed: true },
  facebook: { max: 10, windowMs: MINUTE, failClosed: true },
  refresh: { max: 30, windowMs: MINUTE, failClosed: false },
  "forgot-password": { max: 3, windowMs: HOUR, failClosed: true },
  "reset-password": { max: 10, windowMs: HOUR, failClosed: true },
  "verify-email": { max: 10, windowMs: HOUR, failClosed: true },
  "resend-code": { max: 5, windowMs: HOUR, failClosed: true },
};

/** `/api/v1/auth/login` -> `login`. Returns null for anything else. */
export function authBucketFor(path: string): string | null {
  const match = path.match(/^\/api\/v1\/auth\/([a-z-]+)\/?$/);
  return match ? match[1] : null;
}

/**
 * Fail-closed only bites in production; a single-replica dev box with no Redis
 * would otherwise be unable to sign in at all. `RATE_LIMIT_FAIL_CLOSED` (already
 * declared in .env.example) overrides in either direction.
 */
function failClosedEnabled(bucket: Bucket): boolean {
  if (!bucket.failClosed) return false;
  const raw = process.env.RATE_LIMIT_FAIL_CLOSED?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return process.env.NODE_ENV === "production";
}

export function authRateLimit() {
  return async (c: Context, next: Next) => {
    const name = authBucketFor(c.req.path);
    const bucket = name ? BUCKETS[name] : undefined;
    if (!bucket) return next();

    const limited = await enforceRateLimit(
      getRateLimitClientKey(c.req.raw, `auth:${name}`),
      bucket.max,
      bucket.windowMs,
      { ...defaultRateLimitConfig(), failClosed: failClosedEnabled(bucket) },
    );
    if (limited) return limited;

    return next();
  };
}
