/**
 * Identifies this BFF to the API.
 *
 * The API can require a shared secret on its auth endpoints so that only a
 * known first-party client may call them. Both variables are OPTIONAL: when
 * unset, no headers are sent and the API does not demand them, which is what
 * lets a freshly generated project run with no configuration.
 *
 * Set `INTERNAL_API_CLIENT_ID` and `INTERNAL_API_SECRET` in both this app and
 * the API before exposing either publicly. These are server-only — never
 * prefix them with NEXT_PUBLIC_, which would ship the secret to the browser.
 */

/**
 * Built from a short constant rather than written out inline: the slug can be
 * up to 44 characters, and a literal spelling it out twice would exceed the
 * line width for long slugs but not short ones — so no single formatting of
 * those lines is correct for every generated project.
 */
const PREFIX = "__PROJECT_SLUG__";

export const INTERNAL_CLIENT_HEADER = `x-${PREFIX}-internal-client`;
export const INTERNAL_SECRET_HEADER = `x-${PREFIX}-internal-secret`;

export function internalApiHeaders(): Record<string, string> {
  const clientId = process.env.INTERNAL_API_CLIENT_ID?.trim();
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!clientId || !secret) return {};

  return {
    [INTERNAL_CLIENT_HEADER]: clientId,
    [INTERNAL_SECRET_HEADER]: secret,
  };
}

/** Base URL of the API. Server-side only, so it need not be public. */
export function apiBaseUrl(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
