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

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

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

/*
 * ---------------------------------------------------------------------------
 * What the checkout actually contains
 * ---------------------------------------------------------------------------
 *
 * The shared packages depend on each other with `workspace:*`, which resolves
 * only inside their own monorepo. A generated project links them with `file:`
 * from outside it, so every one of those specs has to be rewritten by a
 * `pnpm.overrides` entry — keyed by the package's REAL name.
 *
 * The templates key those overrides on `__NPM_SCOPE__`, i.e. the generated
 * project's scope, which is `@<owner>` (or `@local` when the owner prompt is
 * left blank). When that does not match the checkout's own scope the overrides
 * silently match nothing and `pnpm install` dies with
 * `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` naming a package the project never
 * mentioned.
 *
 * So read the checkout instead of assuming its scope: which packages it
 * publishes, and which of their internal deps need overriding.
 */

/** The globs the checkout uses when its own scope is unreadable. */
const DEFAULT_WORKSPACE_GLOBS = ["packages/*/api/nextjs", "packages/*/mobile/react-native"];

/**
 * The checkout's `pnpm-workspace.yaml` package globs.
 *
 * A three-line reader rather than a YAML dependency — this repo has no runtime
 * deps by design, and the file is one list of quoted strings. Anything it
 * cannot parse falls back to the known layout, so a reshaped checkout degrades
 * to the old assumption rather than to nothing.
 */
function workspaceGlobs(packagesRoot) {
  const file = join(packagesRoot, "pnpm-workspace.yaml");
  if (!existsSync(file)) return DEFAULT_WORKSPACE_GLOBS;

  const globs = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*-\s*['"]?([^'"#]+?)['"]?\s*$/);
    if (m) globs.push(m[1]);
  }
  return globs.length > 0 ? globs : DEFAULT_WORKSPACE_GLOBS;
}

/**
 * Expand a glob whose only wildcard is a whole `*` segment — all pnpm needs
 * here, and all the checkout uses. A `**` segment matches literally, so it
 * expands to nothing rather than to the whole tree.
 */
function expandGlob(root, glob) {
  let dirs = [""];
  for (const seg of glob.split("/").filter(Boolean)) {
    const next = [];
    for (const dir of dirs) {
      const abs = join(root, dir);
      if (seg === "*") {
        if (!existsSync(abs)) continue;
        for (const entry of readdirSync(abs, { withFileTypes: true })) {
          if (entry.isDirectory()) next.push(dir ? `${dir}/${entry.name}` : entry.name);
        }
      } else {
        const candidate = dir ? `${dir}/${seg}` : seg;
        if (existsSync(join(root, candidate))) next.push(candidate);
      }
    }
    dirs = next;
  }
  return dirs;
}

/** devDependencies are not installed for a linked package, so they cannot break it. */
const INSTALLED_DEP_FIELDS = ["dependencies", "peerDependencies", "optionalDependencies"];

/**
 * Read the local checkout.
 *
 * @returns {{
 *   root: string, packagesRoot: string,
 *   packages: Array<{name: string, path: string}>,
 *   edges: Array<{from: string, dep: string}>,
 *   missing: Array<{from: string, dep: string}>,
 *   scopes: string[],
 * }}
 *   `path` is relative to `root` (the checkout, not its `Packages/`
 *   subdirectory) because that is exactly the tail of the `file:` specifiers
 *   the templates carry. `edges` are the internal `workspace:` deps; `missing`
 *   are the ones naming a package the checkout does not contain, which no
 *   override can repair.
 */
export function scanEcosystem(targetDir, ecosystemDir = "WyscanDev") {
  const packagesRoot = ecosystemPathFor(targetDir, ecosystemDir);
  const root = dirname(packagesRoot);
  const byName = new Map();
  const edges = [];

  for (const glob of workspaceGlobs(packagesRoot)) {
    for (const rel of expandGlob(packagesRoot, glob)) {
      const dir = join(packagesRoot, rel);
      const manifest = join(dir, "package.json");
      if (!existsSync(manifest)) continue;

      let pkg;
      try {
        pkg = JSON.parse(readFileSync(manifest, "utf8"));
      } catch {
        continue; // an unreadable manifest is the checkout's problem, not ours
      }
      if (!pkg?.name || byName.has(pkg.name)) continue;

      byName.set(pkg.name, {
        name: pkg.name,
        path: relative(root, dir).split(sep).join("/"),
      });
      for (const field of INSTALLED_DEP_FIELDS) {
        for (const [dep, spec] of Object.entries(pkg[field] ?? {})) {
          if (String(spec).startsWith("workspace:")) edges.push({ from: pkg.name, dep });
        }
      }
    }
  }

  const packages = [...byName.values()];
  return {
    root,
    packagesRoot,
    packages,
    edges,
    missing: edges.filter((e) => !byName.has(e.dep)),
    scopes: [...new Set(packages.map((p) => p.name.split("/")[0]))].filter((s) =>
      s.startsWith("@"),
    ).sort(),
  };
}

/**
 * The checkout wants a package it does not contain. Nothing the generator
 * writes can fix that, and `pnpm install` would fail on it, so say so before
 * writing rather than after.
 */
export function describeUnresolvable({ missing, root }) {
  const seen = new Set();
  const L = [""];
  L.push(`${c.red("✗")} ${c.bold("Shared packages: the checkout is incomplete.")}`);
  L.push("");
  L.push(`  ${c.dim("checkout")}  ${root}`);
  L.push("");
  for (const { from, dep } of missing) {
    const key = `${from}->${dep}`;
    if (seen.has(key)) continue;
    seen.add(key);
    L.push(`  ${from} depends on ${c.bold(dep)}, which is not in the checkout`);
  }
  L.push("");
  L.push(`  A ${c.bold("workspace:")} dep can only resolve to a package the checkout`);
  L.push(`  publishes, so no override can stand in for it. Pull the missing`);
  L.push(`  packages, or use ${c.bold("--wyscan standalone")}.`);
  return L.join("\n");
}

/**
 * The scopes differ. Survivable — the generator mirrors the overrides under the
 * checkout's real scope — but worth naming, because the fix is usually just
 * answering the owner prompt.
 */
export function describeScopeMismatch({ scopes, root }, npmScope) {
  const real = scopes.join(", ") || "(none)";
  const L = [""];
  L.push(`${c.cyan("!")} ${c.bold("Shared packages: scope mismatch.")}`);
  L.push("");
  L.push(`  ${c.dim("project")}   ${npmScope}`);
  L.push(`  ${c.dim("checkout")}  ${real}  ${c.dim(root)}`);
  L.push("");
  L.push(`  The shared packages depend on each other by their own name, so the`);
  L.push(`  overrides that rewrite those deps are being mirrored under ${real}`);
  L.push(`  as well. Generating with ${c.bold(`--owner ${scopes[0]?.slice(1) ?? "<owner>"}`)} would avoid`);
  L.push(`  the second set of keys.`);
  return L.join("\n");
}
