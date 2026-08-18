// Local auth implementation (standalone mode). DELETE /me
//
// Soft delete: the row is retained with status=deleted so foreign keys held by
// other collections do not dangle, and the email stays claimed (re-registering
// it would otherwise resurrect access to whatever still references the id).
// Purging is a product decision — see docs/runbooks/auth.md.

import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { NextResponse } from "next/server.js";
import { User, UserStatus } from "../../models/user.model.js";
import { requireAuth } from "../../utils/auth.js";
import { revokeAllRefreshTokensForUser } from "../../utils/tokens.js";
import { fail } from "../_shared.js";

export async function DELETE(request) {
  try {
    let authed;
    try {
      authed = await requireAuth(request);
    } catch (error) {
      return Errors.unauthorized(error instanceof Error ? error.message : undefined);
    }

    const user = await User.findById(authed.userId);
    if (!user) return Errors.notFound("User");

    user.status = UserStatus.DELETED;
    user.deletedAt = new Date();
    await user.save();

    // Without this the account is flagged deleted but existing refresh tokens
    // would still mint access tokens until they expire.
    await revokeAllRefreshTokensForUser(user._id);

    logger.info("account_deleted", { userId: user._id.toString() });
    return NextResponse.json({ message: "Account deleted." });
  } catch (error) {
    return fail("Account deletion", error);
  }
}
