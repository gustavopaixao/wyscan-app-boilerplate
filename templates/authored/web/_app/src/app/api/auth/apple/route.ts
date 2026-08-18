import { createSessionRoute } from "@/lib/server/auth-bff";

/** POST /api/auth/apple — establishes the session cookies. */
export const POST = createSessionRoute("/api/v1/auth/apple");
