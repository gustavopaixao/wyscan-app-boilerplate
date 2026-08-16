#!/usr/bin/env node
/**
 * Verify that relative file links in docs/**, .docs/**, .claude/**, .cursor/** resolve.
 *
 * Usage:
 *   node scripts/check-doc-links.mjs [--update-baseline]
 *
 * Known-broken links live in scripts/check-doc-links-baseline.txt (one
 * "<file> :: <target>" per line, `#` comments allowed). Baselined misses are
 * reported as KNOWN and do not fail the run; any new miss exits 1.
 * --update-baseline rewrites the baseline from the current misses (sorted).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = path.join(ROOT, "scripts", "check-doc-links-baseline.txt");
const SCOPES = ["docs", ".docs", ".claude", ".cursor"];
const EXTENSIONS = new Set([".md", ".mdc"]);
const UPDATE_BASELINE = process.argv.includes("--update-baseline");

function gitFiles(scopes) {
  const out = execFileSync(
    "git",
    ["-C", ROOT, "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...scopes],
    { maxBuffer: 64 * 1024 * 1024 },
  ).toString("utf8");
  return [...new Set(out.split("\0").filter(Boolean))]
    .filter((f) => EXTENSIONS.has(path.extname(f)))
    .filter((f) => fs.existsSync(path.join(ROOT, f)))
    .sort();
}

// Target may contain one level of balanced parens (Next/Expo route groups like app/(dashboard)/…).
const INLINE_LINK_RE = /\[[^\]]*\]\(((?:[^()\s]|\([^()\s]*\))+)/g;
const REF_DEF_RE = /^\[[^\]]+\]:\s*(\S+)/;

// External schemes, pure anchors, site-absolute paths, globs, and NNNN-template
// placeholders (agent prompt examples) are not checkable files.
function isCheckable(target) {
  return (
    target !== "" &&
    !/^(https?:|mailto:|tel:|#|\/)/i.test(target) &&
    !target.includes("://") &&
    !target.includes("*") &&
    !/NNNN/.test(target)
  );
}

function normalizeTarget(raw) {
  let t = raw.replace(/^</, "").replace(/>$/, "");
  t = t.split("#")[0].split("?")[0];
  try {
    t = decodeURIComponent(t);
  } catch {
    // keep the raw target when it is not valid percent-encoding
  }
  return t;
}

function collectMisses() {
  const misses = [];
  for (const file of gitFiles(SCOPES)) {
    const abs = path.join(ROOT, file);
    const dir = path.dirname(abs);
    const lines = fs.readFileSync(abs, "utf8").split("\n");
    lines.forEach((line, i) => {
      const targets = [];
      for (const m of line.matchAll(INLINE_LINK_RE)) targets.push(m[1]);
      const ref = line.match(REF_DEF_RE);
      if (ref) targets.push(ref[1]);
      for (const raw of targets) {
        const target = normalizeTarget(raw);
        if (!isCheckable(target)) continue;
        if (!fs.existsSync(path.resolve(dir, target))) {
          misses.push({ file, line: i + 1, target, key: `${file} :: ${target}` });
        }
      }
    });
  }
  return misses;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return new Set();
  return new Set(
    fs
      .readFileSync(BASELINE_PATH, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#")),
  );
}

const misses = collectMisses();

if (UPDATE_BASELINE) {
  const keys = [...new Set(misses.map((m) => m.key))].sort();
  const header = [
    "# Known-broken doc links (scripts/check-doc-links.mjs baseline).",
    "# TODO: burn these down — remove a line once its link is fixed.",
    "",
  ];
  fs.writeFileSync(BASELINE_PATH, `${header.concat(keys).join("\n")}\n`);
  console.log(`Baseline updated: ${keys.length} known-broken link(s) → ${path.relative(ROOT, BASELINE_PATH)}`);
  process.exit(0);
}

const baseline = readBaseline();
const known = misses.filter((m) => baseline.has(m.key));
const fresh = misses.filter((m) => !baseline.has(m.key));

for (const m of known) console.log(`KNOWN  ${m.file}:${m.line} -> ${m.target}`);
for (const m of fresh) console.error(`BROKEN ${m.file}:${m.line} -> ${m.target}`);

console.log(
  `Checked ${gitFiles(SCOPES).length} files: ${fresh.length} broken, ${known.length} known (baselined).`,
);
if (fresh.length > 0) {
  console.error("New broken links found. Fix them or (deliberately) baseline with --update-baseline.");
  process.exit(1);
}
