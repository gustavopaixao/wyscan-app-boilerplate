/**
 * GET /api/auth/session — is the caller still a signed-in admin?
 *
 * Returns 403 rather than 401 when a valid session belongs to a non-admin, so
 * the client can tell "sign in again" apart from "this account may not be here".
 */
import { NextResponse } from "next/server";
import { ADMIN_ACCESS_REQUIRED, isAppAdminRole } from "@/lib/admin-access";
import { clearTokenCookies, setTokenCookies } from "@/lib/server/auth-cookies";
import { upstreamFetch } from "@/lib/server/upstream-api";

export async function GET(): Promise<NextResponse> {
  const result = await upstreamFetch("/api/v1/me", { authenticated: true });

  if (result.status === 401) {
    return clearTokenCookies(
      NextResponse.json({ authenticated: false, user: null }, { status: 401 }),
    );
  }
  if (result.status >= 400) {
    // Upstream trouble is not proof the session is bad — leave the cookies be.
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: result.status },
    );
  }

  const user = (result.body as { user?: { role?: unknown } })?.user;

  if (!isAppAdminRole(user?.role)) {
    return clearTokenCookies(
      NextResponse.json(
        { authenticated: false, user: null, message: ADMIN_ACCESS_REQUIRED },
        { status: 403 },
      ),
    );
  }

  const response = NextResponse.json({ authenticated: true, user });
  return result.setCookies
    ? setTokenCookies(response, result.setCookies)
    : response;
}
