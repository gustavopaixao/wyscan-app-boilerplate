// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api token-store surface.

import type { Types } from "mongoose";

type Id = Types.ObjectId | string;

export declare function saveRefreshToken(
  userId: Id,
  token: string,
  expiresAt: Date,
): Promise<void>;
export declare function revokeRefreshToken(token: string, userId: Id): Promise<boolean>;
export declare function revokeAllRefreshTokensForUser(userId: Id): Promise<number>;
export declare function isRefreshTokenValid(token: string, userId: Id): Promise<boolean>;

export declare function saveVerificationCode(
  userId: Id,
  code: string,
  expiresAt: Date,
): Promise<void>;
export declare function savePasswordResetCode(
  userId: Id,
  code: string,
  expiresAt: Date,
): Promise<void>;
export declare function saveAccountDeletionCode(
  userId: Id,
  code: string,
  expiresAt: Date,
): Promise<void>;

export declare function verifyCode(userId: Id, code: string): Promise<boolean>;
export declare function verifyPasswordResetCode(userId: Id, code: string): Promise<boolean>;
export declare function verifyAccountDeletionCode(userId: Id, code: string): Promise<boolean>;

export declare function cleanupExpiredTokens(): Promise<number>;
