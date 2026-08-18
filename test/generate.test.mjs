import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { allSentinels } from "../src/tokens/catalog.mjs";
import { FIREBASE_DEPS } from "../src/generate/firebase.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "create.mjs");
const MANIFEST = JSON.parse(readFileSync(join(ROOT, "templates", "manifest.json"), "utf8"));
const AUTHORED = JSON.parse(readFileSync(join(ROOT, "templates", "authored.json"), "utf8"));
// Both template roots ship files, so any manifest-driven assertion must cover both.
const TEMPLATE_FILES = [...MANIFEST.files, ...AUTHORED.files];

/** Literals from the reference project that must never reach a generated tree. */
const FORBIDDEN = ["botonistas", "gustavopaixao", "gmpaixao", "palpitepro"];

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    // .git holds the committer's own identity, which is not template content.
    if (e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function generate(args) {
  const dir = mkdtempSync(join(tmpdir(), "wab-"));
  execFileSync("node", [CLI, ...args, dir], { encoding: "utf8" });
  return dir;
}

describe("generated project", () => {
  let dir;
  let files;

  before(() => {
    dir = generate(["--slug", "demo-shop", "--owner", "octocat", "--wyscan", "standalone"]);
    files = walk(dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  test("contains no reference-project identity", () => {
    const offenders = [];
    for (const f of files) {
      if (f.endsWith("pnpm-lock.yaml")) continue; // raw, dropped in standalone anyway
      const text = readFileSync(f, "utf8");
      for (const lit of FORBIDDEN) {
        if (text.toLowerCase().includes(lit)) offenders.push(`${f}: ${lit}`);
      }
    }
    assert.deepEqual(offenders, []);
  });

  test("contains no reference identity in any path", () => {
    const bad = files.filter((f) => FORBIDDEN.some((l) => f.toLowerCase().includes(l)));
    assert.deepEqual(bad, []);
  });

  test("leaves no unresolved template tokens", () => {
    const bad = [];
    for (const f of files) {
      if (f.endsWith("pnpm-lock.yaml")) continue;
      const text = readFileSync(f, "utf8");
      // Only OUR sentinels; __DEV__ and friends are legitimate RN globals.
      for (const s of allSentinels()) {
        if (text.includes(s)) bad.push(`${f}: ${s}`);
      }
    }
    assert.deepEqual(bad, []);
  });

  test("restores the executable bit on every script that had one", () => {
    // Standalone mode legitimately drops some 0755 bootstrap scripts, so assert
    // over the files that were actually generated rather than a raw count.
    const notExecutable = TEMPLATE_FILES
      .filter((f) => f.mode === 755)
      .map((f) => join(dir, f.dest.replace("__PROJECT_SLUG__", "demo-shop")))
      .filter((p) => existsSync(p))
      .filter((p) => !(statSync(p).mode & 0o100));

    assert.deepEqual(notExecutable, [], "these shipped without their exec bit");
    // The Claude hooks are the ones that fail silently if this regresses.
    assert.ok(statSync(join(dir, ".claude/hooks/pre-commit-gate.sh")).mode & 0o100);
  });

  test("emits parseable JSON everywhere", () => {
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      assert.doesNotThrow(() => JSON.parse(readFileSync(f, "utf8")), `${f} is not valid JSON`);
    }
  });

  test("renames workspace directories to the project slug", () => {
    assert.ok(existsSync(join(dir, "web/demo-shop-site")));
    assert.ok(existsSync(join(dir, "web/demo-shop-app")));
    assert.ok(existsSync(join(dir, "web/demo-shop-admin")));
    assert.ok(existsSync(join(dir, "demo-shop.code-workspace")));
  });

  test("restores dot-prefixed directories", () => {
    for (const d of [".claude", ".github", ".gitignore", ".dockerignore"]) {
      assert.ok(existsSync(join(dir, d)), `${d} missing`);
    }
  });

  test("ships no real secrets or native build output", () => {
    assert.ok(!existsSync(join(dir, "mobile/.env")), "mobile/.env must not ship");
    assert.ok(!existsSync(join(dir, "api/.env")), "api/.env must not ship");
    assert.ok(!existsSync(join(dir, "mobile/ios")), "mobile/ios prebuild must not ship");
    assert.ok(existsSync(join(dir, "api/.env.example")), "api/.env.example should ship");
  });

  test("drops stale lockfiles in standalone mode", () => {
    assert.ok(!existsSync(join(dir, "api/pnpm-lock.yaml")));
    assert.ok(!existsSync(join(dir, "mobile/pnpm-lock.yaml")));
    // Web lockfiles carry no ecosystem paths, so they stay.
    assert.ok(existsSync(join(dir, "web/demo-shop-site/pnpm-lock.yaml")));
  });
});

describe("workspace pruning", () => {
  test("deselecting mobile removes every mobile path", () => {
    const dir = generate(["--slug", "api-only", "--workspaces", "api"]);
    const files = walk(dir);
    assert.equal(files.filter((f) => f.includes("/mobile/")).length, 0);
    assert.equal(files.filter((f) => f.includes("/web/")).length, 0);
    assert.ok(files.some((f) => f.includes("/api/")));
    rmSync(dir, { recursive: true, force: true });
  });

  test("deselecting AI tooling removes those trees", () => {
    const dir = generate(["--slug", "bare-app", "--ai", "github"]);
    assert.ok(!existsSync(join(dir, ".claude")));
    assert.ok(!existsSync(join(dir, ".cursor")));
    assert.ok(existsSync(join(dir, ".github")));
    rmSync(dir, { recursive: true, force: true });
  });
});

/**
 * Firebase is opt-in because `@react-native-firebase/crashlytics` autolinks an iOS
 * build phase that fails until GoogleService-Info.plist exists — which no fresh
 * project has. A default project must therefore carry none of those packages.
 */
describe("firebase opt-in", () => {
  test("a default mobile project ships no Firebase", () => {
    const dir = generate(["--slug", "fb-off", "--workspaces", "api,mobile"]);
    const pkg = readFileSync(join(dir, "mobile/package.json"), "utf8");
    assert.ok(!pkg.includes("@react-native-firebase"), "no Firebase dependencies");

    const appConfig = readFileSync(join(dir, "mobile/app.config.ts"), "utf8");
    assert.ok(
      !appConfig.includes("buildReactNativeFromSource"),
      "building RN from source is a Firebase-only cost",
    );
    // Other Google pods rely on static frameworks, so that one stays.
    assert.match(appConfig, /useFrameworks: "static"/);

    assert.ok(existsSync(join(dir, "docs/runbooks/integrations/push-notifications-fcm-expo.md")));
    rmSync(dir, { recursive: true, force: true });
  });

  test("--firebase restores the packages and the iOS build setting", () => {
    const dir = generate(["--slug", "fb-on", "--workspaces", "api,mobile", "--firebase"]);
    const pkg = JSON.parse(readFileSync(join(dir, "mobile/package.json"), "utf8"));
    for (const name of FIREBASE_DEPS) {
      assert.ok(pkg.dependencies[name], `${name} should be kept`);
    }

    const appConfig = readFileSync(join(dir, "mobile/app.config.ts"), "utf8");
    assert.match(appConfig, /buildReactNativeFromSource: true/);
    rmSync(dir, { recursive: true, force: true });
  });

  test("drops the mobile lockfile it would invalidate", () => {
    // `local` is the only mode that ships mobile/pnpm-lock.yaml at all; pruning
    // dependencies would leave it describing packages that are no longer declared.
    const pruned = generate(["--slug", "fb-lock", "--workspaces", "mobile", "--wyscan", "local"]);
    assert.ok(!existsSync(join(pruned, "mobile/pnpm-lock.yaml")));
    rmSync(pruned, { recursive: true, force: true });

    const kept = generate([
      "--slug", "fb-lock-on",
      "--workspaces", "mobile",
      "--wyscan", "local",
      "--firebase",
    ]);
    assert.ok(existsSync(join(kept, "mobile/pnpm-lock.yaml")));
    rmSync(kept, { recursive: true, force: true });
  });

  /**
   * Pruning the dependencies is not enough: pnpm auto-installs peer
   * dependencies, so a shared package that peer-depends on
   * `@react-native-firebase/*` puts the pods back into node_modules, where
   * CocoaPods autolinks them regardless of `--firebase`. RNFB >= 22 then
   * refuses to install under `useFrameworks: "static"` and takes `pod install`
   * — and, three steps later, `expo run:ios` — down with it.
   */
  test("pins Firebase to CocoaPods whether or not Firebase is on", () => {
    for (const args of [[], ["--firebase"]]) {
      const dir = generate(["--slug", "fb-spm", "--workspaces", "mobile", ...args]);
      const plugin = join(dir, "mobile/plugins/withIosFirebaseCocoaPods.js");
      assert.ok(existsSync(plugin), `plugin ships with ${args.join(" ") || "defaults"}`);
      assert.match(readFileSync(plugin, "utf8"), /\$RNFirebaseDisableSPM = true/);

      const appConfig = readFileSync(join(dir, "mobile/app.config.ts"), "utf8");
      assert.ok(
        appConfig.includes('"./plugins/withIosFirebaseCocoaPods.js"'),
        "app.config.ts registers the plugin",
      );
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("--firebase adds nothing to a project without the mobile workspace", () => {
    const dir = generate(["--slug", "fb-api", "--workspaces", "api", "--firebase"]);
    assert.ok(!existsSync(join(dir, "mobile")));
    // Assert the mobile-only runbook specifically, not the whole directory:
    // `docs/runbooks/integrations/` also holds the OAuth runbook, which ships
    // with the api workspace.
    assert.ok(
      !existsSync(join(dir, "docs/runbooks/integrations/push-notifications-fcm-expo.md")),
    );
    rmSync(dir, { recursive: true, force: true });
  });
});

/**
 * The Fastlane setup comes from `templates/authored/`, not from the reference
 * extraction, so it needs its own coverage: nothing in `sync-from-reference.mjs`
 * would notice if these stopped shipping.
 */
describe("fastlane release tooling", () => {
  let dir;

  before(() => {
    // A display name with punctuation and a space, because that is exactly what
    // breaks a hardcoded Xcode scheme name.
    dir = generate(["--slug", "demo-shop", "--name", "Demo Shop!", "--workspaces", "api,mobile"]);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  test("ships with the mobile workspace", () => {
    for (const f of [
      "mobile/fastlane/Fastfile",
      "mobile/fastlane/Appfile",
      "mobile/fastlane/.env.example",
      "mobile/Gemfile",
      "mobile/.ruby-version",
      "mobile/scripts/prebuild-release.sh",
      "mobile/scripts/android-play-preflight.sh",
      "mobile/scripts/android-google-oauth-sha1.sh",
      "make/mobile-release.mk",
      "docs/runbooks/release-deploy-checklist.md",
    ]) {
      assert.ok(existsSync(join(dir, f)), `${f} should ship`);
    }
  });

  test("derives the iOS scheme the way expo prebuild does", () => {
    // "Demo Shop!" -> "DemoShop". A near-miss here fails deep inside xcodebuild.
    // (The display name still appears in prose comments — only the constant matters.)
    const fastfile = readFileSync(join(dir, "mobile/fastlane/Fastfile"), "utf8");
    const scheme = fastfile.match(/IOS_PROJECT_NAME = "([^"]*)"/)?.[1];
    assert.equal(scheme, "DemoShop");

    // The same derivation has to reach the scripts that patch the native project,
    // or the Fastfile and the build-number sync would look in different places.
    const syncScript = readFileSync(join(dir, "mobile/scripts/sync-ios-build-number.mjs"), "utf8");
    assert.ok(syncScript.includes("ios/DemoShop.xcodeproj"), "sync-ios-build-number must use the same name");
  });

  test("renders the bundle id into the Appfile and the Android package", () => {
    const appfile = readFileSync(join(dir, "mobile/fastlane/Appfile"), "utf8");
    assert.match(appfile, /app_identifier\("com\.demoshop\.app"\)/);
    assert.match(appfile, /package_name\("com\.demoshop\.app"\)/);

    const fastfile = readFileSync(join(dir, "mobile/fastlane/Fastfile"), "utf8");
    assert.match(fastfile, /PACKAGE_NAME = "com\.demoshop\.app"/);
  });

  test("ships no credentials and no Gemfile.lock", () => {
    // A lockfile resolved elsewhere pins platform-specific gems; the Gemfile pin
    // is the reproducibility story instead.
    assert.ok(!existsSync(join(dir, "mobile/Gemfile.lock")));
    assert.ok(!existsSync(join(dir, "mobile/fastlane/.env")));
    for (const f of walk(join(dir, "mobile", "fastlane"))) {
      assert.ok(!f.endsWith(".p8"), `${f} should not ship`);
      assert.ok(!f.endsWith(".keystore"), `${f} should not ship`);
    }
  });

  test("gitignores the credentials it tells you to create", () => {
    const ignore = readFileSync(join(dir, "mobile/.gitignore"), "utf8");
    for (const pattern of ["fastlane/.env", "fastlane/AuthKey_*.p8", "fastlane/*.keystore"]) {
      assert.ok(ignore.includes(pattern), `mobile/.gitignore should cover ${pattern}`);
    }
  });

  test("does not ship for a project without the mobile workspace", () => {
    const apiOnly = generate(["--slug", "api-only", "--workspaces", "api"]);
    assert.ok(!existsSync(join(apiOnly, "mobile")));
    assert.ok(!existsSync(join(apiOnly, "make/mobile-release.mk")));
    assert.ok(!existsSync(join(apiOnly, "docs/runbooks/release-deploy-checklist.md")));
    rmSync(apiOnly, { recursive: true, force: true });
  });
});
