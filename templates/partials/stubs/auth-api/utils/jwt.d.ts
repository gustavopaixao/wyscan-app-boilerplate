// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api JWT surface.

import type { Types } from "mongoose";
import type { UserRoleType } from "../models/user.model.js";

export interface JwtPayload {
  userId: string;
  role: UserRoleType;
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

export declare function generateAccessToken(
  userId: Types.ObjectId | string,
  role: UserRoleType,
): string;
export declare function generateRefreshToken(userId: Types.ObjectId | string): string;
export declare function verifyAccessToken(token: string): JwtPayload;
export declare function verifyRefreshToken(token: string): JwtPayload;
