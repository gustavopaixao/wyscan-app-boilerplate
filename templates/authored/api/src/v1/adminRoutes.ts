/**
 * Admin user directory for /api/v1.
 *
 * Unlike `authRoutes.ts`, this handler is implemented HERE rather than
 * re-exported from `__NPM_SCOPE__/auth-api`. The shared package has no
 * user-listing route — its `exports` map stops at `routes/auth/*` and
 * `routes/me/*` — so an import would resolve only in `standalone`, where the
 * stub is ours to author, and break the build in `local` and `registry`. And
 * the mode that breaks is never the one the author is working in.
 *
 * What the package and the stub DO agree on is the raw material: `requireAdmin`
 * (via `requireAdminUser` in `./routeHelpers.js`) and the `User` model with its
 * `toPublicJSON()`. Built on those, this file is byte-identical in all three
 * modes.
 */
// biome-ignore format: width depends on the npm scope, so the wrapping is not stable across projects
import { User, UserRole, UserStatus } from "__NPM_SCOPE__/auth-api/models";
import type { Hono } from "hono";
import { isAuthenticatedUser, requireAdminUser } from "./routeHelpers.js";

/** Page size when the caller does not ask, and the ceiling when it asks for too much. */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * The document shape this route depends on — deliberately minimal.
 *
 * The package types `User` as `Model<any>` and the stub as `Model<IUser>`. A
 * structural type with an `unknown` return is assignable from both, so the
 * route type-checks in every mode without a cast.
 */
type PublicUserDocument = { toPublicJSON(): unknown };

export type UserListQuery = {
  page: number;
  limit: number;
  /** Already escaped — safe to hand to `$regex`. Empty string means "no search". */
  search: string;
  role: string | null;
  status: string | null;
};

/**
 * Treat anything outside the enum as absent rather than as a 400.
 *
 * A stale bookmark or a hand-edited URL should show the unfiltered list, not an
 * error page.
 */
function pickEnum(
  raw: string | null,
  allowed: Record<string, string>,
): string | null {
  if (!raw) return null;
  const values = Object.values(allowed) as string[];
  return values.includes(raw) ? raw : null;
}

/** Clamp to an integer in `[min, max]`, falling back for junk input. */
function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Neutralise regex metacharacters before the term reaches Mongo.
 *
 * Without this a search for `.*` scans every user, and a search for `(` throws
 * a driver error — the query is user input reaching a regex engine.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pure, so the whole parsing surface is testable without a database. */
export function parseUserListQuery(params: URLSearchParams): UserListQuery {
  return {
    page: clampInt(params.get("page"), 1, 1, Number.MAX_SAFE_INTEGER),
    limit: clampInt(params.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT),
    search: escapeRegex((params.get("search") ?? "").trim()),
    role: pickEnum(params.get("role"), UserRole),
    status: pickEnum(params.get("status"), UserStatus),
  };
}

/**
 * Mongo filter for a parsed query.
 *
 * Soft-deleted users are NOT hidden by default: an admin looking at the
 * directory should be able to see that an account existed. Narrow with
 * `?status=` instead.
 */
export function buildUserFilter(query: UserListQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.search) {
    // Unindexed scan. Fine for a directory of this size; the first thing to
    // revisit if a generated project grows into hundreds of thousands of users.
    filter.$or = [
      { email: { $regex: query.search, $options: "i" } },
      { displayName: { $regex: query.search, $options: "i" } },
    ];
  }
  return filter;
}

export function registerV1AdminRoutes(app: Hono): void {
  app.get("/api/v1/admin/users", async (c) => {
    const admin = await requireAdminUser(c);
    // 401 for no session, 403 for a non-admin one, returned verbatim.
    // `isAuthenticatedUser` rather than `instanceof Response`: the refusal
    // comes from a different `Response` class than the server's global, so
    // `instanceof` is false at runtime and would wave every caller through.
    if (!isAuthenticatedUser(admin)) return admin;

    const query = parseUserListQuery(new URL(c.req.url).searchParams);
    const filter = buildUserFilter(query);

    const [docs, total] = await Promise.all([
      // Never `.lean()`: it strips `toPublicJSON()`, and that method is the only
      // thing keeping `passwordHash` and the OAuth ids out of the response.
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit) as unknown as Promise<PublicUserDocument[]>,
      User.countDocuments(filter),
    ]);

    // This list is per-request and privileged; never let a proxy hold onto it.
    c.header("Cache-Control", "no-store");
    return c.json({
      users: docs.map((doc) => doc.toPublicJSON()),
      page: query.page,
      limit: query.limit,
      total,
      // At least 1, so an empty directory reads as "page 1 of 1" rather than
      // "page 1 of 0".
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    });
  });
}
