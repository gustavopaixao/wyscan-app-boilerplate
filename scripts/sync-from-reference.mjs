#!/usr/bin/env node
/**
 * Extract templates/ from a reference project.
 *
 *   node scripts/sync-from-reference.mjs --from ../botonistas [--check] [--allow-residue]
 *
 * Pipeline:
 *   1. enumerate  - `git ls-files -s -z` (excludes node_modules, .next, mobile/ios,
 *                   .claude/settings.local.json, and every untracked .env by construction)
 *   2. filter     - drop paths matching EXCLUDE patterns
 *   3. guard      - abort on predecessor-project residue (incomplete upstream rename)
 *   4. tokenize   - literal -> sentinel, over content AND path
 *   5. guard      - abort if any reference identity survived tokenization
 *   6. emit       - templates/tree/** + templates/manifest.json (with file modes)
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { tokenize, findResidue } from "../src/tokens/apply.mjs";
import { applyPatches } from "../src/tokens/patches.mjs";
import { splitMakefile } from "./split-makefile.mjs";
import { DENYLIST, PREDECESSOR_TOKENS, RESIDUE_TOKENS } from "../src/tokens/catalog.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = join(ROOT, "templates");
const TREE = join(TEMPLATES, "tree");

/** Paths dropped entirely — reference-specific history, not boilerplate. */
const EXCLUDE = [
  /^docs\/features\/0001-project-boilerplates\//,
  /^docs\/bugsfixes\//,
  /^\.pnpm-store\//,
];

/**
 * Files copied byte-for-byte, never substituted.
 *
 * Only lockfiles qualify: they carry no project identity (verified) but do
 * encode `__ECOSYSTEM_DIR__` paths, so substituting would corrupt integrity
 * hashes for no benefit. `check-doc-links-baseline.txt` is deliberately NOT
 * raw — it is plain text containing a `web/<slug>-admin/...` path.
 */
const RAW = [/pnpm-lock\.yaml$/];

/**
 * Dot-prefixed path segments are stored with a leading `_` instead.
 *
 * Two reasons, both load-bearing: a stored `.gitignore` would alter this repo's
 * own git behaviour, and a stored `.claude/agents/**` would be loaded as THIS
 * repo's agent set by any Claude Code session opened here. `write.mjs` restores
 * the dot from the manifest's `dest`.
 */
function escapeSegment(seg) {
  return seg.startsWith(".") ? "_" + seg.slice(1) : seg;
}

/** Which selectable group a path belongs to. First match wins. */
const GROUPS = [
  [/^api\//, "api"],
  [/^mobile\//, "mobile"],
  [/^web\/botonistas-site\//, "web:site"],
  [/^web\/botonistas-app\//, "web:app"],
  [/^web\/botonistas-admin\//, "web:admin"],
  [/^docker\/deploy\//, "deploy"],
  [/^docker\//, "docker"],
  [/^\.claude\//, "ai:claude"],
  [/^\.cursor\//, "ai:cursor"],
  [/^\.github\//, "ai:github"],
  [/^scripts\//, "scripts"],
  [/^docs\//, "docs"],
  [/^Makefile$/, "make"],
];

function groupOf(path) {
  for (const [re, g] of GROUPS) if (re.test(path)) return g;
  return "core";
}

function isRaw(path) {
  return RAW.some((re) => re.test(path));
}

/** Store `web/botonistas-site/...` as `web/_site/...` so stored paths are catalog-stable. */
function storagePath(path) {
  const p = path
    .replace(/^web\/botonistas-site\//, "web/_site/")
    .replace(/^web\/botonistas-app\//, "web/_app/")
    .replace(/^web\/botonistas-admin\//, "web/_admin/");
  // Tokenize the stored name too, so templates/ contains no reference identity
  // in content OR in path.
  return tokenize(p).split("/").map(escapeSegment).join("/");
}

/** True if any segment of the real path is dot-prefixed. */
function isDotEscaped(path) {
  return path.split("/").some((s) => s.startsWith("."));
}

function main() {
  const { values } = parseArgs({
    options: {
      from: { type: "string" },
      check: { type: "boolean", default: false },
      "allow-residue": { type: "boolean", default: false },
    },
  });

  const from = resolve(values.from ?? "../botonistas");
  if (!existsSync(join(from, ".git"))) {
    console.error(`error: ${from} is not a git repository`);
    process.exit(1);
  }

  // 1. enumerate (mode + path, NUL-delimited)
  const raw = execFileSync("git", ["-C", from, "ls-files", "-s", "-z"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const entries = raw
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      const [mode] = line.slice(0, tab).split(" ");
      return { mode, path: line.slice(tab + 1) };
    });

  // 2. filter
  const kept = entries.filter((e) => !EXCLUDE.some((re) => re.test(e.path)));

  const commit = execFileSync("git", ["-C", from, "rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
  }).trim();

  // 3/4/5. guard, tokenize, guard
  const predecessorHits = [];
  const residueHits = [];
  const files = [];

  for (const { mode, path } of kept) {
    const buf = execFileSync("git", ["-C", from, "show", `HEAD:${path}`], {
      maxBuffer: 64 * 1024 * 1024,
    });
    const raw = isRaw(path);
    const text = buf.toString("utf8");

    // tokenize, then patch away reference-project defects (predecessor names,
    // stale model ids) so a re-sync reapplies the fixes automatically.
    const content = raw ? buf : Buffer.from(applyPatches(tokenize(text)), "utf8");
    const dest = tokenize(path);

    if (!raw) {
      const patched = content.toString("utf8");
      // Anything the patches failed to clean is a NEW upstream residue.
      if (findResidue(patched, PREDECESSOR_TOKENS).length) predecessorHits.push(path);
      const left = findResidue(patched, RESIDUE_TOKENS, DENYLIST);
      if (left.length) residueHits.push({ path, hits: left.length });
    }

    files.push({
      src: `tree/${storagePath(path)}`,
      dest,
      group: groupOf(path),
      mode: mode === "100755" ? 755 : 644,
      raw,
      dotEscaped: isDotEscaped(path),
      ...(raw && /^(api|mobile)\//.test(path)
        ? { invalidatedBy: ["wyscan:registry", "wyscan:standalone"] }
        : {}),
      _storage: storagePath(path),
      _content: content,
    });
  }

  if (predecessorHits.length && !values["allow-residue"]) {
    console.error(
      `\nerror: predecessor-project token found in ${predecessorHits.length} file(s).`,
    );
    console.error("The upstream rename is incomplete; these would ship into every scaffold:\n");
    for (const p of predecessorHits) console.error(`  ${p}`);
    console.error("\nFix them in the reference repo, or re-run with --allow-residue.\n");
    process.exit(1);
  }

  if (residueHits.length) {
    console.error(`\nerror: reference identity survived tokenization in ${residueHits.length} file(s):\n`);
    for (const { path, hits } of residueHits) console.error(`  ${path} (${hits})`);
    console.error("\nThe token catalog is incomplete. Add the missing literal to src/tokens/catalog.mjs.\n");
    process.exit(1);
  }

  // --- restructure: Makefile -> Makefile.head + make/<group>.mk -------------
  const mkIndex = files.findIndex((f) => f.dest === "Makefile");
  if (mkIndex !== -1) {
    const groupMap = JSON.parse(
      readFileSync(join(TEMPLATES, "makefile-groups.json"), "utf8"),
    );
    const { head, fragments, unmapped } = splitMakefile(
      files[mkIndex]._content.toString("utf8"),
      groupMap,
    );

    if (unmapped.length) {
      console.error(
        `\nerror: ${unmapped.length} Makefile target(s) are not in makefile-groups.json:\n`,
      );
      for (const t of unmapped) console.error(`  ${t}`);
      console.error("\nAdd them (with a help string) so they cannot be silently dropped.\n");
      process.exit(1);
    }

    files.splice(mkIndex, 1);
    files.push({
      src: "tree/Makefile.head",
      dest: "Makefile",
      group: "core",
      mode: 644,
      raw: false,
      dotEscaped: false,
      _storage: "Makefile.head",
      _content: Buffer.from(head, "utf8"),
    });
    for (const [group, text] of fragments) {
      const name = group.replace(":", "-");
      files.push({
        src: `tree/make/${name}.mk`,
        dest: `make/${name}.mk`,
        group: `make:${group}`,
        mode: 644,
        raw: false,
        dotEscaped: false,
        _storage: `make/${name}.mk`,
        _content: Buffer.from(text, "utf8"),
      });
    }
  }

  const manifest = {
    generatedFrom: { repo: from, commit },
    files: files.map(({ _content, _storage, ...f }) => f),
  };

  if (values.check) {
    const existing = existsSync(join(TEMPLATES, "manifest.json"))
      ? JSON.parse(readFileSync(join(TEMPLATES, "manifest.json"), "utf8"))
      : null;
    const same =
      existing && JSON.stringify(existing.files) === JSON.stringify(manifest.files);
    console.log(same ? "templates are up to date" : "templates DRIFT from reference");
    process.exit(same ? 0 : 1);
  }

  // 6. emit
  rmSync(TREE, { recursive: true, force: true });
  for (const f of files) {
    const out = join(TREE, f._storage);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, f._content);
  }
  mkdirSync(TEMPLATES, { recursive: true });
  writeFileSync(join(TEMPLATES, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  const execCount = files.filter((f) => f.mode === 755).length;
  const rawCount = files.filter((f) => f.raw).length;
  console.log(
    `extracted ${files.length} files from ${from}@${commit} ` +
      `(${execCount} executable, ${rawCount} raw)`,
  );
}

main();
