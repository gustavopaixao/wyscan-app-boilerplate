// Local auth implementation (standalone mode). Internal helpers — NOT part of
// the package `exports` map, so nothing outside this stub can import them.
//
// The shared __NPM_SCOPE__/auth-api keeps each route self-contained; this stub
// factors the repeated parts out so the token lifetimes and the OAuth
// account-linking rules exist in exactly one place.

import { randomBytes } from "node:crypto";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { NextResponse } from "next/server.js";
import { User, UserStatus } from "../models/user.model.js";
import { hashPassword } from "../utils/password.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import { saveRefreshToken } from "../utils/tokens.js";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Verification and password-reset codes. Short enough to limit brute force. */
export const CODE_TTL_MS = 15 * 60 * 1000;

/** Parse + validate a JSON body. Returns `{ data }` or `{ response }`. */
export async function readBody(request, schema) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { response: Errors.badRequest("Request body must be valid JSON") };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    // Surface only the first message — the full zod tree leaks the schema shape.
    return { response: Errors.badRequest(result.error.errors[0].message) };
  }
  return { data: result.data };
}

/** Mint a session for `user` and persist the refresh token. */
export async function issueSession(user) {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  await saveRefreshToken(user._id, refreshToken, new Date(Date.now() + REFRESH_TOKEN_TTL_MS));
  return { accessToken, refreshToken };
}

/** `deleted` / `blocked` are terminal for sign-in. Returns a response or null. */
export function rejectUnusableAccount(user) {
  if (user.status === UserStatus.DELETED) return Errors.unauthorized("Account has been deleted");
  if (user.status === UserStatus.BLOCKED) return Errors.unauthorized("Account has been blocked");
  return null;
}

/**
 * Shared body of the google/apple/facebook routes.
 *
 * Resolution order is: known provider id → existing account with the same email
 * (link) → brand new account. Linking by email is only safe because every
 * verifier in utils/oauth.js establishes that the provider vouched for that
 * address — do not relax that.
 *
 * @param {"googleId"|"appleId"|"facebookId"} field
 */
export async function oauthSignIn(field, info) {
  const { providerId, email, displayName } = info;

  let user = await User.findOne({ [`oauth.${field}`]: providerId });
  let isNewUser = false;

  if (!user) {
    user = await User.findOne({ email });

    if (user) {
      user.oauth[field] = providerId;
      await user.save();
      logger.info("oauth_account_linked", { userId: user._id.toString(), field });
    } else {
      // OAuth accounts never sign in by password, but passwordHash is required.
      // A random 32-byte value is unguessable and never leaves this scope.
      user = await User.create({
        email,
        passwordHash: await hashPassword(randomBytes(32).toString("hex")),
        displayName,
        // The provider already verified the email, so skip our own verification.
        status: UserStatus.ACTIVE,
        oauth: { [field]: providerId },
      });
      isNewUser = true;
      logger.info("oauth_user_created", { userId: user._id.toString(), field });
    }
  }

  const rejected = rejectUnusableAccount(user);
  if (rejected) return rejected;

  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueSession(user);
  return NextResponse.json({
    accessToken,
    refreshToken,
    user: user.toPublicJSON(),
    isNewUser,
  });
}

/** Uniform 500 handler: log the detail, tell the client nothing. */
export function fail(scope, error) {
  logger.error(`${scope}_failed`, {
    error: error instanceof Error ? error.message : "Unknown error",
  });
  return Errors.internal(`${scope} failed`);
}
