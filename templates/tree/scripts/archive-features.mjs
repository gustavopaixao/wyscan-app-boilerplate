#!/usr/bin/env node
/**
 * Archive feature docs: move docs/features/NNNN-slug/ dirs with NNNN <= <up-to-id>
 * into flat docs/features/archive/, rewrite every affected link/path reference,
 * regenerate the index, and verify links. Idempotent — safe to rerun.
 *
 * Usage: node scripts/archive-features.mjs <up-to-id>   e.g. 0199
 *        (or: make features-archive UP_TO=0199)
 *
 * Rewrite rules:
 *   A (all scoped files)         features/NNNN-slug        -> features/archive/NNNN-slug   (iff archived)
 *   C (active feature docs)      ../NNNN-slug/             -> ../archive/NNNN-slug/        (iff archived)
 *   D (archived feature docs)    any ../… path that no longer resolves after the move but
 *                                resolves with one extra ../ gets that ../ prepended
 *                                (covers ../NNNN-slug/ to active features and ../../… escapes).
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FEATURES_DIR = path.join(ROOT, "docs", "features");
const ARCHIVE_DIR = path.join(FEATURES_DIR, "archive");
const FEAT_RE = /^\d{4}-[a-z0-9][a-z0-9-]*$/;
const REWRITE_SCOPES = ["docs", ".docs", ".claude", ".cursor", "api", "mobile", "scripts"];
const REWRITE_EXTENSIONS = new Set([".md", ".mdc", ".sh", ".ts", ".tsx", ".js", ".mjs", ".yml", ".yaml"]);

const arg = process.argv[2];
if (!/^\d{4}$/.test(arg ?? "")) {
  console.error("Usage: node scripts/archive-features.mjs <up-to-id>  (4 digits, e.g. 0199)");
  process.exit(1);
}
const upTo = Number(arg);

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

// --- 1. Move ---------------------------------------------------------------
fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
let moved = 0;
for (const name of listDirs(FEATURES_DIR)) {
  if (name === "archive" || !FEAT_RE.test(name)) continue;
  if (Number(name.slice(0, 4)) > upTo) continue;
  const src = path.join(FEATURES_DIR, name);
  const dest = path.join(ARCHIVE_DIR, name);
  if (fs.existsSync(dest)) {
    console.error(`Both ${src} and ${dest} exist — resolve manually before rerunning.`);
    process.exit(1);
  }
  fs.renameSync(src, dest);
  moved += 1;
}

// Sets are computed from the filesystem AFTER moving, so partial runs and
// reruns always rewrite against the real current layout.
const ARCH = new Set(listDirs(ARCHIVE_DIR));
const ACTIVE = new Set(listDirs(FEATURES_DIR).filter((n) => n !== "archive"));

// --- 2. Rewrite ------------------------------------------------------------
function gitFiles(scopes) {
  const out = execFileSync(
    "git",
    ["-C", ROOT, "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...scopes],
    { maxBuffer: 64 * 1024 * 1024 },
  ).toString("utf8");
  return [...new Set(out.split("\0").filter(Boolean))]
    .filter((f) => REWRITE_EXTENSIONS.has(path.extname(f)))
    .filter((f) => fs.existsSync(path.join(ROOT, f)))
    .sort();
}

const RULE_A_RE = /features\/(\d{4}-[a-z0-9-]+)/g;
const RULE_C_RE = /(?<!\.\.\/)\.\.\/(\d{4}-[a-z0-9-]+)\//g;
const RULE_D_RE = /(?:\.\.\/)+(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\/?/g;

const counts = { A: 0, C: 0, D: 0 };
let filesRewritten = 0;

for (const file of gitFiles(REWRITE_SCOPES)) {
  const abs = path.join(ROOT, file);
  const dir = path.dirname(abs);
  const original = fs.readFileSync(abs, "utf8");
  let content = original;

  // Rule A — repo-root-style and ../features/-style paths, everywhere.
  content = content.replace(RULE_A_RE, (m, feat) => {
    if (!ARCH.has(feat)) return m;
    counts.A += 1;
    return `features/archive/${feat}`;
  });

  const rel = path.relative(FEATURES_DIR, abs);
  const inArchive = !rel.startsWith("..") && rel.startsWith(`archive${path.sep}`);
  const inActiveFeature = !rel.startsWith("..") && !inArchive && rel.includes(path.sep);

  if (inActiveFeature) {
    // Rule C — sibling links from active docs to now-archived features.
    content = content.replace(RULE_C_RE, (m, feat) => {
      if (!ARCH.has(feat)) return m;
      counts.C += 1;
      return `../archive/${feat}/`;
    });
  }

  if (inArchive) {
    // Rule D — the file is one level deeper now; any ../… path that stopped
    // resolving but resolves with one more ../ gets it prepended.
    content = content.replace(RULE_D_RE, (m) => {
      if (fs.existsSync(path.resolve(dir, m))) return m;
      if (!fs.existsSync(path.resolve(dir, "..", m))) return m;
      counts.D += 1;
      return `../${m}`;
    });
  }

  if (content !== original) {
    fs.writeFileSync(abs, content);
    filesRewritten += 1;
  }
}

console.log(
  `Moved ${moved} dir(s) into docs/features/archive (${ARCH.size} archived, ${ACTIVE.size} active).`,
);
console.log(
  `Rewrote ${filesRewritten} file(s): ${counts.A} path rewrites (rule A), ${counts.C} active->archived links (rule C), ${counts.D} archived-depth fixes (rule D).`,
);

// --- 3. Regenerate index + verify links ------------------------------------
for (const script of ["features-index.mjs", "check-doc-links.mjs"]) {
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", script)], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
