#!/usr/bin/env node
/**
 * Set CURRENT_PROJECT_VERSION in ios project to match mobile build number.
 * Expo prebuild sets CFBundleVersion but leaves pbxproj at 1.
 *
 * Env: BUILD — defaults to package.json buildNumber
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(
  fs.readFileSync(path.join(mobileRoot, "package.json"), "utf8"),
);
const build =
  (process.env.BUILD || "").trim() || String(pkg.buildNumber ?? 1);

if (!/^\d+$/.test(build) || Number(build) < 1) {
  console.error(`Invalid build number: ${build}`);
  process.exit(1);
}

const pbxprojPath = path.join(
  mobileRoot,
  "ios/__IOS_PROJECT_NAME__.xcodeproj/project.pbxproj",
);
if (!fs.existsSync(pbxprojPath)) {
  console.error(`iOS project not found: ${pbxprojPath}`);
  process.exit(1);
}

const content = fs.readFileSync(pbxprojPath, "utf8");
const updated = content.replace(
  /CURRENT_PROJECT_VERSION = \d+;/g,
  `CURRENT_PROJECT_VERSION = ${build};`,
);

if (updated === content) {
  console.error(`Could not update CURRENT_PROJECT_VERSION in ${pbxprojPath}`);
  process.exit(1);
}

fs.writeFileSync(pbxprojPath, updated);
console.log(`Synced iOS CURRENT_PROJECT_VERSION to ${build}`);
