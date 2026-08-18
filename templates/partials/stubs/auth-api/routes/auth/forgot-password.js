// Local auth implementation (standalone mode). POST /auth/forgot-password

import { checkRateLimit, getClientKey } from "__NPM_SCOPE__/core-api/utils/rate-limit";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { User, UserStatus } from "../../models/user.model.js";
import { generateVerificationCode } from "../../utils/auth.js";
import { savePasswordResetCode } from "../../utils/tokens.js";
import { getSendPasswordResetEmail } from "../../utils/transactional-email.js";
import { CODE_TTL_MS, fail, readBody } from "../_shared.js";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

/**
 * The SAME response is returned whether or not the address is registered. Any
 * variation here — different message, different status, or an early return that
 * skips the mail send — turns this endpoint into an account oracle.
 */
const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for this email, you will receive a password reset code shortly.";

export async function POST(request) {
  try {
    const limited = checkRateLimit(getClientKey(request, "forgot-password"), 3, 60 * 60 * 1000);
    if (limited) return limited;

    const { data, response } = await readBody(request, forgotPasswordSchema);
    if (response) return response;

    const user = await User.findOne({ email: data.email });

    // Deleted and blocked accounts are treated exactly like unknown ones.
    if (user && user.status !== UserStatus.DELETED && user.status !== UserStatus.BLOCKED) {
      const code = generateVerificationCode();
      await savePasswordResetCode(user._id, code, new Date(Date.now() + CODE_TTL_MS));

      const sendPasswordResetEmail = await getSendPasswordResetEmail();
      const sent = await sendPasswordResetEmail(user.email, code, user.displayName);
      if (!sent) logger.warn("password_reset_email_not_sent", { userId: user._id.toString() });
    }

    return NextResponse.json({ message: GENERIC_SUCCESS_MESSAGE });
  } catch (error) {
    return fail("Password reset request", error);
  }
}
