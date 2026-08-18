// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api authorization surface.

import type { Types } from "mongoose";
import type { NextRequest, NextResponse } from "next/server.js";
import type { AuthenticatedUser } from "./auth.js";

/** Returns the user, or the error response to return verbatim. */
export declare function requireModerator(
  request: NextRequest,
): Promise<AuthenticatedUser | NextResponse>;
export declare function requireAdmin(
  request: NextRequest,
): Promise<AuthenticatedUser | NextResponse>;

export declare function logAdminAction(
  userId: Types.ObjectId,
  action: string,
  resource: string,
  resourceId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void>;
