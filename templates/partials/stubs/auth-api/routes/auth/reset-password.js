// Local auth implementation (standalone mode). POST /auth/reset-password

import { checkRateLimit, getClientKey } from "__NPM_SCOPE__/core-api/utils/rate-limit";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { User, UserStatus } from "../../models/user.model.js";
import { hashPassword, validatePasswordStrength } from "../../utils/password.js";
import { revokeAllRefreshTokensForUser, verifyPasswordResetCode } from "../../utils/tokens.js";
import { fail, readBody } from "../_shared.js";

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  code: z
    .string()
    .length(8, "Reset code must be 8 characters")
    .regex(/^[A-Z0-9]{8}$/, "Reset code must contain only uppercase letters and digits"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request) {
  try {
    const limited = checkRateLimit(getClientKey(request, "reset-password"), 10, 60 * 60 * 1000);
    if (limited) return limited;

    const { data, response } = await readBody(request, resetPasswordSchema);
    if (response) return response;
    const { email, code, password } = data;

    const strength = validatePasswordStrength(password);
    if (!strength.isValid) return Errors.badRequest(strength.error || "Invalid password");

    const user = await User.findOne({ email });

    // Same generic message for an unknown address and a bad code, so this is not
    // an account oracle either.
    const invalid = Errors.badRequest("Invalid or expired reset code");
    if (!user || user.status === UserStatus.DELETED || user.status === UserStatus.BLOCKED) {
      return invalid;
    }
    if (!(await verifyPasswordResetCode(user._id, code))) return invalid;

    user.passwordHash = await hashPassword(password);
    // A reset also proves control of the mailbox, so treat it as verification.
    if (user.status === UserStatus.PENDING) user.status = UserStatus.ACTIVE;
    await user.save();

    // Whoever prompted the reset may have had the old password. Drop every live
    // session so they are signed out everywhere.
    await revokeAllRefreshTokensForUser(user._id);

    logger.info("password_reset", { userId: user._id.toString() });
    return NextResponse.json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    return fail("Password reset", error);
  }
}
