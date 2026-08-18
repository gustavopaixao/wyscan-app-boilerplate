/**
 * Session cookies for the member app.
 *
 * The browser never sees a JWT. Tokens live in HttpOnly cookies that only the
 * server-side BFF (`src/app/api/**`) can read, so an XSS bug cannot exfiltrate
 * a session — which is the whole reason for the BFF layer.
 *
 * Names are project-scoped so two generated apps on the same host (or on
 * different ports of localhost, which share a cookie jar) do not overwrite each
 * other's sessions.
 */
import type { NextResponse } from "next/server";

const PREFIX = "__PROJECT_SLUG__";

export const ACCESS_COOKIE = `${PREFIX}_app_access`;
export const REFRESH_COOKIE = `${PREFIX}_app_refresh`;

/** Matches the access-token lifetime in the API. */
const ACCESS_MAX_AGE_SECONDS = 60 * 60;
/** Matches the refresh-token lifetime in the API. */
const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function baseOptions() {
  return {
    httpOnly: true,
    // Plain HTTP on localhost would drop a `secure` cookie entirely.
    secure: process.env.NODE_ENV === "production",
    // `strict` is safe here because sign-in happens on this origin. It also
    // means a cross-site request carries no session at all, which is the
    // primary CSRF defence; `csrf.ts` is the backstop.
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

/**
 * Expire both cookies. `maxAge: 0` with the SAME options they were set with —
 * a mismatched path or sameSite writes a second cookie instead of clearing
 * the first, leaving the user in a half-signed-in state.
 */
export function clearTokenCookies(response: NextResponse): NextResponse {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    response.cookies.set(name, "", { ...baseOptions(), maxAge: 0 });
  }
  return response;
}
