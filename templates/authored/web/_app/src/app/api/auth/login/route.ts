import { createSessionRoute } from "@/lib/server/auth-bff";

/** POST /api/auth/login — establishes the session cookies. */
export const POST = createSessionRoute("/api/v1/auth/login");
