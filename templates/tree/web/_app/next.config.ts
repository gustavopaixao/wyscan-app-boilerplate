import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeaders } from "./security-headers";
import { assertProductionInternalApiSecret } from "./src/lib/server/validateProductionEnv";

assertProductionInternalApiSecret();

const withNextIntl = createNextIntlPlugin();

function apiImagePatterns(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  const raw =
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8080";
  try {
    const parsed = new URL(raw);
    const pathname = "/api/v1/static/**";
    const httpProto = parsed.protocol === "https:" ? "https" : "http";
    const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
      {
        protocol: httpProto,
        hostname: parsed.hostname,
        ...(parsed.port ? { port: parsed.port } : {}),
        pathname,
      },
    ];
    if (httpProto === "http") {
      patterns.push({
        protocol: "https",
        hostname: parsed.hostname,
        ...(parsed.port ? { port: parsed.port } : {}),
        pathname,
      });
    }
    return patterns;
  } catch {
    return [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/api/v1/static/**",
      },
    ];
  }
}

const nextConfig: NextConfig = {
  headers: securityHeaders(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      ...(apiImagePatterns() ?? []),
    ],
  },
};

export default withNextIntl(nextConfig);
