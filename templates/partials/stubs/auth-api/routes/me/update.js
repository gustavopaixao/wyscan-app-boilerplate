// Local auth implementation (standalone mode). PATCH /me
//
// Deliberately narrow: only fields a user may set about themselves. `role`,
// `status` and `email` are NOT editable here — role/status are privilege, and
// changing email would need a re-verification round trip.

import { hasNoHtmlTags } from "__NPM_SCOPE__/core-api/utils/validation";
import { Errors } from "__NPM_SCOPE__/core-api/utils/errors";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { PreferredLanguage, User } from "../../models/user.model.js";
import { requireAuth } from "../../utils/auth.js";
import { fail, readBody } from "../_shared.js";

const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .min(1, "Display name is required")
      .max(80, "Display name is too long")
      .trim()
      .refine(hasNoHtmlTags, { message: "Display name cannot contain HTML tags" })
      .optional(),
    preferredLanguage: z.enum(PreferredLanguage).nullable().optional(),
    externalPhotoUrl: z
      .string()
      .url("Photo URL must be a valid URL")
      .startsWith("https://", "Photo URL must use https")
      .nullable()
      .optional(),
    city: z.string().max(120).trim().nullable().optional(),
    country: z.string().length(2, "Country must be a 2-letter ISO code").nullable().optional(),
  })
  .strict();

export async function PATCH(request) {
  try {
    let authed;
    try {
      authed = await requireAuth(request);
    } catch (error) {
      return Errors.unauthorized(error instanceof Error ? error.message : undefined);
    }

    const { data, response } = await readBody(request, updateProfileSchema);
    if (response) return response;

    const user = await User.findById(authed.userId);
    if (!user) return Errors.notFound("User");

    if (data.displayName !== undefined) user.displayName = data.displayName;
    if (data.preferredLanguage !== undefined) user.preferredLanguage = data.preferredLanguage;
    if (data.externalPhotoUrl !== undefined) user.externalPhotoUrl = data.externalPhotoUrl;
    if (data.city !== undefined) user.location.city = data.city;
    if (data.country !== undefined) user.location.country = data.country;

    await user.save();
    return NextResponse.json({ user: user.toPublicJSON() });
  } catch (error) {
    return fail("Profile update", error);
  }
}
