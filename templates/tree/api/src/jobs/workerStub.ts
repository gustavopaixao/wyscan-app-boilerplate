/**
 * Shared placeholder for BullMQ worker entrypoints (feature 0001).
 *
 * Each `job:*` script boots this stub until its real worker lands with its
 * feature. The stub validates infra config and exits cleanly so `pnpm job:*`
 * and the Docker Compose worker services do not crash-loop on boot.
 */
import "dotenv/config";

export function runWorkerStub(name: string): void {
  const redisUrl = process.env.REDIS_URL?.trim();
  const mongoUrl = process.env.MONGODB_URL?.trim();
  console.log(
    `[__PROJECT_SLUG__-api] ${name}: placeholder worker (feature 0001 boilerplate). ` +
      `redis=${redisUrl ? "configured" : "unset"} mongo=${mongoUrl ? "configured" : "unset"}. ` +
      "Implement the real worker with its feature.",
  );
}
