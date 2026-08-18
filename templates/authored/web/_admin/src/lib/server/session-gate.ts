/**
 * Edge route gating for the admin console.
 *
 * Stricter than the member app's: as well as checking that a cookie exists, it
 * decodes the JWT `exp` claim. It does NOT verify the signature — middleware
 * has no access to the signing secret, and a forged token buys nothing because
 * the API verifies every request properly. The point is to notice a session
 * that is definitely dead and clear it, instead of admitting the user to a
 * console where every call will 401.
 */
import { type NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  clearTokenCookies,
  REFRESH_COOKIE,
} from "./auth-cookies";

export const PUBLIC_PATHS = ["/sign-in"];

/**
 * Read `exp` (seconds since epoch) from a JWT payload without verifying it.
 * Returns null for anything unparseable, which callers treat as "unusable".
 */
export function decodeJwtExp(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    // base64url -> base64. `atob` is what the edge runtime provides; Buffer is not.
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(
      atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")),
    );
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

function isLive(token: string | undefined): boolean {
  const exp = decodeJwtExp(token);
  return exp !== null && exp * 1000 > Date.now();
}

/**
 * A session is usable while EITHER token is live: an expired access token is
 * routine and the BFF will spend the refresh token on the next call.
 */
export function isSessionUsable(
  access: string | undefined,
  refresh: string | undefined,
): boolean {
  return isLive(access) || isLive(refresh);
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function applySessionGate(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  const hasCookies = Boolean(access || refresh);
  const usable = isSessionUsable(access, refresh);

  if (isPublicPath(pathname)) {
    if (usable) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // Cookies present but both expired: clear them so the next load is not
    // gated on a session that can never be revived.
    return hasCookies ? clearTokenCookies(NextResponse.next()) : null;
  }

  if (!usable) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    const response = NextResponse.redirect(url);
    return hasCookies ? clearTokenCookies(response) : response;
  }

  return null;
}
