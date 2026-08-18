// Local auth implementation (standalone mode). Mirrors the shared
// __NPM_SCOPE__/auth-api route-handler surface.

import type { NextRequest, NextResponse } from "next/server.js";

export declare function DELETE(request: NextRequest): Promise<NextResponse>;
