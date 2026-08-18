/**
 * Same-origin check for the BFF's mutating routes.
 *
 * `SameSite=strict` session cookies already mean a cross-site request arrives
 * with no session at all. This is defence in depth for the cases SameSite does
 * not cover — notably a same-site-but-different-subdomain attacker.
 */
import { NextResponse } from "next/server";

export function isSameOriginRequest(request: Request): boolean {
  // Sec-Fetch-Site is the most direct signal where the browser sends it.
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";

  // Fall back to comparing Origin against the Host we were reached on.
  const origin = request.headers.get("origin");
  if (!origin) {
    // No Origin and no Sec-Fetch-Site: not a browser form/fetch post. Server-side
    // callers and same-origin GETs land here.
    return true;
  }

  const host = request.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function csrfForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { message: "Cross-origin request rejected." },
    { status: 403 },
  );
}
