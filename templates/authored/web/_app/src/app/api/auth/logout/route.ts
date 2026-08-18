import { createLogoutRoute } from "@/lib/server/auth-bff";

/** POST /api/auth/logout — revokes upstream, then clears the cookies. */
export const POST = createLogoutRoute();
