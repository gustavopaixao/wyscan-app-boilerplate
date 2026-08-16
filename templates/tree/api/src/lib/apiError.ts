import { AppError, handleError } from "__NPM_SCOPE__/core-api/utils/errors";

/**
 * Stable, machine-readable API error codes.
 *
 * The accompanying `message` is an English fallback for developers/logs; clients
 * should map `code` to localized copy (all supported locales) rather than
 * displaying `message` directly. Add new codes here as error sites are migrated
 * off the generic core-api `Errors.*` helpers (which only carry coarse codes
 * like `BAD_REQUEST`).
 *
 * Only generic, domain-neutral codes live here for now — add __PROJECT_NAME__ domain
 * codes (album/sticker/etc.) alongside the features that produce them.
 *
 * NOTE: the log-agent codes (`SERVICE_NOT_CONTAINERIZED`, `LOG_AGENT_UNAVAILABLE`,
 * `DOCKER_SOCKET_DENIED`) are consumed by the admin log stream — keep them
 * stable if/when they are added here.
 */
export type ApiErrorCode =
  // Generic codes produced by core-api `Errors.*` (kept for parity/reuse).
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR"
  // Specific codes that disambiguate common cases.
  | "INVALID_ID"
  | "INVALID_JSON_BODY"
  | "INVALID_CURSOR"
  | "ACCOUNT_DELETION_FORBIDDEN"
  // Admin user removal codes.
  | "CANNOT_REMOVE_SELF"
  | "CANNOT_REMOVE_PRIVILEGED"
  | "USER_NOT_ELIGIBLE"
  | "USER_ALREADY_DELETED"
  | "EMAIL_MISMATCH"
  | "USER_NOT_FOUND"
  // Integration config codes.
  | "INVALID_ADMOB_UNIT"
  | "CLOUDINARY_NOT_CONFIGURED"
  | "FIREBASE_NOT_CONFIGURED"
  // Admin push notification platform codes.
  | "INVALID_DEEP_LINK"
  | "AUDIENCE_TOO_LARGE";

const DEFAULT_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  INVALID_ID: 400,
  INVALID_JSON_BODY: 400,
  INVALID_CURSOR: 400,
  INVALID_ADMOB_UNIT: 400,
  CLOUDINARY_NOT_CONFIGURED: 400,
  FIREBASE_NOT_CONFIGURED: 400,
  INVALID_DEEP_LINK: 400,
  AUDIENCE_TOO_LARGE: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  ACCOUNT_DELETION_FORBIDDEN: 403,
  CANNOT_REMOVE_SELF: 403,
  CANNOT_REMOVE_PRIVILEGED: 403,
  NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  CONFLICT: 409,
  USER_NOT_ELIGIBLE: 409,
  USER_ALREADY_DELETED: 409,
  EMAIL_MISMATCH: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};

/**
 * Build an error response carrying a stable `code`. Returns a response with the
 * same shape as core-api's `Errors.*` (`{ code, message, requestId }`), so it is
 * a drop-in replacement for `return Errors.badRequest(...)`-style handlers.
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  status?: number,
): ReturnType<typeof handleError> {
  return handleError(
    new AppError(message, status ?? DEFAULT_STATUS_BY_CODE[code], code),
  );
}

/**
 * Throw an `AppError` carrying a stable `code`. For use inside handlers wrapped
 * in `try/catch` that delegate to `handleError` (e.g. helper functions).
 */
export function throwApiError(
  code: ApiErrorCode,
  message: string,
  status?: number,
): never {
  throw new AppError(message, status ?? DEFAULT_STATUS_BY_CODE[code], code);
}

export { AppError };
