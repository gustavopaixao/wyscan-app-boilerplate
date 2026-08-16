import { describe, expect, it } from "vitest";
import {
  maskEmailForDisplay,
  publicDisplayLabel,
  sanitizePublicText,
} from "./sanitizePublicText.js";

describe("sanitizePublicText", () => {
  it("strips HTML tags", () => {
    expect(sanitizePublicText("<b>Hello</b> world")).toBe("Hello world");
  });

  it("returns null for empty after strip", () => {
    expect(sanitizePublicText("<script></script>")).toBeNull();
  });
});

describe("maskEmailForDisplay", () => {
  it("masks local part", () => {
    expect(maskEmailForDisplay("alice@example.com")).toBe("a***e@example.com");
  });
});

describe("publicDisplayLabel", () => {
  it("prefers display name", () => {
    expect(publicDisplayLabel("Alice", "uid")).toBe("Alice");
  });

  it("never leaks any part of an email to co-members — neutral fallback only", () => {
    // Regression: the old fallback returned a masked email (`b***b@gmail.com`),
    // exposing the domain to other pool members. Security audit 2026-08-10 (L2).
    const label = publicDisplayLabel("", "abcdef012345");
    expect(label).toBe("Player 2345");
    expect(label).not.toContain("@");
  });

  it("degrades to bare 'Player' when there is no id to suffix", () => {
    expect(publicDisplayLabel("", "")).toBe("Player");
  });
});
