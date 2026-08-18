/**
 * POST /api/auth/login — admin sign-in.
 *
 * Unlike the member app's, this route refuses a valid non-admin session: the
 * upstream call succeeds, and we discard the tokens rather than setting cookies.
 * That is what keeps a member account from obtaining an admin console session
 * even though the credentials themselves are perfectly good.
 */
import { NextResponse } from "next/server";
import { ADMIN_ACCESS_REQUIRED, isAppAdminRole } from "@/lib/admin-access";
import { setTokenCookies } from "@/lib/server/auth-cookies";
import { csrfForbiddenResponse, isSameOriginRequest } from "@/lib/server/csrf";
import { upstreamFetch } from "@/lib/server/upstream-api";

type LoginBody = {
  accessToken?: string;
  refreshToken?: string;
  user?: { role?: unknown };
  requiresVerification?: boolean;
  message?: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) return csrfForbiddenResponse();

  const body = await request.json().catch(() => ({}));
  const result = await upstreamFetch("/api/v1/auth/login", {
    method: "POST",
    body,
  });
  const data = (result.body ?? {}) as LoginBody;

  if (result.status >= 400) {
    return NextResponse.json(
      { message: data.message ?? "Sign in failed." },
      {
        status: result.status,
      },
    );
  }

  // Admins are provisioned, not self-registered. An unverified admin account is
  // a misconfiguration, and this console offers no way to resolve it.
  if (data.requiresVerification) {
    return NextResponse.json(
      { message: ADMIN_ACCESS_REQUIRED },
      { status: 403 },
    );
  }

  if (!isAppAdminRole(data.user?.role)) {
    return NextResponse.json(
      { message: ADMIN_ACCESS_REQUIRED },
      { status: 403 },
    );
  }

  if (!data.accessToken) {
    return NextResponse.json(
      { message: "The server did not return a session." },
      { status: 502 },
    );
  }

  const response = NextResponse.json({ user: data.user });
  return setTokenCookies(response, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
}
