/**
 * Admin system overview — `GET /api/v1/admin/settings`.
 *
 * Answers "is this deployment healthy, and what is switched on?" without
 * requiring shell access. Everything here is read-only; there is no settings
 * store in this project, and inventing one would be a product decision rather
 * than scaffolding.
 *
 * **No secret value is ever returned.** Integrations report a boolean derived
 * from whether their environment variable is set, and nothing else — a settings
 * screen is exactly the sort of place a key gets echoed by accident, and the
 * page is one screenshot away from a chat thread.
 *
 * This is the consumer `v1/shared/infraStatus.ts` was written for: its comment
 * says the vocabulary is for "health routes and admin overview DTOs once they
 * exist".
 */
import type { Hono } from "hono";
import { checkMongo, checkRedis } from "../../lib/infraHealth.js";
import { CURRENT_API_VERSION } from "../../version.js";
import { isAuthenticatedUser, requireAdminUser } from "../routeHelpers.js";
import type { InfraStatus } from "../shared/infraStatus.js";

export type InfraRow = { key: string; status: InfraStatus };
export type IntegrationRow = { key: string; configured: boolean };

/** `skipped` when the URL is unset — unconfigured is not the same as broken. */
function toStatus(configured: boolean, ok: boolean): InfraStatus {
  if (!configured) return "skipped";
  return ok ? "ok" : "down";
}

/**
 * Probe the log agent's unauthenticated `/health`.
 *
 * Separate from the log routes on purpose: the overview should say the agent is
 * down even when the log viewer itself is switched off.
 */
export async function checkLogAgent(
  env: NodeJS.ProcessEnv = process.env,
): Promise<InfraStatus> {
  if (!env.LOG_AGENT_URL) return "skipped";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetch(`${env.LOG_AGENT_URL}/health`, {
      signal: controller.signal,
    });
    return response.ok ? "ok" : "down";
  } catch {
    return "down";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Which optional integrations are wired up.
 *
 * Presence only. Whether a key is *valid* is not something to discover by
 * probing a third party every time an admin opens this page.
 */
export function integrationStatus(
  env: NodeJS.ProcessEnv = process.env,
): IntegrationRow[] {
  const set = (...keys: string[]) => keys.every((k) => Boolean(env[k]?.trim()));
  return [
    { key: "mailer", configured: set("MAILGUN_API_KEY", "MAILGUN_DOMAIN") },
    { key: "push", configured: set("FIREBASE_SERVICE_ACCOUNT_JSON") },
    { key: "googleOauth", configured: set("GOOGLE_CLIENT_ID") },
    { key: "appleOauth", configured: set("APPLE_CLIENT_ID") },
    {
      key: "facebookOauth",
      configured: set("FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"),
    },
    { key: "internalApi", configured: set("INTERNAL_API_SECRET") },
    {
      key: "logViewer",
      configured: set("LOG_VIEWER_ENABLED", "LOG_AGENT_URL"),
    },
    { key: "corsOrigin", configured: set("CORS_ORIGIN") },
  ];
}

export function registerAdminSystemRoutes(app: Hono): void {
  app.get("/api/v1/admin/settings", async (c) => {
    const admin = await requireAdminUser(c);
    if (!isAuthenticatedUser(admin)) return admin;

    const env = process.env;
    // Concurrently: each probe has its own timeout and none depends on another.
    const [mongo, redis, logAgent] = await Promise.all([
      checkMongo(env),
      checkRedis(env),
      checkLogAgent(env),
    ]);

    c.header("Cache-Control", "no-store");
    return c.json({
      api: {
        version: CURRENT_API_VERSION,
        environment: env.NODE_ENV ?? "development",
        uptimeSeconds: Math.floor(process.uptime()),
      },
      infrastructure: [
        {
          key: "mongodb",
          status: toStatus(Boolean(env.MONGODB_URL), mongo.ok),
        },
        { key: "redis", status: toStatus(Boolean(env.REDIS_URL), redis.ok) },
        { key: "logAgent", status: logAgent },
      ] satisfies InfraRow[],
      integrations: integrationStatus(env),
    });
  });
}
