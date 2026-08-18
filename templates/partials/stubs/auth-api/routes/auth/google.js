// Local auth implementation (standalone mode). POST /auth/google
//
// The client performs the Google flow itself and posts the resulting ID token;
// verifyGoogleToken is the only thing standing between that token and a session.

import { checkRateLimit, getClientKey } from "__NPM_SCOPE__/core-api/utils/rate-limit";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { z } from "zod";
import { verifyGoogleToken } from "../../utils/oauth.js";
import { fail, oauthSignIn, readBody } from "../_shared.js";

const googleAuthSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
});

export async function POST(request) {
  try {
    const limited = checkRateLimit(getClientKey(request, "oauth-google"), 10, 60 * 60 * 1000);
    if (limited) return limited;

    const { data, response } = await readBody(request, googleAuthSchema);
    if (response) return response;

    let info;
    try {
      info = await verifyGoogleToken(data.idToken);
    } catch (error) {
      // "email not verified" is actionable by the user; everything else is
      // collapsed so we do not describe why verification failed.
      const message = error instanceof Error ? error.message : "";
      return Errors.unauthorized(
        message === "Google email not verified" ? message : "Invalid Google token",
      );
    }

    return await oauthSignIn("googleId", info);
  } catch (error) {
    return fail("Google authentication", error);
  }
}
