/**
 * __PROJECT_NAME__ API — entrypoint.
 * Wyscan: add `__NPM_SCOPE__/*` imports as needed; develop in `../__ECOSYSTEM_DIR__/Packages` (WyscanPackages) and open PRs upstream.
 * Design tokens / native reference live in `../__ECOSYSTEM_DIR__/DesignSystem` (WyscanDesignSystem).
 */
import { serve } from "@hono/node-server";
import "dotenv/config";
import mongoose from "mongoose";
import { createApp, envSchema } from "./app.js";
import { initFirebaseAdminFromEnv } from "./lib/firebaseAdmin.js";
import { validateProductionEnv } from "./lib/validateProductionEnv.js";

const env = envSchema.parse(process.env);
validateProductionEnv(env);

if (env.MONGODB_URL) {
  await mongoose.connect(env.MONGODB_URL);
}

initFirebaseAdminFromEnv();

const app = await createApp(env);

const port = env.PORT;
console.log(`__PROJECT_NAME__ API listening on http://0.0.0.0:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
});
