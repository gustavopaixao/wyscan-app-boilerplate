// STUB — replace with __NPM_SCOPE__/core-react-native when you adopt the
// shared packages.

import type { ReactNode } from "react";

export interface CreateI18nOptions<K extends string = string> {
  resolveBundle: (tag: string | undefined) => Record<K, string>;
  fallbackTag?: string;
  brandForLocale?: (tag: string) => string;
  localePreferenceKey?: string;
  supportedPreferences?: readonly string[];
}

export interface I18n<K extends string = string> {
  LocaleProvider: (props: { children?: ReactNode; initialLocale?: string }) => JSX.Element;
  useLocale: () => {
    localePreference: string;
    resolvedLocaleTag: string;
    setLocalePreference: (preference: string) => Promise<void>;
    hydrated: boolean;
    supportedPreferences: readonly string[];
    brand?: string;
  };
  useStrings: () => {
    t: (key: K, params?: Record<string, unknown>) => string;
    locale: string;
  };
  normalizeLocaleTag: (tag: string | undefined) => string;
  formatDate: (value: Date | string | number, locale?: string) => string;
  formatDateTime: (value: Date | string | number, locale?: string) => string;
  formatShortDateTime: (value: Date | string | number, locale?: string) => string;
}

export declare function createI18n<K extends string = string>(
  options: CreateI18nOptions<K>,
): I18n<K>;
