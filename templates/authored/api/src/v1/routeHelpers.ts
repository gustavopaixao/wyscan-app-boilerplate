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
// The type is imported in the same statement as the values on purpose: split
// across two lines, the value import is 75-81 characters depending on how long
// the npm scope is, so the formatter wraps it for some projects and not others
// and `biome check` fails on whichever it was not formatted for. Merged, the
// statement is too long to inline at any scope width, so the wrapping is
// stable. Same reasoning as the suppressions in src/tokens/patches.mjs.
import {
  type AuthenticatedUser,
  getOptionalUser,
  requireAuth,
} from "__NPM_SCOPE__/auth-api/utils/auth";
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
 * Did the guard return the user, or its refusal?
 *
 * Ask THIS, never `value instanceof Response`. The package refuses with a
 * `NextResponse`, which extends the `Response` that `next/server` was loaded
 * with — and `@hono/node-server` installs its own `Response` global over that
 * one. So in the running API the refusal is not an instance of the ambient
 * `Response`, `instanceof` returns false, and a route guarded that way carries
 * on as though the caller were authorised. That is an auth bypass, and it is
 * invisible in unit tests: under Vitest the two classes are the same object and
 * the check passes.
 *
 * Identifying SUCCESS positively fails closed instead — anything not
 * recognisable as a user is treated as a refusal.
 */
export function isAuthenticatedUser(
  value: AuthenticatedUser | Response,
): value is AuthenticatedUser {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AuthenticatedUser>;
  // A refusal carries neither field. `userId` is an ObjectId in the shared
  // package and a string in the stub, so only its presence is checked.
  return candidate.userId !== undefined && typeof candidate.role === "string";
}

/**
 * Re-issue a refusal as a `Response` built from the ambient global, so Hono
 * gets an object its own runtime recognises rather than one from whichever
 * realm `next/server` happened to load.
 */
async function asAmbientResponse(refusal: unknown): Promise<Response> {
  const status =
    typeof (refusal as { status?: unknown })?.status === "number"
      ? (refusal as { status: number }).status
      : 401;

  let body = "";
  try {
    body = await (refusal as Response).text();
  } catch {
    // A refusal we cannot read still has to be returned, just without its body.
  }

  return new Response(
    body ||
      JSON.stringify({
        code: status === 403 ? "FORBIDDEN" : "UNAUTHORIZED",
        message:
          status === 403 ? "Admin access required" : "Authentication required",
      }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

async function guard(
  result: AuthenticatedUser | Response,
): Promise<AuthenticatedUser | Response> {
  return isAuthenticatedUser(result) ? result : await asAmbientResponse(result);
}

/**
 * These RETURN the error response instead of throwing, so a route reads:
 *
 * ```ts
 * const result = await requireAdminUser(c);
 * if (!isAuthenticatedUser(result)) return result;
 * ```
 *
 * Use `isAuthenticatedUser`, not `instanceof Response` — see the note on that
 * function for what goes wrong otherwise.
 */
export async function requireAdminUser(
  c: Context,
): Promise<AuthenticatedUser | Response> {
  return guard(await requireAdmin(asNextRequest(c.req.raw)));
}

export async function requireModeratorUser(
  c: Context,
): Promise<AuthenticatedUser | Response> {
  return guard(await requireModerator(asNextRequest(c.req.raw)));
}
