// Local auth implementation (standalone mode). POST /auth/verify-email
//
// Consumes the registration code and activates the account, returning a session
// so the client does not have to bounce back through /auth/login.

import { checkRateLimit, getClientKey } from "__NPM_SCOPE__/core-api/utils/rate-limit";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { User, UserStatus } from "../../models/user.model.js";
import { verifyCode } from "../../utils/tokens.js";
import { fail, issueSession, readBody } from "../_shared.js";

const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  code: z
    .string()
    .length(8, "Verification code must be 8 characters")
    .regex(/^[A-Z0-9]{8}$/, "Verification code must contain only uppercase letters and digits"),
});

export async function POST(request) {
  try {
    const limited = checkRateLimit(getClientKey(request, "verify-email"), 10, 60 * 60 * 1000);
    if (limited) return limited;

    const { data, response } = await readBody(request, verifyEmailSchema);
    if (response) return response;
    const { email, code } = data;

    const user = await User.findOne({ email });
    if (!user) return Errors.notFound("User");

    if (user.status === UserStatus.ACTIVE) return Errors.conflict("Email already verified");
    if (user.status === UserStatus.DELETED) return Errors.badRequest("Account has been deleted");
    if (user.status === UserStatus.BLOCKED) return Errors.badRequest("Account has been blocked");

    // verifyCode marks the row used, so a code cannot be replayed.
    if (!(await verifyCode(user._id, code))) {
      return Errors.badRequest("Invalid or expired verification code");
    }

    user.status = UserStatus.ACTIVE;
    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken, refreshToken } = await issueSession(user);
    logger.info("email_verified", { userId: user._id.toString() });

    return NextResponse.json({ accessToken, refreshToken, user: user.toPublicJSON() });
  } catch (error) {
    return fail("Email verification", error);
  }
}
