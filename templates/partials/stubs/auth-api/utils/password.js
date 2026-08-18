// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api password utilities.

import { validatePasswordStrength as coreValidatePasswordStrength } from "__NPM_SCOPE__/core-api/utils/validation";
import bcrypt from "bcryptjs";

/**
 * 10 rounds balances cost against latency; each extra round doubles the work.
 * Raising this stays backward compatible — bcrypt encodes the cost in the hash,
 * so existing hashes keep verifying at their original cost.
 */
const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Constant-time by construction (bcrypt.compare), so it leaks no timing signal. */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password) {
  return coreValidatePasswordStrength(password);
}

export function requireStrongPassword(password) {
  const validation = validatePasswordStrength(password);
  if (!validation.isValid) throw new Error(validation.error);
}
