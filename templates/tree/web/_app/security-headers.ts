import type { NextConfig } from "next";

/**
 * Security headers for __PROJECT_SLUG__-app (authenticated member web client).
 */
export function securityHeaders(): NonNullable<NextConfig["headers"]> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8080";
  let connectSrc = `'self' ${apiUrl}`;
  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol === "http:") {
      // Local/dev over http: also allow the https + ws upgrades of the same host.
      // WebSocket (socket.io) opens ws://; CSP matches connect-src by scheme.
      connectSrc += ` https://${parsed.host} ws://${parsed.host} wss://${parsed.host}`;
    } else {
      // Production over https: socket.io upgrades to wss://; add it explicitly
      // since an https:// source expression does not cover the ws/wss scheme.
      connectSrc += ` wss://${parsed.host}`;
    }
  } catch {
    /* keep default connect-src */
  }

  const isProd = process.env.NODE_ENV === "production";

  const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline' https://accounts.google.com https://appleid.cdn-apple.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://appleid.cdn-apple.com";

  const headers: { key: string; value: string }[] = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), identity-credentials-get=(self)",
    },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        scriptSrc,
        "style-src 'self' 'unsafe-inline' https://accounts.google.com",
        "img-src 'self' data: https: blob: https://res.cloudinary.com",
        `connect-src ${connectSrc} https://res.cloudinary.com https://accounts.google.com https://appleid.apple.com`,
        "font-src 'self' data:",
        "frame-src https://accounts.google.com https://appleid.apple.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    },
  ];

  if (isProd) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return async () => [
    {
      source: "/(.*)",
      headers,
    },
  ];
}
