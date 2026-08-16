#!/usr/bin/env node
/**
 * Set buildNumber in mobile/package.json (does not touch native projects).
 * Prints the new build number to stdout.
 *
 * Usage:
 *   node mobile/scripts/set-build-number.mjs <buildNumber>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const buildArg = process.argv[2];
if (!buildArg || !/^\d+$/.test(buildArg) || Number(buildArg) < 1) {
  console.error("Usage: node mobile/scripts/set-build-number.mjs <buildNumber>");
  console.error("buildNumber must be a positive integer");
  process.exit(1);
}

const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) {
  console.error(`Invalid mobile/package.json version: ${pkg.version} (expected x.y.z)`);
  process.exit(1);
}

pkg.buildNumber = Number(buildArg);
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
process.stdout.write(String(pkg.buildNumber));
