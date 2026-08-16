import { stripHtmlTags } from "__NPM_SCOPE__/core-api/utils/validation";

/** Strip HTML from user-facing text on API responses (defense in depth). */
export function sanitizePublicText(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const cleaned = stripHtmlTags(value).trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function sanitizePublicTextRequired(value: string): string {
  return stripHtmlTags(value).trim();
}

/**
 * Mask an email for display back to the ACCOUNT OWNER (e.g. the account-deletion
 * confirmation response). It still exposes the full domain and the first/last
 * local char, so it must never appear in lists other users can see — use
 * {@link publicDisplayLabel} for member/leaderboard surfaces instead.
 */
export function maskEmailForDisplay(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "Player";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.length === 0 || domain.length === 0) return "Player";
  const maskedLocal =
    local.length <= 2
      ? `${local[0] ?? ""}*`
      : `${local[0]}***${local.at(-1) ?? ""}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Neutral, member-safe label for a user with no display name. Keeps nameless
 * users distinguishable in a leaderboard via a short id suffix without exposing
 * the full id — and never any part of their email.
 */
export function neutralDisplayLabel(fallbackId: string): string {
  const short = fallbackId.trim().slice(-4);
  return short.length > 0 ? `Player ${short}` : "Player";
}

/**
 * Display label for surfaces visible to OTHER users (pool/league member lists,
 * leaderboards). Deliberately takes no email: security audit 2026-08-10 (L2)
 * found the old email fallback leaked a user's domain to co-members. When a
 * user has no display name they get a neutral {@link neutralDisplayLabel}.
 */
export function publicDisplayLabel(
  displayName: string | undefined,
  fallbackId: string,
): string {
  const dn =
    typeof displayName === "string"
      ? sanitizePublicTextRequired(displayName)
      : "";
  if (dn.length > 0) return dn;
  return neutralDisplayLabel(fallbackId);
}
