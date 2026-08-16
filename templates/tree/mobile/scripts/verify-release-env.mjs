#!/usr/bin/env node
/**
 * Release-env guard — refuse to produce a store build whose JS bundle carries a
 * development affordance.
 *
 * WHY THIS EXISTS
 *
 * `mobile/fastlane/Fastfile` `load_dotenv` pushes **every** key in
 * `mobile/fastlane/.env` into `ENV`, and `ENV` is what Metro inlines
 * `process.env.EXPO_PUBLIC_*` from at bundle time. The
 * `export_release_bundle_env!` allowlist only *adds* two vars — it strips
 * nothing. So anything in that file reaches a store bundle, and the only thing
 * standing between a stray line and production is somebody remembering.
 *
 * Run from `scripts/prebuild-release.sh`, which every store path funnels
 * through (`make mobile-*-beta`, `make mobile-*-release`, the Fastlane lanes).
 *
 * WHAT IS A HARD FAILURE, AND WHY ONLY THESE
 *
 * - `EXPO_PUBLIC_CREDITS_SIMULATE_PURCHASE` — arms the dev purchase simulator,
 *   which writes real `purchase` ledger rows via a dev-only API route. It can
 *   never be legitimately wanted in a store build, and the credits runbook says
 *   in as many words never to put it in this file. `__DEV__` already strips it
 *   from a release bundle (`lib/credits/purchases.ts` `shouldSimulatePurchase`),
 *   so this is defence in depth, not the only lock.
 *
 * - `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY` — a real key makes
 *   `isPurchasesAvailable()` true and the RevenueCat SDK live. The credits
 *   surfaces are still hidden by the server-side `CREDITS_ENABLED` flag, so this
 *   is not an exposure on its own; the point is that shipping live store keys
 *   should be a decision, not a leftover. Set `ALLOW_REVENUECAT_KEYS=1` for the
 *   credits go-live release and this passes deliberately.
 *
 * WHAT IS ONLY A WARNING, AND WHY
 *
 * `EXPO_PUBLIC_CLIENT_GATE_BYPASS` and `EXPO_PUBLIC_ATTESTATION_DEV_TOKEN` are
 * deliberately NOT hard failures. `Fastfile` forwards them precisely because
 * their absence broke TestFlight build 40, and `lib/api/clientGate.ts` documents
 * the bypass as a second safety net behind the runtime `catch`. Failing the
 * build on them would trade a documented, low-severity smell for a plausible
 * auth outage. They are printed so a public-release reviewer sees them.
 *
 * Usage:
 *   node mobile/scripts/verify-release-env.mjs
 *
 * Env:
 *   ALLOW_REVENUECAT_KEYS=1 — permit non-empty RevenueCat SDK keys
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIMULATE_KEY = "EXPO_PUBLIC_CREDITS_SIMULATE_PURCHASE";
const REVENUECAT_KEYS = [
  "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
];
const WARN_KEYS = [
  "EXPO_PUBLIC_CLIENT_GATE_BYPASS",
  "EXPO_PUBLIC_ATTESTATION_DEV_TOKEN",
];

/**
 * Minimal dotenv parser matching `Fastfile` `load_dotenv`: `KEY=VALUE`, blank
 * lines and `#` comments skipped, one layer of surrounding double quotes
 * stripped. Deliberately not a full dotenv implementation — it must agree with
 * the Ruby side, not with dotenv the library.
 */
export function parseDotenv(text) {
  const out = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1);
    out[key] = value.replace(/^"/, "").replace(/"$/, "");
  }
  return out;
}

/**
 * Effective build-time value of `key`.
 *
 * `Fastfile` uses `ENV[key] ||= value`, so a variable already present in the
 * process environment wins over the file. Mirror that precedence or the guard
 * checks a value the bundle will not see.
 */
function effective(key, dotenv, processEnv) {
  return processEnv[key] !== undefined ? processEnv[key] : dotenv[key];
}

function isTruthyOptIn(value) {
  return value?.trim() === "1";
}

/**
 * Pure rule evaluation. `dotenv` is the parsed `fastlane/.env`, `processEnv` the
 * ambient environment. Returns violations (hard failures) and warnings.
 */
export function evaluateReleaseEnv(dotenv = {}, processEnv = {}) {
  const violations = [];
  const warnings = [];

  // Presence, not truthiness: the runbook forbids the key appearing in
  // fastlane/.env at all, and a commented-out line never reaches parseDotenv.
  if (effective(SIMULATE_KEY, dotenv, processEnv) !== undefined) {
    violations.push({
      key: SIMULATE_KEY,
      reason:
        "arms the dev purchase simulator; it must never be set for a store build",
    });
  }

  const allowRevenueCat = isTruthyOptIn(
    effective("ALLOW_REVENUECAT_KEYS", dotenv, processEnv),
  );
  if (!allowRevenueCat) {
    for (const key of REVENUECAT_KEYS) {
      const value = effective(key, dotenv, processEnv);
      if (value !== undefined && value.trim() !== "") {
        violations.push({
          key,
          reason:
            "live RevenueCat SDK key in a store build; set ALLOW_REVENUECAT_KEYS=1 if this is the credits go-live release",
        });
      }
    }
  }

  for (const key of WARN_KEYS) {
    const value = effective(key, dotenv, processEnv);
    if (value !== undefined && value.trim() !== "") {
      warnings.push({
        key,
        reason:
          "development affordance; expected empty for a public store release (harmless for TestFlight / internal track)",
      });
    }
  }

  const apiUrl = effective("EXPO_PUBLIC_API_URL", dotenv, processEnv);
  if (apiUrl !== undefined && !apiUrl.trim().startsWith("https://")) {
    warnings.push({
      key: "EXPO_PUBLIC_API_URL",
      reason: `not HTTPS (${apiUrl.trim()}); Fastlane's require_api_url! hard-fails release lanes on this`,
    });
  }

  return { violations, warnings };
}

function main() {
  const mobileRoot = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const envPath = path.join(mobileRoot, "fastlane/.env");

  // Absent is not an error: `make mobile-prebuild` and dev builds run this
  // without ever creating fastlane/.env.
  let dotenv = {};
  if (fs.existsSync(envPath)) {
    try {
      dotenv = parseDotenv(fs.readFileSync(envPath, "utf8"));
    } catch (error) {
      // Present but unreadable means the guard cannot verify anything. Fail
      // closed rather than let a store build proceed unchecked.
      console.error(
        `Release env check FAILED — ${envPath} exists but could not be read: ${error.message}`,
      );
      process.exit(1);
    }
  }

  const { violations, warnings } = evaluateReleaseEnv(dotenv, process.env);

  for (const warning of warnings) {
    console.warn(`Release env warning: ${warning.key} — ${warning.reason}`);
  }

  if (violations.length > 0) {
    console.error("Release env check FAILED — refusing to build:");
    for (const violation of violations) {
      console.error(`  - ${violation.key}: ${violation.reason}`);
    }
    console.error(
      "\nUnset the offending key(s) in mobile/fastlane/.env (or your shell) and re-run.",
    );
    console.error(
      "Reference: docs/runbooks/stores/credits-iap-revenuecat.md (Step 5 — Env, secrets, catalog)",
    );
    process.exit(1);
  }

  console.log("Release env check OK");
}

// Only run the CLI when invoked directly, so the pure helpers stay importable
// from the unit test.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
