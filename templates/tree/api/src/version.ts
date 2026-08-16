/**
 * API major-version seam (feature 0226).
 *
 * URI-path versioning, additive-first, with a single global major boundary.
 * Today only `v1` exists; this module is the seam a future `/api/v2` plugs into
 * without copy-pasting the route tree.
 *
 * **Mechanism-only:** no `/api/v2` routes exist yet. See `app.ts` for the
 * coexistence-mount documentation and `docs/features/0226-*` for the policy.
 *
 * Convention for a future breaking version:
 * - Bind shared middleware per version prefix (`app.use(\`${apiBase("v2")}/*\`, …)`).
 * - `api/src/v2/` holds ONLY the modules that diverge; unchanged handlers are
 *   re-exported from `v1/` and mounted at the v2 path.
 * - Version-neutral internals (routeHelpers, services, models) stay unversioned.
 */

export const SUPPORTED_API_VERSIONS = ["v1"] as const;

export type ApiVersion = (typeof SUPPORTED_API_VERSIONS)[number];

/** The current (latest) major the API serves as its default surface. */
export const CURRENT_API_VERSION: ApiVersion = "v1";

/** Build the mount base path for a major version, e.g. `apiBase("v1") === "/api/v1"`. */
export function apiBase(version: ApiVersion = CURRENT_API_VERSION): string {
  return `/api/${version}`;
}

/** The glob middleware binding for a version scope, e.g. `/api/v1/*`. */
export function apiScopeGlob(
  version: ApiVersion = CURRENT_API_VERSION,
): string {
  return `${apiBase(version)}/*`;
}

/** Type guard for an arbitrary string being a supported major. */
export function isSupportedApiVersion(value: string): value is ApiVersion {
  return (SUPPORTED_API_VERSIONS as readonly string[]).includes(value);
}
