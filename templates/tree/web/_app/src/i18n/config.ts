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
