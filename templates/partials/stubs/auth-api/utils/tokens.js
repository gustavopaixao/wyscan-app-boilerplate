// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api token store.
//
// Nothing here is stored in the clear, so a database dump yields no usable
// refresh token or code. Two different hashes are used, on purpose:
//
//   refresh tokens  SHA-256. They are ~200-byte JWTs with a high-entropy
//                   signature, so they need no slow KDF — and bcrypt MUST NOT
//                   be used: it silently truncates its input at 72 bytes, and
//                   every refresh JWT for a given user shares its first 72
//                   bytes (header + the `userId`/`role`/`type` prefix). Under
//                   bcrypt they all hash identically, which makes rotation and
//                   logout silent no-ops — a revoked token keeps working.
//                   SHA-256 is also deterministic, so lookups are an indexed
//                   query instead of a scan-and-compare over every live row.
//
//   codes           bcrypt. 8 characters of [A-Z0-9] is ~41 bits, low enough
//                   that a leaked table would be brute-forceable; the slow KDF
//                   is worth it. Well under the 72-byte limit.

import { createHash } from "node:crypto";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import bcrypt from "bcryptjs";
import { AuthToken, TokenType } from "../models/auth-token.model.js";

const BCRYPT_ROUNDS = 10;

/** Refresh tokens retained per user; older ones are pruned on each new login. */
const MAX_REFRESH_TOKENS_PER_USER = 5;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

/** Find the row whose bcrypt hash matches `value`, or null. Codes only. */
async function findMatchingCode(rows, value) {
  for (const row of rows) {
    if (await bcrypt.compare(value, row.token)) return row;
  }
  return null;
}

/** Save a code of `type`, replacing any outstanding code of the same type. */
async function saveCode(userId, code, expiresAt, type) {
  await AuthToken.deleteMany({ userId, type });
  await AuthToken.create({
    userId,
    type,
    token: await bcrypt.hash(code, BCRYPT_ROUNDS),
    expiresAt,
    used: false,
  });
}

/** Consume a code of `type`: verify, then mark used so it cannot be replayed. */
async function consumeCode(userId, code, type) {
  const rows = await AuthToken.find({
    userId,
    type,
    used: false,
    expiresAt: { $gt: new Date() },
  });
  if (rows.length === 0) return false;

  const match = await findMatchingCode(rows, code);
  if (!match) return false;

  match.used = true;
  await match.save();
  return true;
}

export async function saveRefreshToken(userId, token, expiresAt) {
  // Cap the number of live sessions per user. Sorted newest-first and skipping
  // the ones we keep, so `stale` is exactly the overflow.
  const stale = await AuthToken.find({ userId, type: TokenType.REFRESH })
    .sort({ createdAt: -1 })
    .skip(MAX_REFRESH_TOKENS_PER_USER - 1)
    .select("_id");
  if (stale.length > 0) {
    await AuthToken.deleteMany({ _id: { $in: stale.map((t) => t._id) } });
  }

  await AuthToken.create({
    userId,
    type: TokenType.REFRESH,
    token: sha256(token),
    expiresAt,
    used: false,
  });
}

export async function revokeRefreshToken(token, userId) {
  const result = await AuthToken.deleteOne({
    userId,
    type: TokenType.REFRESH,
    token: sha256(token),
  });
  return (result.deletedCount ?? 0) > 0;
}

export async function revokeAllRefreshTokensForUser(userId) {
  const result = await AuthToken.deleteMany({ userId, type: TokenType.REFRESH });
  return result.deletedCount ?? 0;
}

export async function isRefreshTokenValid(token, userId) {
  const row = await AuthToken.findOne({
    userId,
    type: TokenType.REFRESH,
    token: sha256(token),
    used: false,
    expiresAt: { $gt: new Date() },
  });
  return row !== null;
}

export const saveVerificationCode = (userId, code, expiresAt) =>
  saveCode(userId, code, expiresAt, TokenType.VERIFICATION);
export const savePasswordResetCode = (userId, code, expiresAt) =>
  saveCode(userId, code, expiresAt, TokenType.PASSWORD_RESET);
export const saveAccountDeletionCode = (userId, code, expiresAt) =>
  saveCode(userId, code, expiresAt, TokenType.ACCOUNT_DELETION);

export const verifyCode = (userId, code) => consumeCode(userId, code, TokenType.VERIFICATION);
export const verifyPasswordResetCode = (userId, code) =>
  consumeCode(userId, code, TokenType.PASSWORD_RESET);
export const verifyAccountDeletionCode = (userId, code) =>
  consumeCode(userId, code, TokenType.ACCOUNT_DELETION);

/**
 * Belt-and-braces sweep. MongoDB's TTL index already reaps these; this exists
 * for deployments where the index has not been built yet.
 */
export async function cleanupExpiredTokens() {
  const result = await AuthToken.deleteMany({ expiresAt: { $lt: new Date() } });
  const count = result.deletedCount ?? 0;
  if (count > 0) logger.info("auth_tokens_cleaned", { count });
  return count;
}
