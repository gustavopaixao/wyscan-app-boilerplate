// STUB — replace with __NPM_SCOPE__/core-api when you adopt the shared packages.
// In-memory sliding window: single-process only. The shared package is
// Redis-backed and safe across replicas.

const buckets = new Map();

/** @returns {boolean} true when the caller is rate limited. */
export function checkRateLimit(key, maxEvents, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= maxEvents) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  return false;
}
