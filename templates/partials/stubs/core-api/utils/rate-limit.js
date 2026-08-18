// STUB — replace with __NPM_SCOPE__/core-api when you adopt the shared packages.
// In-memory sliding window: single-process only. The shared package is
// Redis-backed and therefore correct across replicas.

import { NextResponse } from "next/server.js";

const buckets = new Map();

/**
 * Bucket key for a request: `<prefix>:<client ip>`.
 *
 * Reads `x-forwarded-for` first, so it is only trustworthy behind a proxy that
 * overwrites (not appends) that header — the same caveat as `TRUST_PROXY` on
 * the API itself.
 */
export function getClientKey(request, prefix) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return prefix ? `${prefix}:${ip}` : ip;
}

/**
 * @returns {import("next/server.js").NextResponse | null}
 *   A 429 carrying `Retry-After` when limited, otherwise null.
 */
export function checkRateLimit(key, maxEvents, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= maxEvents) {
    buckets.set(key, hits);
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000));
    return NextResponse.json(
      { code: "TOO_MANY_REQUESTS", message: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  hits.push(now);
  buckets.set(key, hits);
  return null;
}
