/**
 * The `/api/v1/admin` route tree.
 *
 * One registrar so `app.ts` has a single import, with each surface in its own
 * module beside it. Every route here gates on `requireAdminUser`; there is no
 * shared middleware doing it, because the admin surface is small enough that an
 * explicit check per route is easier to audit than a prefix binding someone can
 * forget to extend.
 */
import type { Hono } from "hono";
import { registerAdminLogRoutes } from "./logs.js";
import { registerAdminSystemRoutes } from "./system.js";
import { registerAdminUserRoutes } from "./users.js";

export function registerV1AdminRoutes(app: Hono): void {
  registerAdminUserRoutes(app);
  registerAdminSystemRoutes(app);
  registerAdminLogRoutes(app);
}
