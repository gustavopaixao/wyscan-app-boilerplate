// Local auth implementation (standalone mode). POST /auth/refresh
//
// Rotating: every refresh issues a NEW refresh token and revokes the presented
// one. A stolen token is therefore usable at most once, and its use invalidates
// the legitimate holder's copy — which is how theft becomes detectable.

import { checkRateLimit, getClientKey } from "__NPM_SCOPE__/core-api/utils/rate-limit";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { User, UserStatus } from "../../models/user.model.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import { isRefreshTokenValid, revokeRefreshToken, saveRefreshToken } from "../../utils/tokens.js";
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_MS, fail, readBody } from "../_shared.js";

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export async function POST(request) {
  try {
    const limited = checkRateLimit(getClientKey(request, "refresh"), 30, 60 * 1000);
    if (limited) return limited;

    const { data, response } = await readBody(request, refreshTokenSchema);
    if (response) return response;
    const { refreshToken } = data;

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return Errors.unauthorized("Invalid refresh token");
    }

    // A valid signature is not enough: the token must still be live in the
    // store, which is what makes logout and rotation actually revoke.
    if (!(await isRefreshTokenValid(refreshToken, payload.userId))) {
      return Errors.unauthorized("Refresh token has been revoked");
    }

    const user = await User.findById(payload.userId);
    if (!user) return Errors.unauthorized("User not found");
    if (user.status === UserStatus.DELETED) return Errors.unauthorized("Account has been deleted");
    if (user.status === UserStatus.BLOCKED) return Errors.unauthorized("Account has been blocked");
    if (user.status === UserStatus.PENDING) {
      return Errors.unauthorized("Email verification required");
    }

    // Role is re-read from the user row, so a role change lands within one
    // access-token lifetime rather than persisting for the refresh window.
    const accessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);
    await saveRefreshToken(user._id, newRefreshToken, new Date(Date.now() + REFRESH_TOKEN_TTL_MS));
    await revokeRefreshToken(refreshToken, payload.userId);

    return NextResponse.json({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  } catch (error) {
    return fail("Token refresh", error);
  }
}
