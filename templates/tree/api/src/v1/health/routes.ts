/**
 * Versioned health placeholder (feature 0001). Proves the /api/v1 route tree
 * boots; real feature routes register alongside it in app.ts.
 */
import type { Hono } from "hono";

export function registerV1HealthRoutes(app: Hono): void {
  app.get("/api/v1/health", (c) => c.json({ ok: true }));
}
