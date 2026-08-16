import { describe, expect, it, vi } from "vitest";

// localePreference.ts (transitively imported) pulls in expo-secure-store.
vi.mock("expo-secure-store", () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => undefined,
}));

import {
  DEFAULT_PREFERRED_LANGUAGE,
  normalizePreferredLanguage,
  SUPPORTED_PREFERRED_LANGUAGES,
} from "./normalizePreferredLanguage";

describe("normalizePreferredLanguage", () => {
  it("passes through each supported locale", () => {
    for (const locale of SUPPORTED_PREFERRED_LANGUAGES) {
      expect(normalizePreferredLanguage(locale)).toBe(locale);
    }
  });

  it("normalizes Portuguese region variants like the server", () => {
    expect(normalizePreferredLanguage("pt")).toBe("pt-BR");
    expect(normalizePreferredLanguage("pt-pt")).toBe("pt-PT");
    expect(normalizePreferredLanguage("pt_PT")).toBe("pt-PT");
    expect(normalizePreferredLanguage("PT-BR")).toBe("pt-BR");
    expect(normalizePreferredLanguage("pt-AO")).toBe("pt-BR");
  });

  it("is case-insensitive for single-segment locales", () => {
    expect(normalizePreferredLanguage("EN")).toBe("en");
    expect(normalizePreferredLanguage("Fr-FR")).toBe("fr");
    expect(normalizePreferredLanguage("es-419")).toBe("es");
  });

  it("falls back to en for the system sentinel, unknown, empty, and nullish", () => {
    expect(normalizePreferredLanguage("system")).toBe(DEFAULT_PREFERRED_LANGUAGE);
    expect(normalizePreferredLanguage("zh-CN")).toBe("en");
    expect(normalizePreferredLanguage("")).toBe("en");
    expect(normalizePreferredLanguage("   ")).toBe("en");
    expect(normalizePreferredLanguage(null)).toBe("en");
    expect(normalizePreferredLanguage(undefined)).toBe("en");
  });

  it("never includes the system sentinel in the supported list", () => {
    expect(SUPPORTED_PREFERRED_LANGUAGES).not.toContain("system");
    expect(SUPPORTED_PREFERRED_LANGUAGES).toHaveLength(8);
  });
});
