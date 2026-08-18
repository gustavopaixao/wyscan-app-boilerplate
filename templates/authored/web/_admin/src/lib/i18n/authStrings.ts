/**
 * Auth copy for the admin console.
 *
 * Separate from `strings.ts` (which is machine-extracted from the reference and
 * must not be hand-edited) but the same flat-key convention, so surfaces never
 * hard-code copy inline. The admin app is intentionally EN-only.
 */
/** Short constant so the entry below is a fixed length for any project name. */
const APP_NAME = "__PROJECT_NAME__";

export const authStrings = {
  auth_sign_in_title: "Admin sign in",
  auth_sign_in_subtitle: `${APP_NAME} administration`,
  auth_sign_in_submit: "Sign in",
  auth_email_label: "Email",
  auth_password_label: "Password",
  auth_sign_out: "Sign out",
  auth_error_generic: "Something went wrong. Please try again.",
  auth_error_invalid_credentials: "Invalid email or password.",
  auth_error_network: "Could not reach the server. Check your connection.",
  auth_error_forbidden: "This account does not have admin access.",
  auth_loading: "Loading…",
} as const;

export type AuthStringKey = keyof typeof authStrings;

export function ta(key: AuthStringKey): string {
  return authStrings[key];
}
