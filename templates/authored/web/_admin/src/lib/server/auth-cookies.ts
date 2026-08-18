/**
 * Session cookies for the admin app.
 *
 * Deliberately DIFFERENT names from the member app. The two are usually served
 * from sibling subdomains (and, in development, from different ports of
 * localhost, which share one cookie jar), so shared names would let a member
 * session be presented to the admin BFF and vice versa.
 */
import type { NextResponse } from "next/server";

const PREFIX = "__PROJECT_SLUG__";

export const ACCESS_COOKIE = `${PREFIX}_admin_access`;
export const REFRESH_COOKIE = `${PREFIX}_admin_refresh`;

const ACCESS_MAX_AGE_SECONDS = 60 * 60;
const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function baseOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
}

export type SessionTokens = {
  accessToken: string;
  refreshToken?: string;
};

export function setTokenCookies(
  response: NextResponse,
  tokens: SessionTokens,
): NextResponse {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });
  if (tokens.refreshToken) {
    response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
      ...baseOptions(),
      maxAge: REFRESH_MAX_AGE_SECONDS,
    });
  }
  return response;
}

export function clearTokenCookies(response: NextResponse): NextResponse {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    response.cookies.set(name, "", { ...baseOptions(), maxAge: 0 });
  }
  return response;
}
