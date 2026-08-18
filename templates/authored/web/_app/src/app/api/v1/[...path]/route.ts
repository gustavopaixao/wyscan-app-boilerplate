/**
 * Authenticated proxy to the API.
 *
 * Client code calls `/api/v1/...` on this origin; this handler attaches the
 * access token from the HttpOnly cookie and forwards upstream, refreshing
 * transparently on a 401. That keeps every product fetch on the same
 * no-JWT-in-the-browser footing as the auth routes.
 *
 * The auth endpoints themselves are NOT reachable through here — they live at
 * `/api/auth/*` and must go through the BFF factories, which own the cookies.
 */
import { type NextRequest, NextResponse } from "next/server";
import { setTokenCookies } from "@/lib/server/auth-cookies";
import { csrfForbiddenResponse, isSameOriginRequest } from "@/lib/server/csrf";
import { upstreamFetch } from "@/lib/server/upstream-api";

const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (MUTATING.has(request.method) && !isSameOriginRequest(request)) {
    return csrfForbiddenResponse();
  }

  const { path } = await context.params;

  // Refuse to relay auth endpoints: doing so would hand tokens to the browser
  // and bypass the cookie layer entirely.
  if (path[0] === "auth") {
    return NextResponse.json(
      { message: "Use /api/auth/* for authentication." },
      { status: 404 },
    );
  }

  const search = request.nextUrl.search;
  const body = MUTATING.has(request.method)
    ? await request.json().catch(() => undefined)
    : undefined;

  const result = await upstreamFetch(`/api/v1/${path.join("/")}${search}`, {
    method: request.method,
    body,
    authenticated: true,
  });

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
