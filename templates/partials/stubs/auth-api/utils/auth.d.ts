// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api request-guard surface.

import type { Types } from "mongoose";
import type { NextRequest } from "next/server.js";
import type { UserRoleType } from "../models/user.model.js";

export interface AuthenticatedUser {
  userId: Types.ObjectId;
  email: string;
  displayName: string;
  role: UserRoleType;
}

export declare function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser>;
export declare function requireAuth(request: NextRequest): Promise<AuthenticatedUser>;
export declare function getOptionalUser(request: NextRequest): Promise<AuthenticatedUser | null>;
export declare function requireRole(
  request: NextRequest,
  ...roles: UserRoleType[]
): Promise<AuthenticatedUser>;
export declare function hasPermission(
  user: AuthenticatedUser,
  resourceOwnerId: Types.ObjectId | string,
): boolean;
export declare function generateVerificationCode(): string;
