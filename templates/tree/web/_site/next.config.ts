import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeaders } from "./security-headers";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  headers: securityHeaders(),
  /**
   * 0242 — allow real-device testing against `next dev` over the LAN.
   *
   * Next blocks cross-origin requests to its dev resources (notably
   * `/_next/webpack-hmr`) unless the host is listed here. When the HMR client is
   * rejected the Turbopack dev runtime never bootstraps, so the page
   * server-renders but **never hydrates** — client effects (e.g. the
   * `/download` store redirect) silently never run. Dev-only; ignored by
   * `next build` / `next start`.
   */
  allowedDevOrigins: ["__DEV_HOST__", "__DEV_HOST__.local", "192.168.1.60"],
};

export default withNextIntl(nextConfig);
