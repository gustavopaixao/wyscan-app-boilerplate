import type { ApiEnv } from "../app.js";

/**
 * Clearly-labeled, obviously-insecure JWT secret used only to let a local dev
 * boot succeed when the developer has not generated a real one. Production
 * hard-fails if `JWT_SECRET` is unset OR equals this value (see below), so this
 * can never sign tokens in a real deployment. Keep this string in sync with the
 * `JWT_SECRET` fallback in `docker/docker-compose.yml`. Origin: bugfix 0001.
 */
export const DEV_INSECURE_JWT_SECRET =
  "dev-insecure-jwt-secret-do-not-use-in-production-change-me-please";

/**
 * Fail fast when the runtime is misconfigured (P0 security checklist).
 */
export function validateProductionEnv(env: ApiEnv): void {
  const nodeEnv = env.NODE_ENV ?? "development";

  // JWT_SECRET handling (bugfix 0001, refines security audit 2026-06-21 H1):
  //   - test: no-op — the auth package falls back to a fixed test secret.
  //   - production: HARD-FAIL if unset or equal to the insecure dev default, so
  //     a real deployment never signs tokens with a weak/known secret.
  //   - dev/other: never block a local boot on a missing secret. Warn loudly
  //     and fall back to the labeled insecure default so tokens stay signable.
  if (nodeEnv === "production") {
    const jwtSecret = process.env.JWT_SECRET?.trim();
    if (!jwtSecret || jwtSecret === DEV_INSECURE_JWT_SECRET) {
      console.error(
        "[__PROJECT_SLUG__-api] JWT_SECRET is required in production and must not be the insecure dev default (generate one with: openssl rand -base64 48)",
      );
      process.exit(1);
    }
  } else if (nodeEnv !== "test" && !process.env.JWT_SECRET?.trim()) {
    console.warn(
      "[__PROJECT_SLUG__-api] JWT_SECRET is not set — using an insecure development default so the server can boot. Run `make jwt-secret` to generate a real one (openssl rand -base64 48).",
    );
    process.env.JWT_SECRET = DEV_INSECURE_JWT_SECRET;
  }

  if (nodeEnv !== "production") {
    return;
  }

  const missing: string[] = [];
  if (!env.CORS_ORIGIN?.trim()) {
    missing.push("CORS_ORIGIN");
  }
  if (!process.env.INTERNAL_API_SECRET?.trim()) {
    missing.push("INTERNAL_API_SECRET");
  }

  if (missing.length > 0) {
    console.error(
      `[__PROJECT_SLUG__-api] Missing required production environment: ${missing.join(", ")}`,
    );
    process.exit(1);
  }

  warnPublicInviteBaseUrlMisconfiguration();
}

function warnPublicInviteBaseUrlMisconfiguration(): void {
  const base = process.env.PUBLIC_INVITE_BASE_URL?.trim();
  if (!base) {
    console.warn(
      "[__PROJECT_SLUG__-api] PUBLIC_INVITE_BASE_URL is not set; HTTPS invite links and invite emails will not include a web URL.",
    );
    return;
  }

  try {
    const parsed = new URL(base);
    if (parsed.pathname !== "/" && parsed.pathname !== "") {
      console.warn(
        `[__PROJECT_SLUG__-api] PUBLIC_INVITE_BASE_URL should be the site origin only (no path). Got pathname "${parsed.pathname}".`,
      );
    }
  } catch {
    console.warn(
      `[__PROJECT_SLUG__-api] PUBLIC_INVITE_BASE_URL is not a valid URL: "${base}".`,
    );
  }
}
