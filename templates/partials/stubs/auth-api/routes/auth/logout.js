// Local auth implementation (standalone mode). POST /auth/logout

import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { requireAuth } from "../../utils/auth.js";
import { revokeAllRefreshTokensForUser, revokeRefreshToken } from "../../utils/tokens.js";
import { fail, readBody } from "../_shared.js";

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
  /** Sign out every device rather than just this session. */
  allDevices: z.boolean().optional(),
});

export async function POST(request) {
  try {
    let user;
    try {
      user = await requireAuth(request);
    } catch {
      return Errors.unauthorized();
    }

    const { data, response } = await readBody(request, logoutSchema);
    if (response) return response;

    if (data.allDevices) {
      await revokeAllRefreshTokensForUser(user.userId);
    } else if (data.refreshToken) {
      await revokeRefreshToken(data.refreshToken, user.userId.toString());
    }
    // With neither field the access token simply expires on its own — still a
    // 200, because the client has already discarded its copy.

    logger.info("user_logged_out", {
      userId: user.userId.toString(),
      allDevices: Boolean(data.allDevices),
    });
    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error) {
    return fail("Logout", error);
  }
}
