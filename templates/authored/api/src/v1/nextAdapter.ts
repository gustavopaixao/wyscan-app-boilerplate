/**
 * Bridge between Hono and the shared auth package.
 *
 * `__NPM_SCOPE__/auth-api` ships its handlers as Next.js App Router routes —
 * `POST(request: NextRequest)`. `NextRequest` is a subclass of the standard
 * `Request` that only adds Next-specific conveniences (`nextUrl`, `cookies`,
 * `geo`), none of which the auth handlers touch. So Hono's `c.req.raw` is
 * structurally sufficient and this is a type assertion with no runtime cost —
 * deliberately not a wrapper, because constructing a real NextRequest would
 * pull the Next runtime into a Hono process.
 *
 * The `NextRequest` type is derived from a handler's own parameter rather than
 * imported from `next/server`, so this file does not depend on Next's type
 * layout staying put.
 */
import type { POST as loginPOST } from "__NPM_SCOPE__/auth-api/routes/auth/login";

type NextRequestLike = Parameters<typeof loginPOST>[0];

export function asNextRequest(request: Request): NextRequestLike {
  return request as NextRequestLike;
}
