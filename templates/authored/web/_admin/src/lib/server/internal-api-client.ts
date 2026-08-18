/**
 * Identifies the admin BFF to the API. Same contract as the member app's, with
 * its own client id so API logs can tell the two apart.
 *
 * Both variables are optional; when unset no headers are sent and the API does
 * not demand them, so a freshly generated project runs unconfigured.
 */

/** Short constant so the header lines stay a fixed length for any slug. */
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

export function apiBaseUrl(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
