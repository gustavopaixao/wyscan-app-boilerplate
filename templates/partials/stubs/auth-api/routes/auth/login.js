// Local auth implementation (standalone mode). POST /auth/login

import { checkRateLimit, getClientKey } from "__NPM_SCOPE__/core-api/utils/rate-limit";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { User, UserStatus } from "../../models/user.model.js";
import { comparePassword } from "../../utils/password.js";
import { fail, issueSession, readBody } from "../_shared.js";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

/**
 * A fixed, valid bcrypt hash compared against when no user is found, so the
 * "unknown email" path costs the same as a real password check and cannot be
 * used as a timing oracle for account enumeration.
 *
 * Not a credential: it hashes a throwaway string and never matches a real
 * password.
 */
const DUMMY_PASSWORD_HASH = "$2b$10$Qb9ai.AVuw8i8KRNRW6F2edLv/zK7kjSN/HJTng4NmciDcXvcsQJ2";

export async function POST(request) {
  try {
    const limited = checkRateLimit(getClientKey(request, "login"), 10, 60 * 60 * 1000);
    if (limited) return limited;

    const { data, response } = await readBody(request, loginSchema);
    if (response) return response;
    const { email, password } = data;

    const user = await User.findOne({ email }).select("+passwordHash");

    // Always run a bcrypt comparison — even with no user, against the dummy hash
    // above — so response time never reveals whether the email is registered.
    const isPasswordValid = await comparePassword(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    // One generic failure for unknown email OR wrong password. Account state is
    // never disclosed without a correct password, so it cannot be enumerated.
    if (!user || !isPasswordValid) return Errors.unauthorized("Invalid email or password");

    // Password is correct from here on — safe to surface account state.
    if (user.status === UserStatus.DELETED) return Errors.unauthorized("Account has been deleted");
    if (user.status === UserStatus.BLOCKED) return Errors.unauthorized("Account has been blocked");

    if (user.status === UserStatus.PENDING) {
      return NextResponse.json({
        requiresVerification: true,
        userId: user._id.toString(),
        email: user.email,
        message: "Please verify your email before signing in.",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken, refreshToken } = await issueSession(user);
    logger.info("user_logged_in", { userId: user._id.toString() });

    return NextResponse.json({ accessToken, refreshToken, user: user.toPublicJSON() });
  } catch (error) {
    return fail("Login", error);
  }
}
