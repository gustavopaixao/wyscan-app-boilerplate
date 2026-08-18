/**
 * Route gating for the admin console.
 *
 * The admin app has no locale routing, so unlike the member app (which uses
 * `src/proxy.ts` to compose with next-intl) this is a plain middleware.
 */
import type { NextRequest } from "next/server";
import { applySessionGate } from "@/lib/server/session-gate";

export default function middleware(request: NextRequest) {
  return applySessionGate(request) ?? undefined;
}

export const config = {
  // Skip the BFF itself — those routes do their own auth and would otherwise be
  // redirected to an HTML page, which no fetch() caller can use.
  matcher: ["/((?!api|_next|images|favicon.ico).*)"],
};
