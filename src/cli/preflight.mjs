/**
 * Can `--wyscan local` actually work here?
 *
 * `local` mode links into a checkout that must sit BESIDE the generated project.
 * Nothing used to verify that: the shared-packages question probed
 * `process.cwd()` rather than the target directory, so running the CLI one level
 * away from the usual layout made it recommend `local` by finding a checkout it
 * was not about to link to. Generation then "succeeded" and `pnpm install` died
 * with a raw `ERR_PNPM_LINKED_PKG_DIR_NOT_FOUND`, after the tree had been
 * written and committed, with an exit code of 0.
 *
 * So this module answers the question once, against the real path, and is used
 * both to pick the prompt default and to refuse before anything is written.
 *
 * The filesystem half only. The path arithmetic is `ecosystemPathFor` in
 * `src/config/derive.mjs`, which stays I/O-free so it can be unit-tested.
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { ecosystemPathFor } from "../config/derive.mjs";
import { colors as c } from "./prompt.mjs";

/**
 * How far up to look for a checkout that is merely in the wrong place.
 *
 * Naming a near miss is the whole point — "not found" sends someone cloning a
 * second copy of a repo they already have. Four levels covers the usual
 * mistakes (generating inside a project, or inside one extra folder) without
 * wandering off toward `/`.
 */
const SEARCH_DEPTH = 4;

/**
 * @returns {{ expected: string, found: string | null, levelsUp: number }}
 *   `found` is a checkout somewhere above the expected location; `levelsUp` is
 *   how far above (1 means the expected directory itself).
 */
export function findEcosystem(targetDir, ecosystemDir = "WyscanDev") {
  const expected = ecosystemPathFor(targetDir, ecosystemDir);
  if (existsSync(expected)) return { expected, found: expected, levelsUp: 1 };

  let dir = resolve(targetDir, "..");
  for (let levelsUp = 1; levelsUp <= SEARCH_DEPTH; levelsUp += 1) {
    const parent = dirname(dir);
    if (parent === dir) break; // hit the filesystem root
    dir = parent;
    const candidate = join(dir, ecosystemDir, "Packages");
    if (existsSync(candidate)) {
      return { expected, found: candidate, levelsUp: levelsUp + 1 };
    }
  }

  return { expected, found: null, levelsUp: 0 };
}

/** True when the checkout is where `local` mode's links will look for it. */
export function ecosystemIsUsable(targetDir, ecosystemDir = "WyscanDev") {
  return existsSync(ecosystemPathFor(targetDir, ecosystemDir));
}

/**
 * The nearest ancestor that looks like a generated project, or null.
 *
 * Generating inside an existing project is how the links end up one level too
 * deep, so it is worth naming — but it is a heuristic on two files, so it only
 * ever adds a hint and never blocks.
 */
export function looksNested(targetDir) {
  let dir = resolve(targetDir, "..");
  for (let i = 0; i < SEARCH_DEPTH; i += 1) {
    if (existsSync(join(dir, "Makefile")) && existsSync(join(dir, "api", "package.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * The diagnostic, as lines. Shared by the interactive prompt, the `--yes`
 * refusal and `--dry-run`, so all three say the same thing.
 */
export function describeMissing({ expected, found, levelsUp }, targetDir) {
  const L = [];
  L.push("");
  L.push(`${c.red("✗")} ${c.bold("Shared packages: local checkout not found.")}`);
  L.push("");
  L.push(`  ${c.dim("expected")}  ${expected}`);

  if (found) {
    L.push(`  ${c.dim("found")}     ${found}`);
    const levels = levelsUp === 2 ? "one level higher" : `${levelsUp - 1} levels higher`;
    L.push(`  ${c.dim(" ".repeat(9))}${levels} — local mode links into the`);
    L.push(`  ${c.dim(" ".repeat(9))}directory beside the project, not beside you`);
  } else {
    L.push(`  ${c.dim("found")}     ${c.dim("nothing nearby")}`);
  }

  const nested = looksNested(targetDir);
  if (nested) {
    L.push("");
    L.push(`  The target is inside an existing generated project`);
    L.push(`  (${nested}). Did you mean to generate a sibling?`);
  }

  return L.join("\n");
}

/** The remedies, phrased for whichever path is asking. */
export function remedyLines({ found }) {
  const L = [];
  if (found) {
    L.push(`  Generate beside ${dirname(found)} instead, or`);
  }
  L.push(`  use ${c.bold("--wyscan standalone")} (vendored stubs, installs from public npm),`);
  L.push(`  or ${c.bold("--allow-missing-ecosystem")} to generate anyway and fix the links later.`);
  return L.join("\n");
}
