#!/usr/bin/env node
/**
 * Resolve store release VERSION and BUILD for Makefile/Fastlane.
 * Uses env overrides when set; otherwise reads mobile/package.json.
 * Prints shell `export` statements (safe for eval in /bin/sh).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const version = (process.env.VERSION || "").trim() || String(pkg.version ?? "");
const buildEnv = (process.env.BUILD || "").trim();
const pkgBuild = String(pkg.buildNumber ?? 1);
const build = buildEnv || pkgBuild;

if (buildEnv && buildEnv !== pkgBuild && process.env.ALLOW_BUILD_OVERRIDE !== "1") {
  console.error(
    `BUILD env (${buildEnv}) does not match package.json buildNumber (${pkgBuild}). Update package.json or set ALLOW_BUILD_OVERRIDE=1.`,
  );
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid mobile/package.json version: ${version} (expected x.y.z)`);
  process.exit(1);
}
if (!/^\d+$/.test(build) || Number(build) < 1) {
  console.error(`Invalid mobile/package.json buildNumber: ${build}`);
  process.exit(1);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

console.log(`export VERSION=${shellQuote(version)}`);
console.log(`export BUILD=${shellQuote(build)}`);
