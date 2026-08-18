import { createPassthroughRoute } from "@/lib/server/auth-bff";

/** POST /api/auth/resend-code — relays the API result; no session is created. */
export const POST = createPassthroughRoute("/api/v1/auth/resend-code");
