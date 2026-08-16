/**
 * i18n engine instance (0207).
 *
 * The app-agnostic engine now lives in `__NPM_SCOPE__/core-react-native`; here
 * we inject the __PROJECT_NAME__ bundles, brand-name resolver, preference key, and the
 * supported preference set. Strings/bundles + `MessageKey` stay in-app.
 */
import { createI18n } from "__NPM_SCOPE__/core-react-native";
import { brandNameForLocale } from "../brand/brandName";
import { type MessageKey, resolveBundle } from "./bundles";
import { LOCALE_PREFERENCES } from "./localePreference";

export const i18n = createI18n<MessageKey>({
  resolveBundle,
  fallbackTag: "en",
  brandForLocale: brandNameForLocale,
  localePreferenceKey: "__PROJECT_SLUG__.localePreference",
  supportedPreferences: LOCALE_PREFERENCES,
});

export const {
  LocaleProvider,
  useLocale: useLocaleRaw,
  useStrings,
  formatDate,
  formatDateTime,
  formatShortDateTime,
  normalizeLocaleTag,
} = i18n;
