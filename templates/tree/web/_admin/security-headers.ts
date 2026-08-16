import type { NextConfig } from "next";

/**
 * Security headers for __PROJECT_SLUG__-admin.
 */
export function securityHeaders(): NonNullable<NextConfig["headers"]> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8080";
  let connectSrc = `'self' ${apiUrl}`;
  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol === "http:") {
      connectSrc += ` https://${parsed.host}`;
    }
  } catch {
    /* keep default connect-src */
  }

  const isProd = process.env.NODE_ENV === "production";

  const headers: { key: string; value: string }[] = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://upload-widget.cloudinary.com",
        "style-src 'self' 'unsafe-inline' https://upload-widget.cloudinary.com",
        "img-src 'self' data: https: blob: https://res.cloudinary.com",
        `connect-src ${connectSrc} https://res.cloudinary.com https://api.cloudinary.com`,
        "font-src 'self' data:",
        "frame-src https://widget.cloudinary.com https://upload-widget.cloudinary.com",
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
