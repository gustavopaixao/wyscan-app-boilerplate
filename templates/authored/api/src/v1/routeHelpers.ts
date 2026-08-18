/**
 * Auth helpers for product routes.
 *
 * Import these rather than reaching into `__NPM_SCOPE__/auth-api` directly, so
 * the Hono->Next adaptation stays in one place.
 *
 * ```ts
 * app.get("/api/v1/widgets", async (c) => {
 *   const user = await getAuthedUser(c);   // throws 401 when absent
 *   return c.json(await listWidgets(user.userId));
 * });
 * ```
 */
import type { AuthenticatedUser } from "__NPM_SCOPE__/auth-api/utils/auth";
import { getOptionalUser, requireAuth } from "__NPM_SCOPE__/auth-api/utils/auth";
import {
  requireAdmin,
  requireModerator,
} from "__NPM_SCOPE__/auth-api/utils/authorization";
import type { Context } from "hono";
import { asNextRequest } from "./nextAdapter.js";

export type { AuthenticatedUser };

/** Throws `UnauthorizedError` when the caller has no valid access token. */
export function getAuthedUser(c: Context): Promise<AuthenticatedUser> {
  return requireAuth(asNextRequest(c.req.raw));
}

/** Null for anonymous callers — for endpoints that serve both. */
export function getOptionalAuthedUser(
  c: Context,
): Promise<AuthenticatedUser | null> {
  return getOptionalUser(asNextRequest(c.req.raw));
}

/**
 * These RETURN the error response instead of throwing, so a route reads:
 *
 * ```ts
 * const result = await requireAdminUser(c);
 * if (result instanceof Response) return result;
 * ```
 */
export function requireAdminUser(
  c: Context,
): Promise<AuthenticatedUser | Response> {
  return requireAdmin(asNextRequest(c.req.raw));
}

export function requireModeratorUser(
  c: Context,
): Promise<AuthenticatedUser | Response> {
  return requireModerator(asNextRequest(c.req.raw));
}
