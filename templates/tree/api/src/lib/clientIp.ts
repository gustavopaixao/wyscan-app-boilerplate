/**
 * Client IP for rate limiting when the API sits behind a trusted reverse proxy.
 * When TRUST_PROXY is enabled, prefer X-Real-IP (set by nginx) over X-Forwarded-For
 * so clients cannot spoof rate-limit buckets.
 */

function trustProxyEnabled(): boolean {
  const raw = process.env.TRUST_PROXY?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getTrustedClientIp(request: Request): string {
  if (trustProxyEnabled()) {
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
  }

  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (forwarded) return forwarded;

  return "unknown";
}

export function getRateLimitClientKey(
  request: Request,
  prefix?: string,
): string {
  const ip = getTrustedClientIp(request);
  return prefix ? `${prefix}:${ip}` : ip;
}
