// STUB — replace with __NPM_SCOPE__/core-api when you adopt the shared packages.

/** Remove HTML tags and decode the entities that matter for plain text. */
export function stripHtmlTags(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

/** Reject rather than sanitize — used by the auth schemas on `displayName`. */
export function hasNoHtmlTags(value) {
  return !/<[^>]*>/.test(value);
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}

export function isValidObjectId(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value));
}

/**
 * Minimum bar for a new password: 8+ chars with lower, upper and a digit.
 * Returns the first failure so the caller can surface a specific message.
 */
export function validatePasswordStrength(password) {
  if (password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters" };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one number" };
  }
  return { isValid: true };
}
