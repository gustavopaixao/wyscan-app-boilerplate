import { createSessionProbeRoute } from "@/lib/server/auth-bff";

/** GET /api/auth/session — used by AuthGuard to confirm the session is live. */
export const GET = createSessionProbeRoute();
