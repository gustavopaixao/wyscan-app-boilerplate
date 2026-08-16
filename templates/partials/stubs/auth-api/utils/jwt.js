// STUB — replace with __NPM_SCOPE__/auth-api when you adopt the shared packages.
// Verifies against the local JWT_SECRET. The shared package additionally
// supports JWKS-backed verification and key rotation.

import jwt from "jsonwebtoken";

export function verifyAccessToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.verify(token, secret);
}
