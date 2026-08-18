// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api model surface.

import type { Document, Model, Types } from "mongoose";

export declare const UserStatus: {
  readonly PENDING: "pending";
  readonly ACTIVE: "active";
  readonly DELETED: "deleted";
  readonly BLOCKED: "blocked";
};
export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];

export declare const UserRole: {
  readonly USER: "user";
  readonly MODERATOR: "moderator";
  readonly ADMIN: "admin";
};
export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export declare const UserPresence: {
  readonly ONLINE: "online";
  readonly OFFLINE: "offline";
  readonly AWAY: "away";
};
export type UserPresenceType = (typeof UserPresence)[keyof typeof UserPresence];

export declare const PreferredLanguage: readonly [
  "en",
  "pt-BR",
  "pt-PT",
  "es",
  "fr",
  "de",
  "it",
  "nl",
];
export type PreferredLanguageType = (typeof PreferredLanguage)[number];

export interface IAvatar {
  publicId: string;
  variants: { thumb: string; card: string; full: string };
}

export interface IPublicUser {
  id: string;
  email: string;
  displayName: string;
  status: UserStatusType;
  role: UserRoleType;
  city: string | null;
  country: string | null;
  avatar: IAvatar | null;
  photoUrl: string | null;
  preferredLanguage: PreferredLanguageType | null;
  createdAt: string | null;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  /** `select: false` — absent unless the query opts in with `.select("+passwordHash")`. */
  passwordHash: string;
  displayName: string;
  status: UserStatusType;
  role: UserRoleType;
  presence: UserPresenceType;
  location: { city: string | null; country: string | null };
  oauth: { googleId: string | null; appleId: string | null; facebookId: string | null };
  avatar: IAvatar | null;
  externalPhotoUrl: string | null;
  preferredLanguage: PreferredLanguageType | null;
  lastLoginAt: Date | null;
  lastSeenAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
  toPublicJSON(): IPublicUser;
}

export declare const User: Model<IUser>;
