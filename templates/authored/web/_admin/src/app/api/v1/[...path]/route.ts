/**
 * Authenticated proxy to the API, gated on the caller being an admin.
 *
 * The admin check runs on EVERY request rather than being inferred from the
 * session cookie: a role can be revoked mid-session, and the cookie would not
 * know. This costs one upstream /me call per proxied request, which is the
 * right trade for a console whose traffic is low and whose blast radius is not.
 */
import { type NextRequest, NextResponse } from "next/server";
import { setTokenCookies } from "@/lib/server/auth-cookies";
import { csrfForbiddenResponse, isSameOriginRequest } from "@/lib/server/csrf";
import { requireAppAdminSession } from "@/lib/server/require-app-admin";
import { upstreamFetch } from "@/lib/server/upstream-api";

const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (MUTATING.has(request.method) && !isSameOriginRequest(request)) {
    return csrfForbiddenResponse();
  }

  const session = await requireAppAdminSession();
  if (session instanceof NextResponse) return session;

  const { path } = await context.params;
  if (path[0] === "auth") {
    return NextResponse.json(
      { message: "Use /api/auth/* for authentication." },
      { status: 404 },
    );
  }

  const body = MUTATING.has(request.method)
    ? await request.json().catch(() => undefined)
    : undefined;

  const result = await upstreamFetch(
    `/api/v1/${path.join("/")}${request.nextUrl.search}`,
    {
      method: request.method,
      body,
      authenticated: true,
    },
  );

  const response = NextResponse.json(result.body ?? {}, {
    status: result.status,
  });
  return result.setCookies
    ? setTokenCookies(response, result.setCookies)
    : response;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
