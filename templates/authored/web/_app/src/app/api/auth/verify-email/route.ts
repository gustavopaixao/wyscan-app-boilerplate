import { createSessionRoute } from "@/lib/server/auth-bff";

/** POST /api/auth/verify-email — establishes the session cookies. */
export const POST = createSessionRoute("/api/v1/auth/verify-email");
