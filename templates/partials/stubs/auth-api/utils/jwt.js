// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api JWT utilities.
//
// Access tokens are short (15m) and carry the role; refresh tokens are long (7d)
// and carry no authority of their own — they are only accepted when a matching
// unused row also exists in auth_tokens (see utils/tokens.js).

import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

/** Fixed secret under NODE_ENV=test so suites are deterministic. Never used elsewhere. */
const TEST_JWT_SECRET = "__PROJECT_SLUG__-test-secret";

/**
 * There is deliberately no weak development fallback: a misconfigured
 * non-production deployment (NODE_ENV unset but network-reachable) must never
 * sign tokens with a guessable secret.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "test") return TEST_JWT_SECRET;
  throw new Error(
    "JWT_SECRET environment variable is required (generate one with: openssl rand -base64 48)",
  );
}

export function generateAccessToken(userId, role) {
  return jwt.sign({ userId: userId.toString(), role, type: "access" }, getJwtSecret(), {
    expiresIn: "15m",
  });
}

export function generateRefreshToken(userId) {
  return jwt.sign(
    {
      userId: userId.toString(),
      // Role is not carried on refresh tokens — it is re-read from the user row
      // on every refresh, so a role change takes effect within one access-token
      // lifetime rather than persisting for the whole refresh window.
      role: "user",
      type: "refresh",
      // A unique token id is REQUIRED for rotation to mean anything. Without it
      // the payload is a pure function of (userId, iat), and `iat` has
      // one-second granularity — so two refreshes inside the same second mint
      // byte-identical tokens. Rotation would then hand back the token it just
      // revoked, and revoking the old one would revoke the new one too.
      jti: randomUUID(),
    },
    getJwtSecret(),
    { expiresIn: "7d" },
  );
}

function verify(token, expectedType, label) {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded.type !== expectedType) throw new Error("Invalid token type");
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw new Error(`${label} has expired`);
    if (error instanceof jwt.JsonWebTokenError) throw new Error(`Invalid ${label.toLowerCase()}`);
    throw error;
  }
}

export function verifyAccessToken(token) {
  return verify(token, "access", "Access token");
}

export function verifyRefreshToken(token) {
  return verify(token, "refresh", "Refresh token");
}
