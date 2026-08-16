#!/usr/bin/env node
/**
 * Verify mobile locale bundles stay in lockstep.
 *
 * Checks, using locales/en.json as the reference:
 *   1. No duplicate keys — scanned from raw text, since JSON.parse silently
 *      collapses them and the last value wins.
 *   2. Identical key sets across every supported locale.
 *   3. Identical key order, so translation diffs stay reviewable.
 *
 * Exits 1 with a per-locale report when anything drifts.
 *
 * Usage:
 *   node mobile/scripts/check-locales.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = path.join(mobileRoot, "locales");

/** Reference locale first; the rest are compared against it. */
export const LOCALES = ["en", "pt-BR", "pt-PT", "es", "fr", "de", "it", "nl"];
const REFERENCE = LOCALES[0];

/**
 * Top-level keys in source order, including duplicates.
 * The bundles are flat string maps, so a line-oriented scan is sufficient and
 * avoids pulling in a JSON parser that would discard the duplicates we want.
 */
export function readKeysInOrder(text) {
  // Exactly one tab or exactly two spaces of indent — anything deeper is a
  // nested key and must not be counted as a top-level entry.
  const topLevelKey = /^(?:\t|  )"((?:[^"\\]|\\.)*)"\s*:/;
  const keys = [];
  for (const line of text.split("\n")) {
    const match = line.match(topLevelKey);
    if (match) {
      keys.push(match[1]);
    }
  }
  return keys;
}

export function findDuplicates(keys) {
  const seen = new Set();
  const duplicates = new Set();
  for (const key of keys) {
    if (seen.has(key)) {
      duplicates.add(key);
    }
    seen.add(key);
  }
  return [...duplicates];
}

export function localePath(locale) {
  return path.join(localesDir, `${locale}.json`);
}

/**
 * @returns {{ locale: string, problems: string[] }[]} one entry per locale with problems
 */
export function checkLocales() {
  const bundles = new Map();

  for (const locale of LOCALES) {
    const file = localePath(locale);
    if (!fs.existsSync(file)) {
      bundles.set(locale, { missingFile: true });
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    bundles.set(locale, { keys: readKeysInOrder(text) });
  }

  const referenceKeys = bundles.get(REFERENCE)?.keys ?? [];
  const referenceSet = new Set(referenceKeys);
  const failures = [];

  for (const locale of LOCALES) {
    const bundle = bundles.get(locale);
    const problems = [];

    if (bundle.missingFile) {
      failures.push({ locale, problems: [`locales/${locale}.json is missing`] });
      continue;
    }

    const duplicates = findDuplicates(bundle.keys);
    if (duplicates.length > 0) {
      problems.push(`${duplicates.length} duplicate key(s): ${duplicates.join(", ")}`);
    }

    if (locale !== REFERENCE) {
      const localeSet = new Set(bundle.keys);
      const missing = referenceKeys.filter((key) => !localeSet.has(key));
      const extra = bundle.keys.filter((key) => !referenceSet.has(key));

      if (missing.length > 0) {
        problems.push(`${missing.length} key(s) missing vs ${REFERENCE}: ${missing.join(", ")}`);
      }
      if (extra.length > 0) {
        problems.push(`${extra.length} key(s) not in ${REFERENCE}: ${extra.join(", ")}`);
      }
      if (missing.length === 0 && extra.length === 0) {
        const firstDivergence = bundle.keys.findIndex((key, i) => key !== referenceKeys[i]);
        if (firstDivergence !== -1) {
          problems.push(
            `key order differs from ${REFERENCE} at position ${firstDivergence}: ` +
              `found "${bundle.keys[firstDivergence]}", expected "${referenceKeys[firstDivergence]}"`,
          );
        }
      }
    }

    if (problems.length > 0) {
      failures.push({ locale, problems });
    }
  }

  return failures;
}

/** Only run the CLI when invoked directly, so tests can import the helpers. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = checkLocales();

  if (failures.length > 0) {
    console.error("Locale check failed:");
    for (const { locale, problems } of failures) {
      console.error(`  - ${locale}:`);
      for (const problem of problems) {
        console.error(`      ${problem}`);
      }
    }
    process.exit(1);
  }

  const keyCount = readKeysInOrder(fs.readFileSync(localePath(REFERENCE), "utf8")).length;
  console.log(`Locale check OK: ${LOCALES.length} locales, ${keyCount} keys, identical sets and order.`);
}
