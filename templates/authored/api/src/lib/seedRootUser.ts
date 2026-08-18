/**
 * Seed the initial root user, once, at API boot.
 *
 * `POST /auth/register` creates every account as PENDING behind an emailed
 * verification code, and the admin console requires `role === "admin"` exactly
 * with no self-service promotion — so without this a freshly generated project
 * has no account that can sign into `web/__PROJECT_SLUG__-admin` at all.
 *
 * Called from `src/server.ts` immediately after `mongoose.connect()`. It is
 * idempotent, so a restart is silent, and it runs again after a destructive
 * `make fresh` has dropped the volume.
 *
 * Change or delete this user before deploying anywhere reachable — the
 * credentials below are published in the project's own documentation.
 */
// biome-ignore format: width depends on the npm scope, so the wrapping is not stable across projects
import { User, UserRole, UserStatus } from "__NPM_SCOPE__/auth-api/models";
import { hashPassword } from "__NPM_SCOPE__/auth-api/utils/password";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";

export const ROOT_USER_EMAIL = "root@wyscan.local";
const ROOT_USER_PASSWORD = "Password@1";
const ROOT_USER_DISPLAY_NAME = "Root";

/** Mongo's unique-index violation. Two API processes racing is not an error. */
const DUPLICATE_KEY = 11000;

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === DUPLICATE_KEY
  );
}

/**
 * Create the root user unless it already exists.
 *
 * Never throws: the API has to come up even when seeding fails, so every
 * failure is logged and swallowed rather than taking the process down.
 */
export async function seedRootUser(): Promise<void> {
  // A publicly documented credential must never be created against a real
  // database. Same rule as the transactional-email dev fallback.
  if ((process.env.NODE_ENV ?? "development") === "production") return;

  try {
    if (await User.findOne({ email: ROOT_USER_EMAIL }).lean()) return;

    await User.create({
      email: ROOT_USER_EMAIL,
      passwordHash: await hashPassword(ROOT_USER_PASSWORD),
      displayName: ROOT_USER_DISPLAY_NAME,
      // ACTIVE, not PENDING: skips the verification-code exchange that
      // `register` requires, so the account can sign in immediately.
      status: UserStatus.ACTIVE,
      // ADMIN specifically — `isAppAdminRole()` in the admin app rejects
      // `moderator`, so anything less cannot open the console.
      role: UserRole.ADMIN,
    });

    logger.info("root_user_seeded", { email: ROOT_USER_EMAIL });
  } catch (error) {
    if (isDuplicateKey(error)) return;
    logger.error("root_user_seed_failed", {
      email: ROOT_USER_EMAIL,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
