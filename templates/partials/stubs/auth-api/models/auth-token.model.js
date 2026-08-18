// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api model.
//
// One collection backs four short-lived secrets: refresh tokens, email
// verification codes, password-reset codes and account-deletion codes. `token`
// always holds a bcrypt HASH, never the value handed to the client.

import mongoose, { Schema } from "mongoose";

export const TokenType = {
  REFRESH: "refresh",
  VERIFICATION: "verification",
  PASSWORD_RESET: "passwordReset",
  ACCOUNT_DELETION: "accountDeletion",
};

const AuthTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: Object.values(TokenType), required: true },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "auth_tokens" },
);

AuthTokenSchema.index({ userId: 1, type: 1 });
AuthTokenSchema.index({ token: 1, used: 1 });
AuthTokenSchema.index({ userId: 1, type: 1, expiresAt: -1 });

// TTL index — MongoDB reaps expired rows on its own (~every 60s), so a stale
// code cannot be replayed even if the application-level checks are bypassed.
AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthToken =
  mongoose.models.AuthToken || mongoose.model("AuthToken", AuthTokenSchema);
