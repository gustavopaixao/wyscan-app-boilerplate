// STUB — replace with __NPM_SCOPE__/core-api when you adopt the shared packages.
import type { NextResponse } from "next/server.js";

/** Returns a 429 carrying `Retry-After` when limited, otherwise null. */
export declare function checkRateLimit(
  key: string,
  maxEvents: number,
  windowMs: number,
): NextResponse | null;
