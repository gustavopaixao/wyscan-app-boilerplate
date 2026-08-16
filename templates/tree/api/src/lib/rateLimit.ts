/**
 * Rate limiting — Redis when REDIS_URL is set, Wyscan in-memory fallback otherwise.
 */

import { checkRateLimit } from "__NPM_SCOPE__/core-api/utils/rate-limit";
import { Redis } from "ioredis";
import type { NextResponse } from "next/server.js";
import { apiError } from "./apiError.js";

export type RateLimitRuntimeConfig = {
  redisUrl?: string;
  nodeEnv?: string;
  /**
   * When true, deny (fail closed) if Redis is unavailable instead of falling
   * back to per-process in-memory counters. Used for strict auth buckets so
   * brute-force protection doesn't weaken during a Redis outage / across
   * replicas. Security audit 2026-06-21 (L2).
   */
  failClosed?: boolean;
};

export function defaultRateLimitConfig(): RateLimitRuntimeConfig {
  return {
    redisUrl: process.env.REDIS_URL,
    nodeEnv: process.env.NODE_ENV,
  };
}

let sharedRedis: Redis | null = null;

function getSharedRedis(url: string): Redis {
  if (!sharedRedis) {
    sharedRedis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
  }
  return sharedRedis;
}

async function consumeRedisSlot(
  redis: Redis,
  bucketKey: string,
  maxEvents: number,
  windowMs: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const windowId = Math.floor(Date.now() / windowMs);
  const key = `rl:${bucketKey}:${windowId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.pexpire(key, windowMs);
  }
  if (count > maxEvents) {
    const ttlMs = await redis.pttl(key);
    const retryAfterSec = Math.max(
      1,
      Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000),
    );
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

function consumeMemorySlot(
  bucketKey: string,
  maxEvents: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const limited = checkRateLimit(bucketKey, maxEvents, windowMs);
  if (limited) {
    const retryAfterSec = Math.max(
      1,
      Number(limited.headers.get("Retry-After") ?? 60),
    );
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

/**
 * @returns ok true if under limit; otherwise ok false and seconds until retry
 */
export async function consumeRateLimitSlot(
  bucketKey: string,
  maxEvents: number,
  windowMs: number,
  config?: RateLimitRuntimeConfig,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const useRedis =
    config?.redisUrl &&
    config.nodeEnv !== "test" &&
    config.nodeEnv !== undefined;

  if (useRedis) {
    try {
      const redis = getSharedRedis(config.redisUrl as string);
      if (redis.status !== "ready") {
        await redis.connect();
      }
      return await consumeRedisSlot(redis, bucketKey, maxEvents, windowMs);
    } catch {
      // Redis unavailable. Strict auth buckets fail closed (deny) rather than
      // weakening to per-process in-memory limits; others fall back below.
      if (config?.failClosed) {
        const retryAfterSec = Math.max(1, Math.ceil(windowMs / 1000));
        return { ok: false, retryAfterSec };
      }
    }
  }

  return consumeMemorySlot(bucketKey, maxEvents, windowMs);
}

export function rateLimitResponse(retryAfterSec: number): NextResponse {
  const response = apiError(
    "TOO_MANY_REQUESTS",
    `Too many requests. Please try again in ${retryAfterSec} seconds.`,
  );
  response.headers.set("Retry-After", String(retryAfterSec));
  return response;
}

/** Returns a 429 NextResponse when limited, otherwise null. */
export async function enforceRateLimit(
  bucketKey: string,
  maxEvents: number,
  windowMs: number,
  config?: RateLimitRuntimeConfig,
): Promise<NextResponse | null> {
  const result = await consumeRateLimitSlot(
    bucketKey,
    maxEvents,
    windowMs,
    config,
  );
  if (!result.ok) {
    return rateLimitResponse(result.retryAfterSec);
  }
  return null;
}
