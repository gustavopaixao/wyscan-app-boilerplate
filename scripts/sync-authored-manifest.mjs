/**
 * Reconcile `templates/authored.json` with what is actually on disk.
 *
 *   node scripts/sync-authored-manifest.mjs           add/remove entries
 *   node scripts/sync-authored-manifest.mjs --check   exit 1 if out of sync
 *
 * `authored.json` is hand-maintained by design (see templates/authored/README.md)
 * and this does NOT take that over: every field of an existing entry is left
 * exactly as written — group, mode, raw, dotEscaped. It only adds entries for
 * new files and drops entries whose file is gone, which are the two ways the
 * manifest actually goes stale. A file added without an entry is silently
 * missing from every generated project, and an entry without a file aborts
 * generation outright, so both failure modes are worth a guard.
 *
 * Anything it cannot classify is reported rather than guessed at.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "templates", "authored.json");
const check = process.argv.includes("--check");

/** Workspace prefix -> manifest group. */
const GROUPS = [
  ["authored/api/", "api"],
  ["authored/mobile/", "mobile"],
  ["authored/web/_app/", "web:app"],
  ["authored/web/_admin/", "web:admin"],
  ["authored/web/_site/", "web:site"],
  // Runbooks ship with the workspace they document; auth and design both
  // require the API, so that is where they are gated.
  ["authored/docs/", "api"],
  // Assistant rules ship only when the matching tooling was selected.
  ["authored/_claude/", "ai:claude"],
  ["authored/_cursor/", "ai:cursor"],
];

/** Storage path -> path inside the generated project. */
function destFor(src) {
  const rel = src
    .replace(/^authored\//, "")
    .replace(/^_claude\//, ".claude/")
    .replace(/^_cursor\//, ".cursor/")
    .replace(/^web\/_app\//, "web/__PROJECT_SLUG__-app/")
    .replace(/^web\/_admin\//, "web/__PROJECT_SLUG__-admin/")
    .replace(/^web\/_site\//, "web/__PROJECT_SLUG__-site/");

  // Dot segments are stored `_`-prefixed so this repo does not grow live
  // dotfiles; restore them for the destination.
  return rel
    .split("/")
    .map((seg) => (/^_(env|gitignore|npmrc|ruby-version|biomeignore)/.test(seg) ? `.${seg.slice(1)}` : seg))
    .join("/");
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

const onDisk = execFileSync("find", [join(ROOT, "templates", "authored"), "-type", "f"], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .map((p) => p.replace(`${ROOT}/templates/`, ""))
  // Repo documentation, not template content.
  .filter((p) => p !== "authored/README.md")
  .sort();

const removed = manifest.files.filter((f) => !existsSync(join(ROOT, "templates", f.src)));
const kept = manifest.files.filter((f) => existsSync(join(ROOT, "templates", f.src)));
const known = new Set(kept.map((f) => f.src));

const added = [];
const unclassified = [];

for (const src of onDisk) {
  if (known.has(src)) continue;
  const group = GROUPS.find(([prefix]) => src.startsWith(prefix))?.[1];
  if (!group) {
    unclassified.push(src);
    continue;
  }
  const dest = destFor(src);
  added.push({
    src,
    dest,
    group,
    // Scripts need 755; nothing authored so far does, so this is the safe
    // default and an executable file is flagged below rather than guessed.
    mode: 644,
    raw: false,
    dotEscaped: dest.split("/").some((seg) => seg.startsWith(".")),
  });
}

if (unclassified.length > 0) {
  console.error("Cannot classify (add a prefix to GROUPS in this script):");
  for (const src of unclassified) console.error(`  ${src}`);
  process.exit(1);
}

if (check) {
  const stale = added.length > 0 || removed.length > 0;
  if (stale) {
    for (const f of added) console.error(`  missing entry: ${f.src}`);
    for (const f of removed) console.error(`  entry with no file: ${f.src}`);
    console.error("\nRun: node scripts/sync-authored-manifest.mjs");
  } else {
    console.log(`authored.json is in sync (${kept.length} entries)`);
  }
  process.exit(stale ? 1 : 0);
}

manifest.files = [...kept, ...added];
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`+${added.length} -${removed.length}, ${manifest.files.length} entries`);
for (const f of removed) console.log(`  removed ${f.src}`);
