import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Locale-routing proxy (feature 0001). Session gating plugs in here once auth
 * lands (see reference implementation `applySessionGate`).
 */
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
