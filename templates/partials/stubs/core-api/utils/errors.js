// STUB — replace with __NPM_SCOPE__/core-api when you adopt the shared packages.
// See docs/shared-packages.md.

import { NextResponse } from "next/server.js";

/** Error carrying an HTTP status and a stable machine-readable code. */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const json = (status, code, message) => NextResponse.json({ code, message }, { status });

/** Convert any thrown value into a JSON error response. */
export function handleError(error) {
  if (error instanceof AppError) {
    return json(error.statusCode, error.code, error.message);
  }
  return json(500, "INTERNAL_ERROR", "Internal server error");
}

/** Coarse-grained helpers mirroring the shared package's surface. */
export const Errors = {
  badRequest: (message = "Bad request") => json(400, "BAD_REQUEST", message),
  unauthorized: (message = "Unauthorized") => json(401, "UNAUTHORIZED", message),
  forbidden: (message = "Forbidden") => json(403, "FORBIDDEN", message),
  notFound: (what = "Resource") => json(404, "NOT_FOUND", `${what} not found`),
  conflict: (message = "Conflict") => json(409, "CONFLICT", message),
  internal: (message = "Internal server error") => json(500, "INTERNAL_ERROR", message),
};
