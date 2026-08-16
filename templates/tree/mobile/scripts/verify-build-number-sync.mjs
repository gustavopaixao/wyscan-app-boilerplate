#!/usr/bin/env node
/**
 * Verify iOS and Android native build numbers match mobile/package.json buildNumber.
 * Exits 1 with a clear message when any checked platform is out of sync.
 *
 * Usage:
 *   node mobile/scripts/verify-build-number-sync.mjs [--platform ios|android|all]
 *
 * Env:
 *   BUILD — expected build (defaults to package.json buildNumber)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = path.join(mobileRoot, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const platformArg = process.argv.find((arg) => arg.startsWith("--platform="));
const platform = platformArg?.split("=")[1] ?? process.argv[2] ?? "all";
const validPlatforms = new Set(["ios", "android", "all"]);
if (!validPlatforms.has(platform)) {
  console.error(`Invalid --platform value: ${platform} (expected ios, android, or all)`);
  process.exit(1);
}

const expectedBuild =
  (process.env.BUILD || "").trim() || String(pkg.buildNumber ?? 1);

if (!/^\d+$/.test(expectedBuild) || Number(expectedBuild) < 1) {
  console.error(`Invalid expected build number: ${expectedBuild}`);
  process.exit(1);
}

function readIosBuildNumber() {
  const infoPlistPath = path.join(mobileRoot, "ios/__PROJECT_NAME__/Info.plist");
  if (!fs.existsSync(infoPlistPath)) {
    return null;
  }

  const plist = fs.readFileSync(infoPlistPath, "utf8");
  const match = plist.match(
    /<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/,
  );
  if (!match) {
    return { error: `Could not parse CFBundleVersion in ${infoPlistPath}` };
  }

  const pbxprojPath = path.join(mobileRoot, "ios/__PROJECT_NAME__.xcodeproj/project.pbxproj");
  let projectVersion = null;
  if (fs.existsSync(pbxprojPath)) {
    const pbxproj = fs.readFileSync(pbxprojPath, "utf8");
    const versions = [
      ...pbxproj.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g),
    ].map((m) => m[1]);
    const unique = [...new Set(versions)];
    if (unique.length === 1) {
      projectVersion = unique[0];
    } else if (unique.length > 1) {
      return {
        error: `Inconsistent CURRENT_PROJECT_VERSION values in ${pbxprojPath}: ${unique.join(", ")}`,
      };
    }
  }

  const infoVersion = match[1];
  if (projectVersion !== null && projectVersion !== infoVersion) {
    return {
      error: `iOS CFBundleVersion (${infoVersion}) does not match CURRENT_PROJECT_VERSION (${projectVersion})`,
    };
  }

  return { value: infoVersion };
}

function readAndroidVersionCode() {
  const gradlePath = path.join(mobileRoot, "android/app/build.gradle");
  if (!fs.existsSync(gradlePath)) {
    return null;
  }

  const gradle = fs.readFileSync(gradlePath, "utf8");
  const match = gradle.match(/versionCode\s+(\d+)/);
  if (!match) {
    return { error: `Could not parse versionCode in ${gradlePath}` };
  }

  return { value: match[1] };
}

const mismatches = [];
const missing = [];

function checkPlatform(name, reader) {
  const result = reader();
  if (result === null) {
    missing.push(name);
    return;
  }
  if (result.error) {
    mismatches.push({ platform: name, expected: expectedBuild, actual: result.error });
    return;
  }
  if (result.value !== expectedBuild) {
    mismatches.push({
      platform: name,
      expected: expectedBuild,
      actual: result.value,
    });
  }
}

if (platform === "ios" || platform === "all") {
  checkPlatform("ios", readIosBuildNumber);
}
if (platform === "android" || platform === "all") {
  checkPlatform("android", readAndroidVersionCode);
}

if (mismatches.length > 0) {
  console.error(
    `Build number sync failed (expected ${expectedBuild} from mobile/package.json):`,
  );
  for (const item of mismatches) {
    if (item.actual.includes(" ")) {
      console.error(`  - ${item.platform}: ${item.actual}`);
    } else {
      console.error(
        `  - ${item.platform}: expected ${item.expected}, found ${item.actual}`,
      );
    }
  }
  process.exit(1);
}

const checked = [];
if (platform === "ios" || platform === "all") {
  if (!missing.includes("ios")) checked.push("ios");
}
if (platform === "android" || platform === "all") {
  if (!missing.includes("android")) checked.push("android");
}

if (checked.length === 0) {
  console.error(
    `No native projects found to verify for platform=${platform}. Run prebuild first.`,
  );
  process.exit(1);
}

console.log(
  `Build number sync OK: ${checked.join(", ")} = ${expectedBuild} (mobile/package.json)`,
);
