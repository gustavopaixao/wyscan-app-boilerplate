// Local auth implementation (standalone mode). POST /auth/facebook
//
// Server-side only in the generated project: no mobile or web UI calls this yet.
// It is wired so adding a Facebook button is a client-side change alone.

import { checkRateLimit, getClientKey } from "__NPM_SCOPE__/core-api/utils/rate-limit";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { z } from "zod";
import { verifyFacebookToken } from "../../utils/oauth.js";
import { fail, oauthSignIn, readBody } from "../_shared.js";

const facebookAuthSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
});

export async function POST(request) {
  try {
    const limited = checkRateLimit(getClientKey(request, "oauth-facebook"), 10, 60 * 60 * 1000);
    if (limited) return limited;

    const { data, response } = await readBody(request, facebookAuthSchema);
    if (response) return response;

    let info;
    try {
      info = await verifyFacebookToken(data.accessToken);
    } catch {
      return Errors.unauthorized("Invalid Facebook token");
    }

    return await oauthSignIn("facebookId", info);
  } catch (error) {
    return fail("Facebook authentication", error);
  }
}
