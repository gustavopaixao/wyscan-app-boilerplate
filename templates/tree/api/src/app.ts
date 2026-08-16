/**
 * Hono app (exported for tests).
 *
 * Boilerplate (feature 0001): only the core surface exists — root, infra
 * health, and the placeholder /api/v1 routes. Product middleware (client gate,
 * rate limits, deprecation, platform capture) plugs into `createApp` exactly
 * like the reference implementation as features land.
 */
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import { checkMongo, checkRedis } from "./lib/infraHealth.js";

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().default(3000),
  MONGODB_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  /**
   * HTTP access line logging. "1" / "true" = always on; "0" / "false" = off.
   * When unset: on for non-production and non-test, off for production and test.
   */
  HTTP_ACCESS_LOG: z.string().optional(),
  /**
   * Fail-closed rate limiting for strict auth buckets (login/register/forgot)
   * when Redis is unavailable. "1" / "true" = on; "0" / "false" = off.
   * When unset: on for production, off otherwise (single-replica dev keeps the
   * in-memory fallback).
   */
  RATE_LIMIT_FAIL_CLOSED: z.string().optional(),
  /** Firebase service account JSON for FCM push — optional in dev. */
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
});

export type ApiEnv = z.infer<typeof envSchema>;

function httpAccessLoggingEnabled(env: ApiEnv): boolean {
  const raw = env.HTTP_ACCESS_LOG?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  const node = env.NODE_ENV ?? "development";
  return node !== "production" && node !== "test";
}

/**
 * Resolve the CORS allowlist. Only serve a credentialed wildcard for explicit
 * local dev — never when `CORS_ORIGIN` is configured or when `NODE_ENV` is
 * unset/unknown (a non-prod env could be network-reachable).
 * - `CORS_ORIGIN` set (any environment) → use the parsed allowlist.
 * - Explicit `development` / `test` with no `CORS_ORIGIN` → `"*"` for convenience.
 * - Otherwise (production, or `NODE_ENV` unset/unknown) → `""` (deny).
 */
function resolveCorsOrigin(env: ApiEnv): string | string[] {
  const origins = env.CORS_ORIGIN?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (origins && origins.length > 0) return origins;
  const node = env.NODE_ENV;
  if (node === "development" || node === "test") return "*";
  return "";
}

/** Core routes only (health, root). Use in tests to avoid loading wyscan-auth from `../__ECOSYSTEM_DIR__/Packages/`. */
export function createCoreApp(env: ApiEnv) {
  const app = new Hono();
  const isProduction = env.NODE_ENV === "production";

  app.use(
    "*",
    secureHeaders({
      // Explicit, strong HSTS in production only (avoid pinning on plain-HTTP
      // local dev). HSTS is also expected at the Nginx edge — this is
      // defense-in-depth if TLS-termination drifts.
      strictTransportSecurity: isProduction
        ? "max-age=63072000; includeSubDomains; preload"
        : false,
    }),
  );

  app.use(
    "*",
    cors({
      origin: resolveCorsOrigin(env),
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );

  if (httpAccessLoggingEnabled(env)) {
    app.use("*", async (c, next) => {
      const started = Date.now();
      await next();
      if (c.req.method === "OPTIONS") return;
      const ms = Date.now() - started;
      const path = c.req.path !== "" ? c.req.path : new URL(c.req.url).pathname;
      logger.info("http_request", {
        method: c.req.method,
        path,
        status: c.res.status,
        ms,
      });
    });
  }

  app.get("/api/health", async (c) => {
    const [mongo, redis_] = await Promise.all([
      checkMongo(env),
      checkRedis(env),
    ]);
    const ok = mongo.ok && redis_.ok;
    const sanitizeInfra = (result: { ok: boolean; error?: string }) =>
      isProduction ? { ok: result.ok } : result;
    return c.json(
      {
        ok,
        service: "__PROJECT_SLUG__-api",
        mongo: env.MONGODB_URL
          ? sanitizeInfra(mongo)
          : { ok: true, skipped: true },
        redis: env.REDIS_URL
          ? sanitizeInfra(redis_)
          : { ok: true, skipped: true },
      },
      ok ? 200 : 503,
    );
  });

  app.get("/", (c) =>
    c.json({
      name: "__PROJECT_SLUG__-api",
      health: "/api/health",
      apiV1: "/api/v1",
    }),
  );

  return app;
}

export async function createApp(env: ApiEnv) {
  const app = createCoreApp(env);
  // Version coexistence seam: bind shared middleware per version prefix here as
  // features land (see version.ts). Today only the placeholder v1 routes exist.
  const { registerV1HealthRoutes } = await import("./v1/health/routes.js");
  registerV1HealthRoutes(app);
  const { registerV1ConfigRoutes } = await import("./v1/config/routes.js");
  registerV1ConfigRoutes(app);
  const { registerStaticAssetRoutes } = await import("./staticRoutes.js");
  registerStaticAssetRoutes(app);
  return app;
}

export { envSchema };
