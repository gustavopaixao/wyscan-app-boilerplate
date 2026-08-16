import * as SecureStore from "expo-secure-store";

/** Same storage stack as auth tokens — works without extra native modules. */
const LOCALE_PREFERENCE_KEY = "__PROJECT_SLUG__.localePreference";

export const LOCALE_PREFERENCES = [
  "system",
  "en",
  "pt-BR",
  "pt-PT",
  "es",
  "fr",
  "de",
  "it",
  "nl",
] as const;

export type LocalePreference = (typeof LOCALE_PREFERENCES)[number];

export function isLocalePreference(value: string): value is LocalePreference {
  return (LOCALE_PREFERENCES as readonly string[]).includes(value);
}

export function resolveLocaleTag(
  preference: LocalePreference,
  deviceTag: string | undefined,
): string {
  if (preference === "system") return deviceTag ?? "en";
  return preference;
}

export async function readLocalePreference(): Promise<LocalePreference> {
  try {
    const raw = await SecureStore.getItemAsync(LOCALE_PREFERENCE_KEY);
    if (raw && isLocalePreference(raw)) return raw;
  } catch {
    // ignore read errors (simulator, unavailable secure storage)
  }
  return "system";
}

export async function writeLocalePreference(value: LocalePreference): Promise<void> {
  await SecureStore.setItemAsync(LOCALE_PREFERENCE_KEY, value);
}
