/**
 * Static assets served by the API (team flag PNGs, etc.).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import type { Hono } from "hono";

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const flagsDir = path.join(apiRoot, "public", "flags");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function registerStaticAssetRoutes(app: Hono): void {
  app.get("/api/v1/static/flags/:slug", async (c) => {
    const raw = c.req.param("slug")?.trim() ?? "";
    const slug = raw.replace(/\.png$/i, "");
    if (!SLUG_PATTERN.test(slug)) {
      return Errors.badRequest("Invalid flag slug");
    }
    const filePath = path.join(flagsDir, `${slug}.png`);
    if (!fs.existsSync(filePath)) {
      return Errors.notFound("Flag");
    }
    const data = fs.readFileSync(filePath);
    return c.body(data, 200, {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    });
  });
}
