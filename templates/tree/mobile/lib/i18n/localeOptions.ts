import type { MessageKey } from "./bundles";
import {
  LOCALE_PREFERENCES,
  type LocalePreference,
} from "./localePreference";

export const LOCALE_OPTION_KEYS: Record<LocalePreference, MessageKey> = {
  system: "language_option_system",
  en: "language_option_en",
  "pt-BR": "language_option_pt_BR",
  "pt-PT": "language_option_pt_PT",
  es: "language_option_es",
  fr: "language_option_fr",
  de: "language_option_de",
  it: "language_option_it",
  nl: "language_option_nl",
};

export function sortedLocalePreferences(
  t: (key: MessageKey) => string,
): LocalePreference[] {
  return [...LOCALE_PREFERENCES].sort((a, b) =>
    t(LOCALE_OPTION_KEYS[a]).localeCompare(t(LOCALE_OPTION_KEYS[b])),
  );
}
