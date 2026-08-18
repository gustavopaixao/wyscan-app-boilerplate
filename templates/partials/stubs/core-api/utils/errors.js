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

/**
 * `Object.setPrototypeOf` after `super()` keeps `instanceof` working when this
 * is transpiled down — without it every subclass collapses to AppError.
 */
export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
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
