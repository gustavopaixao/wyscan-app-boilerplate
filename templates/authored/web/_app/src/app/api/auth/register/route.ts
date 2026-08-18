import { createPassthroughRoute } from "@/lib/server/auth-bff";

/** POST /api/auth/register — relays the API result; no session is created. */
export const POST = createPassthroughRoute("/api/v1/auth/register");
