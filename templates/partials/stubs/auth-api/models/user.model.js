// Local auth implementation (standalone mode). The shared __NPM_SCOPE__/auth-api
// package ships the same model; this is a lean port that keeps the wire contract
// of `toPublicJSON()` identical so graduating to the shared package is a
// dependency swap, not a data migration.

import bcrypt from "bcryptjs";
import mongoose, { Schema } from "mongoose";

export const UserStatus = {
  PENDING: "pending",
  ACTIVE: "active",
  DELETED: "deleted",
  BLOCKED: "blocked",
};

export const UserRole = {
  USER: "user",
  MODERATOR: "moderator",
  ADMIN: "admin",
};

export const UserPresence = {
  ONLINE: "online",
  OFFLINE: "offline",
  AWAY: "away",
};

/** Locales the generated apps ship translations for. */
export const PreferredLanguage = ["en", "pt-BR", "pt-PT", "es", "fr", "de", "it", "nl"];

const LocationSchema = new Schema(
  {
    city: { type: String, default: null },
    country: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || v.length === 2,
        message: "Country code must be 2 characters (ISO 3166-1 alpha-2)",
      },
    },
  },
  { _id: false },
);

const AvatarSchema = new Schema(
  {
    publicId: { type: String, required: true },
    variants: {
      type: new Schema(
        {
          thumb: { type: String, required: true },
          card: { type: String, required: true },
          full: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
  },
  { _id: false },
);

const OAuthSchema = new Schema(
  {
    googleId: { type: String, default: null },
    appleId: { type: String, default: null },
    facebookId: { type: String, default: null },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    // Never returned by a plain find(); callers that need it must .select("+passwordHash").
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
    presence: { type: String, enum: Object.values(UserPresence), default: UserPresence.OFFLINE },
    location: { type: LocationSchema, default: () => ({}) },
    oauth: { type: OAuthSchema, default: () => ({}) },
    avatar: { type: AvatarSchema, default: null },
    externalPhotoUrl: { type: String, default: null },
    preferredLanguage: { type: String, enum: [...PreferredLanguage, null], default: null },
    lastLoginAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "users" },
);

UserSchema.index({ status: 1, createdAt: -1 });
UserSchema.index({ role: 1 });

// Unique per provider, but only for rows that actually carry an id — a partial
// filter, because a plain unique index would collide on every `null`.
for (const field of ["googleId", "appleId", "facebookId"]) {
  UserSchema.index(
    { [`oauth.${field}`]: 1 },
    { unique: true, partialFilterExpression: { [`oauth.${field}`]: { $ne: null } } },
  );
}

UserSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

UserSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    // `id` as a string, not `_id` — the mobile and web clients both expect it.
    id: this._id.toString(),
    email: this.email,
    displayName: this.displayName,
    status: this.status,
    role: this.role,
    city: this.location?.city || null,
    country: this.location?.country || null,
    avatar: this.avatar || null,
    photoUrl: this.externalPhotoUrl || this.avatar?.variants?.card || null,
    preferredLanguage: this.preferredLanguage ?? null,
    createdAt: this.createdAt?.toISOString() || null,
  };
};

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
