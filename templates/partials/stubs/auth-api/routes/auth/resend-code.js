// Local auth implementation (standalone mode). POST /auth/resend-code
//
// Keyed by userId (which register/login already handed the client) rather than
// by email, so this endpoint cannot be used to probe which addresses exist.

import { isValidObjectId } from "__NPM_SCOPE__/core-api/utils/validation";
import { checkRateLimit, getClientKey } from "__NPM_SCOPE__/core-api/utils/rate-limit";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { User, UserStatus } from "../../models/user.model.js";
import { generateVerificationCode } from "../../utils/auth.js";
import { saveVerificationCode } from "../../utils/tokens.js";
import { getSendVerificationEmail } from "../../utils/transactional-email.js";
import { CODE_TTL_MS, fail, readBody } from "../_shared.js";

const resendCodeSchema = z.object({
  userId: z.string().refine(isValidObjectId, { message: "Invalid user ID format" }),
});

export async function POST(request) {
  try {
    const limited = checkRateLimit(getClientKey(request, "resend-code"), 5, 60 * 60 * 1000);
    if (limited) return limited;

    const { data, response } = await readBody(request, resendCodeSchema);
    if (response) return response;

    const user = await User.findById(data.userId);
    if (!user) return Errors.notFound("User");
    if (user.status !== UserStatus.PENDING) {
      return Errors.conflict("Account does not require verification");
    }

    const code = generateVerificationCode();
    // saveVerificationCode replaces any outstanding code, so the previous one
    // stops working the moment a new one is issued.
    await saveVerificationCode(user._id, code, new Date(Date.now() + CODE_TTL_MS));

    const sendVerificationEmail = await getSendVerificationEmail();
    const sent = await sendVerificationEmail(user.email, code, user.displayName);
    if (!sent) logger.warn("verification_email_not_sent", { userId: user._id.toString() });

    return NextResponse.json({ message: "Verification code sent." });
  } catch (error) {
    return fail("Resend verification code", error);
  }
}
