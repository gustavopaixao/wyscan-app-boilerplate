// STUB — replace with __NPM_SCOPE__/core-react-native when you adopt the
// shared packages.

export interface I18n {
  readonly locale: string;
  setLocale(next: string): void;
  availableLocales(): string[];
  t(key: string, params?: Record<string, unknown>): string;
}

export declare function createI18n(options: {
  bundles: Record<string, Record<string, string>>;
  defaultLocale?: string;
}): I18n;
