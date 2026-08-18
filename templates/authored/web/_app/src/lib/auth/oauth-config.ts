/**
 * OAuth client configuration for the browser.
 *
 * Client IDs are public by design (they appear in the redirect URL), which is
 * why these are NEXT_PUBLIC_. The corresponding secrets stay on the API.
 *
 * A provider with no client ID is simply not offered: `OAuthButtons` renders
 * nothing rather than showing a button that fails on click. That is what lets a
 * freshly generated project run before any OAuth setup is done.
 */

export const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? "";
export const appleRedirectUri =
  process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ?? "";

export const isGoogleEnabled = googleClientId.length > 0;
/** Apple additionally needs a redirect URI registered in the developer portal. */
export const isAppleEnabled =
  appleClientId.length > 0 && appleRedirectUri.length > 0;
export const isOAuthEnabled = isGoogleEnabled || isAppleEnabled;
