/**
 * Locale context (0207) — thin adapter over the extracted i18n engine.
 *
 * Re-exports the engine's `LocaleProvider` and exposes a `useLocale` typed to the
 * app's `LocalePreference` union (the engine is generic over `string`). The
 * provider only ever stores a value from `LOCALE_PREFERENCES`, so the narrowing
 * cast is sound. Existing importers (`@/lib/i18n/LocaleContext`) are unchanged.
 */
import { LocaleProvider, useLocaleRaw } from "./engine";
import type { LocalePreference } from "./localePreference";

export { LocaleProvider };

export type LocaleContextValue = {
  localePreference: LocalePreference;
  resolvedLocaleTag: string;
  setLocalePreference: (preference: LocalePreference) => Promise<void>;
  hydrated: boolean;
};

export function useLocale(): LocaleContextValue {
  return useLocaleRaw() as LocaleContextValue;
}
