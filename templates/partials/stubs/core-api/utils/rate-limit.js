// STUB — replace with __NPM_SCOPE__/core-api when you adopt the shared packages.
// In-memory sliding window: single-process only. The shared package is
// Redis-backed and therefore correct across replicas.

import { NextResponse } from "next/server.js";

const buckets = new Map();

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
