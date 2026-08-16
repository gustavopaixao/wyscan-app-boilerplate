// STUB — replace with __NPM_SCOPE__/core-react-native when you adopt the
// shared packages. See docs/shared-packages.md.

/**
 * Minimal i18n engine: bundle lookup with a default-locale fallback and
 * {placeholder} interpolation. The shared package adds pluralisation,
 * date/number formatting and locale negotiation.
 *
 * @param {{ bundles: Record<string, Record<string, string>>, defaultLocale?: string }} options
 */
export function createI18n(options) {
  const { bundles = {}, defaultLocale = "en" } = options ?? {};
  let locale = defaultLocale;

  const lookup = (key) =>
    bundles[locale]?.[key] ?? bundles[defaultLocale]?.[key] ?? key;

  return {
    get locale() {
      return locale;
    },
    setLocale(next) {
      if (bundles[next]) locale = next;
    },
    availableLocales: () => Object.keys(bundles),
    t(key, params) {
      const template = lookup(key);
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (m, name) =>
        params[name] !== undefined ? String(params[name]) : m,
      );
    },
  };
}
