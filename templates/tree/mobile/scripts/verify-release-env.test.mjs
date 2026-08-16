import { describe, expect, it } from "vitest";
import { evaluateReleaseEnv, parseDotenv } from "./verify-release-env.mjs";

describe("parseDotenv", () => {
  it("matches Fastfile load_dotenv: skips blanks and comments, strips one quote layer", () => {
    const parsed = parseDotenv(
      [
        "",
        "# a comment",
        "EXPO_PUBLIC_API_URL=https://__API_DOMAIN__",
        '  QUOTED="value"  ',
        "EMPTY=",
        "=novalue",
        "WITH_EQUALS=a=b",
      ].join("\n"),
    );

    expect(parsed).toEqual({
      EXPO_PUBLIC_API_URL: "https://__API_DOMAIN__",
      QUOTED: "value",
      EMPTY: "",
      WITH_EQUALS: "a=b",
    });
    expect(parsed["# a comment"]).toBeUndefined();
  });
});

describe("evaluateReleaseEnv", () => {
  it("passes on an empty environment (no fastlane/.env present)", () => {
    const { violations, warnings } = evaluateReleaseEnv({}, {});
    expect(violations).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("fails when the purchase simulator key is present at all, even empty", () => {
    const { violations } = evaluateReleaseEnv(
      { EXPO_PUBLIC_CREDITS_SIMULATE_PURCHASE: "" },
      {},
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].key).toBe("EXPO_PUBLIC_CREDITS_SIMULATE_PURCHASE");
  });

  it("fails on non-empty RevenueCat keys without the opt-in", () => {
    const { violations } = evaluateReleaseEnv(
      {
        EXPO_PUBLIC_REVENUECAT_IOS_KEY: "appl_abc123",
        EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "goog_abc123",
      },
      {},
    );
    expect(violations.map((v) => v.key)).toEqual([
      "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
      "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
    ]);
  });

  it("allows RevenueCat keys with ALLOW_REVENUECAT_KEYS=1 (credits go-live)", () => {
    const { violations } = evaluateReleaseEnv(
      {
        EXPO_PUBLIC_REVENUECAT_IOS_KEY: "appl_abc123",
        ALLOW_REVENUECAT_KEYS: "1",
      },
      {},
    );
    expect(violations).toEqual([]);
  });

  it("ignores blank RevenueCat keys, which is the normal credits-off state", () => {
    const { violations, warnings } = evaluateReleaseEnv(
      {
        EXPO_PUBLIC_REVENUECAT_IOS_KEY: "",
        EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "   ",
      },
      {},
    );
    expect(violations).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("warns but does not fail on the client-gate bypass and dev attestation token", () => {
    const { violations, warnings } = evaluateReleaseEnv(
      {
        EXPO_PUBLIC_CLIENT_GATE_BYPASS: "true",
        EXPO_PUBLIC_ATTESTATION_DEV_TOKEN: "dev-token",
      },
      {},
    );
    // Hard-failing these would trade a documented TestFlight safety net
    // (lib/api/clientGate.ts) for a plausible auth outage.
    expect(violations).toEqual([]);
    expect(warnings.map((w) => w.key)).toEqual([
      "EXPO_PUBLIC_CLIENT_GATE_BYPASS",
      "EXPO_PUBLIC_ATTESTATION_DEV_TOKEN",
    ]);
  });

  it("warns on a non-HTTPS API url", () => {
    const { warnings } = evaluateReleaseEnv(
      { EXPO_PUBLIC_API_URL: "http://__DEV_HOST__:8080" },
      {},
    );
    expect(warnings.map((w) => w.key)).toEqual(["EXPO_PUBLIC_API_URL"]);
  });

  it("accepts an HTTPS API url", () => {
    const { warnings } = evaluateReleaseEnv(
      { EXPO_PUBLIC_API_URL: "https://__API_DOMAIN__" },
      {},
    );
    expect(warnings).toEqual([]);
  });

  it("lets the process environment win over the file, mirroring ENV[key] ||= value", () => {
    // The file is clean but the shell exports the simulator — the bundle would
    // still see it, so the guard must too.
    const { violations } = evaluateReleaseEnv(
      {},
      { EXPO_PUBLIC_CREDITS_SIMULATE_PURCHASE: "1" },
    );
    expect(violations).toHaveLength(1);

    // And the opt-in works from the shell as well as the file.
    const opted = evaluateReleaseEnv(
      { EXPO_PUBLIC_REVENUECAT_IOS_KEY: "appl_abc123" },
      { ALLOW_REVENUECAT_KEYS: "1" },
    );
    expect(opted.violations).toEqual([]);
  });

  it("does not treat ALLOW_REVENUECAT_KEYS=0 or empty as an opt-in", () => {
    for (const value of ["0", "", "true"]) {
      const { violations } = evaluateReleaseEnv(
        {
          EXPO_PUBLIC_REVENUECAT_IOS_KEY: "appl_abc123",
          ALLOW_REVENUECAT_KEYS: value,
        },
        {},
      );
      expect(violations, `ALLOW_REVENUECAT_KEYS=${value}`).toHaveLength(1);
    }
  });
});
