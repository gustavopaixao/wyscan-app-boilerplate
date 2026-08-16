import { LOCALE_PREFERENCES, type LocalePreference } from "./localePreference";

/**
 * Supported preferred-language locales (the app locales minus the `"system"`
 * sentinel). Mirrors the server `SUPPORTED_PUSH_LOCALES`
 * (api/src/notifications/i18n/joinRequest.ts) so the value persisted on the
 * profile always matches what the API accepts.
 */
export const SUPPORTED_PREFERRED_LANGUAGES = LOCALE_PREFERENCES.filter(
  (l): l is Exclude<LocalePreference, "system"> => l !== "system",
);

export type SupportedPreferredLanguage =
  (typeof SUPPORTED_PREFERRED_LANGUAGES)[number];

export const DEFAULT_PREFERRED_LANGUAGE: SupportedPreferredLanguage = "en";

/**
 * Normalizes an arbitrary BCP-47-ish tag (or the `"system"` sentinel) to one of
 * the supported preferred-language locales. Mirrors the server
 * `normalizePushLocale` rules exactly:
 * - Case-insensitive; region casing normalized (e.g. `pt-br` -> `pt-BR`).
 * - Bare `pt` and any `pt-*` (except `pt-PT`) -> `pt-BR`; `pt-PT` -> `pt-PT`.
 * - Unknown / empty / `"system"` -> `en`.
 */
export function normalizePreferredLanguage(
  tag?: string | null,
): SupportedPreferredLanguage {
  if (!tag) return DEFAULT_PREFERRED_LANGUAGE;
  const raw = tag.trim().toLowerCase();
  if (raw.length === 0) return DEFAULT_PREFERRED_LANGUAGE;

  const [langPart, regionPart] = raw.split(/[-_]/);
  const lang = langPart ?? "";

  if (lang === "pt") {
    if (regionPart === "pt") return "pt-PT";
    // Bare `pt` and any other pt-* region default to pt-BR.
    return "pt-BR";
  }

  // Single-segment supported locales (en, es, fr, de, it, nl).
  const direct = SUPPORTED_PREFERRED_LANGUAGES.find(
    (l) => l.toLowerCase() === lang,
  );
  if (direct) return direct;

  return DEFAULT_PREFERRED_LANGUAGE;
}
