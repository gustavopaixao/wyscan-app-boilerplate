/**
 * i18n barrel.
 *
 * The engine (interpolation, provider, `useStrings`, Intl formatting, locale
 * resolution + persistence) lives in `__NPM_SCOPE__/core-react-native` and is
 * instantiated in `./i18n/engine` with the __PROJECT_NAME__ bundles + brand +
 * preference config. Bundles, `MessageKey` and `LocalePreference` stay in-app.
 */
export type { MessageKey } from "./i18n/bundles";
export { resolveBundle } from "./i18n/bundles";
export { useStrings } from "./i18n/engine";
export { LocaleProvider, useLocale } from "./i18n/LocaleContext";
export type { LocalePreference } from "./i18n/localePreference";
