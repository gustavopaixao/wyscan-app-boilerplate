// Local auth implementation (standalone mode). GET /me

import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { NextResponse } from "next/server.js";
import { User } from "../../models/user.model.js";
import { requireAuth } from "../../utils/auth.js";
import { fail } from "../_shared.js";

export async function GET(request) {
  try {
    let authed;
    try {
      authed = await requireAuth(request);
    } catch (error) {
      return Errors.unauthorized(error instanceof Error ? error.message : undefined);
    }

    // Re-read rather than returning the token claims: this endpoint is how every
    // client confirms its session is still good, so it must reflect the row.
    const user = await User.findById(authed.userId);
    if (!user) return Errors.notFound("User");

    return NextResponse.json({ user: user.toPublicJSON() });
  } catch (error) {
    return fail("Profile lookup", error);
  }
}
