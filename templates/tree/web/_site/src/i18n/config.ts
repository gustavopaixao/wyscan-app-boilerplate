export const locales = [
  "en",
  "pt-BR",
  "pt-PT",
  "es",
  "fr",
  "de",
  "it",
  "nl",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  "pt-PT": "Português (Portugal)",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  nl: "Nederlands",
};

export const localeShortCodes: Record<Locale, string> = {
  en: "EN",
  "pt-BR": "PT-BR",
  "pt-PT": "PT-PT",
  es: "ES",
  fr: "FR",
  de: "DE",
  it: "IT",
  nl: "NL",
};

/** Map extended locales to store badge artwork (falls back to en). */
export function resolveStoreBadgeLocale(locale: string): Locale {
  if (locale in localeNames) {
    return locale as Locale;
  }
  const short = locale.split("-")[0];
  if (short === "pt") return "pt-BR";
  return "en";
}
