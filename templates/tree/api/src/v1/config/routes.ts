/**
 * Client-facing platform config — placeholder (feature 0001).
 *
 * Real platform settings (feature flags, about links, update gate, …) arrive
 * with their features; this proves the versioned config surface exists.
 */
import type { Hono } from "hono";
import { CURRENT_API_VERSION } from "../../version.js";

export function registerV1ConfigRoutes(app: Hono): void {
  app.get("/api/v1/config", (c) => {
    c.header("Cache-Control", "no-store");
    return c.json({
      api_version: CURRENT_API_VERSION,
    });
  });
}
