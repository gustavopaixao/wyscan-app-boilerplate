/**
 * Edge route gating, called from `src/proxy.ts` before locale routing.
 *
 * This is a COARSE gate: it only checks whether a session cookie is present,
 * because middleware cannot verify a signature without the JWT secret and must
 * stay fast. Anything that actually matters is enforced by the API on every
 * request; this exists so a signed-out visitor lands on sign-in instead of
 * flashing an empty app shell.
 */
import { type NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "@/i18n/config";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./auth-cookies";

/** Reachable while signed out. Compared AFTER the locale prefix is stripped. */
export const PUBLIC_APP_PATHS = [
  "/sign-in",
  "/register",
  "/verify",
  "/forgot-password",
  "/reset-password",
  "/oauthredirect",
];

/** Where a signed-in user goes when they hit an auth page. */
const SIGNED_IN_HOME = "/";

/** `/pt-BR/sign-in` -> `{ locale: "pt-BR", path: "/sign-in" }` */
export function splitLocale(pathname: string): {
  locale: string;
  path: string;
} {
  const [, maybeLocale, ...rest] = pathname.split("/");
  if (locales.includes(maybeLocale as (typeof locales)[number])) {
    return { locale: maybeLocale, path: `/${rest.join("/")}` };
  }
  return { locale: defaultLocale, path: pathname };
}

export function isPublicPath(path: string): boolean {
  return PUBLIC_APP_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * @returns a redirect to issue, or null to let the request continue.
 */
export function applySessionGate(request: NextRequest): NextResponse | null {
  const { locale, path } = splitLocale(request.nextUrl.pathname);

  // The refresh cookie outlives the access cookie, so "has a session" means
  // either is present — otherwise a user with a merely stale access token
  // would be bounced to sign-in instead of being refreshed transparently.
  const hasSession =
    Boolean(request.cookies.get(ACCESS_COOKIE)) ||
    Boolean(request.cookies.get(REFRESH_COOKIE));
  const publicPath = isPublicPath(path);

  if (!hasSession && !publicPath) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    // Preserve where they were headed so sign-in can send them back.
    if (path !== "/") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (hasSession && publicPath) {
    const url = request.nextUrl.clone();
    url.pathname =
      `/${locale}${SIGNED_IN_HOME}`.replace(/\/$/, "") || `/${locale}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return null;
}
