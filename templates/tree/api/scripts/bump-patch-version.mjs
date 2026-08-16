#!/usr/bin/env node
/**
 * Bump the patch segment of api/package.json (x.y.z -> x.y.(z+1)).
 * Prints the new version to stdout.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) {
  console.error(`Invalid api/package.json version: ${pkg.version} (expected x.y.z)`);
  process.exit(1);
}

const parts = pkg.version.split(".");
parts[2] = String(Number(parts[2]) + 1);
pkg.version = parts.join(".");

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
process.stdout.write(pkg.version);
