#!/usr/bin/env node
/**
 * Bump buildNumber in mobile/package.json (integer +1).
 * Prints the new build number to stdout.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) {
  console.error(`Invalid mobile/package.json version: ${pkg.version} (expected x.y.z)`);
  process.exit(1);
}

const current = Number(pkg.buildNumber ?? 1);
if (!Number.isInteger(current) || current < 1) {
  console.error(`Invalid mobile/package.json buildNumber: ${pkg.buildNumber ?? "(missing)"}`);
  process.exit(1);
}

pkg.buildNumber = current + 1;

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
process.stdout.write(String(pkg.buildNumber));
