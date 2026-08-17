// STUB — replace with __NPM_SCOPE__/core-react-native when you adopt the
// shared packages. See docs/shared-packages.md.

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Locale engine factory.
 *
 * Mirrors the shared package's surface: it takes the app's bundle resolver and
 * brand hook, and returns a provider plus the hooks the app destructures. The
 * shared version adds persistence, device-locale negotiation and pluralisation;
 * this keeps state in memory and does simple {placeholder} interpolation.
 */
export function createI18n(options) {
  const {
    resolveBundle,
    fallbackTag = "en",
    brandForLocale,
    supportedPreferences = [],
  } = options ?? {};

  const LocaleContext = createContext({
    locale: fallbackTag,
    setLocale: () => {},
  });

  function LocaleProvider({ children, initialLocale }) {
    const [locale, setLocale] = useState(initialLocale ?? fallbackTag);
    const value = useMemo(() => ({ locale, setLocale }), [locale]);
    return React.createElement(LocaleContext.Provider, { value }, children);
  }

  /**
   * The app narrows this to its own LocaleContextValue, so the shape must
   * match: preference, resolved tag, async setter, and a hydration flag. The
   * shared package hydrates the preference from storage; here it is immediate.
   */
  function useLocale() {
    const { locale, setLocale } = useContext(LocaleContext);
    return {
      localePreference: locale,
      resolvedLocaleTag: normalizeLocaleTag(locale),
      setLocalePreference: async (preference) => {
        setLocale(preference);
      },
      hydrated: true,
      supportedPreferences,
      brand: brandForLocale ? brandForLocale(locale) : undefined,
    };
  }

  function useStrings() {
    const { locale } = useContext(LocaleContext);
    const bundle = useMemo(
      () => resolveBundle?.(locale) ?? resolveBundle?.(fallbackTag) ?? {},
      [locale],
    );

    const t = useCallback(
      (key, params) => {
        const template = bundle[key] ?? key;
        if (!params) return template;
        return String(template).replace(/\{(\w+)\}/g, (m, name) =>
          params[name] !== undefined ? String(params[name]) : m,
        );
      },
      [bundle],
    );

    return { t, locale };
  }

  function normalizeLocaleTag(tag) {
    if (!tag) return fallbackTag;
    const [lang, region] = String(tag).replace("_", "-").split("-");
    return region ? `${lang.toLowerCase()}-${region.toUpperCase()}` : lang.toLowerCase();
  }

  const fmt = (opts) => (value, locale) =>
    new Intl.DateTimeFormat(locale ?? fallbackTag, opts).format(
      value instanceof Date ? value : new Date(value),
    );

  return {
    LocaleProvider,
    useLocale,
    useStrings,
    normalizeLocaleTag,
    formatDate: fmt({ dateStyle: "medium" }),
    formatDateTime: fmt({ dateStyle: "medium", timeStyle: "short" }),
    formatShortDateTime: fmt({ dateStyle: "short", timeStyle: "short" }),
  };
}
