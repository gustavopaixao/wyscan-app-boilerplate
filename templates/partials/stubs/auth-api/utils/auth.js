// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api request guards.
//
// Every authenticated route in api/src/v1 goes through requireAuth, so the
// status checks here are the single chokepoint for deleted/blocked/pending
// accounts.

import { randomInt } from "node:crypto";
import { ForbiddenError, UnauthorizedError } from "__NPM_SCOPE__/core-api/utils/errors";
import { User } from "../models/user.model.js";
import { verifyAccessToken } from "./jwt.js";

export async function getUserFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) throw new UnauthorizedError("Authorization header missing");

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new UnauthorizedError("Invalid authorization header format. Expected: Bearer <token>");
  }

  let payload;
  try {
    payload = verifyAccessToken(parts[1]);
  } catch {
    // Never surface the underlying jsonwebtoken message — it distinguishes
    // "expired" from "malformed", which is more than a caller needs.
    throw new UnauthorizedError("Invalid or expired access token");
  }

  const user = await User.findById(payload.userId).lean();
  if (!user) throw new UnauthorizedError("User not found");

  if (user.status === "deleted") throw new UnauthorizedError("User account has been deleted");
  if (user.status === "blocked") throw new UnauthorizedError("User account has been blocked");
  if (user.status === "pending") throw new UnauthorizedError("Email verification required");

  return {
    userId: user._id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

export const requireAuth = getUserFromRequest;

/** Like requireAuth, but returns null instead of throwing for anonymous callers. */
export async function getOptionalUser(request) {
  try {
    return await getUserFromRequest(request);
  } catch {
    return null;
  }
}

export async function requireRole(request, ...roles) {
  const user = await getUserFromRequest(request);
  if (!roles.includes(user.role)) {
    throw new ForbiddenError(`Requires one of the following roles: ${roles.join(", ")}`);
  }
  return user;
}

/** True when the user owns the resource, or is staff. */
export function hasPermission(user, resourceOwnerId) {
  if (user.role === "admin" || user.role === "moderator") return true;
  return user.userId.toString() === resourceOwnerId.toString();
}

/**
 * 8 characters from [A-Z0-9]. `randomInt` is a CSPRNG and unbiased — Math.random()
 * is neither, and these codes gate email verification and password reset.
 */
export function generateVerificationCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += characters[randomInt(characters.length)];
  return code;
}
