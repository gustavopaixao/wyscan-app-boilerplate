// Local auth implementation (standalone mode). POST /auth/register
//
// Creates a PENDING user and mails an 8-character code. The account cannot sign
// in until POST /auth/verify-email consumes that code.

import { hasNoHtmlTags } from "__NPM_SCOPE__/core-api/utils/validation";
import { checkRateLimit, getClientKey } from "__NPM_SCOPE__/core-api/utils/rate-limit";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { User, UserStatus } from "../../models/user.model.js";
import { generateVerificationCode } from "../../utils/auth.js";
import { hashPassword, validatePasswordStrength } from "../../utils/password.js";
import { saveVerificationCode } from "../../utils/tokens.js";
import { getSendVerificationEmail } from "../../utils/transactional-email.js";
import { CODE_TTL_MS, fail, readBody } from "../_shared.js";

const registerSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(80, "Display name is too long")
    .trim()
    .refine(hasNoHtmlTags, { message: "Display name cannot contain HTML tags" }),
});

export async function POST(request) {
  try {
    const limited = checkRateLimit(getClientKey(request, "register"), 5, 60 * 60 * 1000);
    if (limited) return limited;

    const { data, response } = await readBody(request, registerSchema);
    if (response) return response;
    const { email, password, displayName } = data;

    const strength = validatePasswordStrength(password);
    if (!strength.isValid) return Errors.badRequest(strength.error || "Invalid password");

    if (await User.findOne({ email }).lean()) {
      return Errors.conflict("Email already registered");
    }

    const user = await User.create({
      email,
      passwordHash: await hashPassword(password),
      displayName,
      status: UserStatus.PENDING,
    });

    const code = generateVerificationCode();
    await saveVerificationCode(user._id, code, new Date(Date.now() + CODE_TTL_MS));

    const sendVerificationEmail = await getSendVerificationEmail();
    const sent = await sendVerificationEmail(email, code, displayName);
    if (!sent) {
      // The account exists either way — surfacing the failure would strand the
      // user with no path forward, so log it and let them use resend-code.
      logger.warn("verification_email_not_sent", { userId: user._id.toString() });
    }

    return NextResponse.json(
      {
        requiresVerification: true,
        userId: user._id.toString(),
        email: user.email,
        message: "Registration successful. Please check your email for a verification code.",
      },
      { status: 201 },
    );
  } catch (error) {
    return fail("Registration", error);
  }
}
