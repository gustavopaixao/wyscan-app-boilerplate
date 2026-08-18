import { createPassthroughRoute } from "@/lib/server/auth-bff";

/** POST /api/auth/reset-password — relays the API result; no session is created. */
export const POST = createPassthroughRoute("/api/v1/auth/reset-password");
