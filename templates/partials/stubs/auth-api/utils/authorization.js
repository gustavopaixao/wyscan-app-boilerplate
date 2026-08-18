// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api admin authorization helpers.
//
// These RETURN the error response rather than throwing, so an admin route reads
// as: `const result = await requireAdmin(req); if (result instanceof Response)
// return result;` — matching the shared package exactly.

import { ForbiddenError, Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { getUserFromRequest } from "./auth.js";

async function requireOneOf(request, roles, message) {
  try {
    const user = await getUserFromRequest(request);
    if (!roles.includes(user.role)) throw new ForbiddenError(message);
    return user;
  } catch (error) {
    if (error instanceof ForbiddenError) return Errors.forbidden(error.message);
    return Errors.unauthorized();
  }
}

export function requireModerator(request) {
  return requireOneOf(request, ["moderator", "admin"], "Moderator or admin access required");
}

export function requireAdmin(request) {
  return requireOneOf(request, ["admin"], "Admin access required");
}

/**
 * Audit trail for privileged mutations. The shared package leaves room for a
 * dedicated audit collection; here it goes to the structured log, which the
 * log-agent sidecar already ships.
 */
export async function logAdminAction(userId, action, resource, resourceId, metadata) {
  logger.info("Admin action", {
    adminUserId: userId.toString(),
    action,
    resource,
    resourceId: resourceId || undefined,
    metadata,
    timestamp: new Date().toISOString(),
  });
}
