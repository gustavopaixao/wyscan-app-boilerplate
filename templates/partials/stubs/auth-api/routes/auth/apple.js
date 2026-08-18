// Local auth implementation (standalone mode). POST /auth/apple

import { checkRateLimit, getClientKey } from "__NPM_SCOPE__/core-api/utils/rate-limit";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { z } from "zod";
import { verifyAppleToken } from "../../utils/oauth.js";
import { fail, oauthSignIn, readBody } from "../_shared.js";

const appleAuthSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
  /**
   * Apple sends the real name only on the FIRST authorization and never again,
   * so the client forwards it here. Advisory: it is not part of the signed
   * token, so it is used for display only and never to identify the account.
   */
  displayName: z.string().max(80).trim().optional(),
});

export async function POST(request) {
  try {
    const limited = checkRateLimit(getClientKey(request, "oauth-apple"), 10, 60 * 60 * 1000);
    if (limited) return limited;

    const { data, response } = await readBody(request, appleAuthSchema);
    if (response) return response;

    let info;
    try {
      info = await verifyAppleToken(data.idToken);
    } catch {
      return Errors.unauthorized("Invalid Apple token");
    }

    return await oauthSignIn("appleId", {
      ...info,
      displayName: data.displayName || info.displayName,
    });
  } catch (error) {
    return fail("Apple authentication", error);
  }
}
