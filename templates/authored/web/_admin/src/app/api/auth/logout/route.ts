/** POST /api/auth/logout — revokes upstream, then clears the cookies. */
import { NextResponse } from "next/server";
import { clearTokenCookies } from "@/lib/server/auth-cookies";
import { csrfForbiddenResponse, isSameOriginRequest } from "@/lib/server/csrf";
import { upstreamFetch } from "@/lib/server/upstream-api";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) return csrfForbiddenResponse();

  // Best effort: the cookies are cleared regardless, so the admin is signed out
  // locally even when the API cannot be reached.
  await upstreamFetch("/api/v1/auth/logout", {
    method: "POST",
    body: {},
    authenticated: true,
  }).catch(() => undefined);

  return clearTokenCookies(NextResponse.json({ ok: true }));
}
