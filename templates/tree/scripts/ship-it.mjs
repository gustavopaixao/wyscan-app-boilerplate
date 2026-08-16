#!/usr/bin/env node
/**
 * Ship-it: detect API/mobile/web changes, pre-flight, confirm, execute release commands.
 *
 * Usage:
 *   node scripts/ship-it.mjs [--plan-only] [--yes] [--platforms=ios|android|ios,android]
 *
 * Env:
 *   YES=1              — skip confirmation prompt
 *   PLATFORMS          — mobile platforms to ship (ios | android | "ios android"); default both
 *   PUBLIC_HEALTH_URL  — override health check URL for mobile pre-flight
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ARGS = new Set(process.argv.slice(2));
const PLAN_ONLY = ARGS.has("--plan-only");
const AUTO_YES = ARGS.has("--yes") || process.env.YES === "1";

function parsePlatforms() {
  const fromArg = [...ARGS].find((a) => a.startsWith("--platforms="))?.split("=")[1];
  const raw = (fromArg ?? process.env.PLATFORMS ?? "ios,android").trim();
  const requested = raw
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const invalid = requested.filter((p) => p !== "ios" && p !== "android");
  if (invalid.length > 0) {
    console.error(`Invalid platforms: ${invalid.join(", ")} (expected ios and/or android)`);
    process.exit(1);
  }
  const set = new Set(requested);
  const ordered = ["ios", "android"].filter((p) => set.has(p));
  if (ordered.length === 0) {
    console.error("No valid platforms selected (expected ios and/or android)");
    process.exit(1);
  }
  return ordered;
}

const PLATFORMS = parsePlatforms();

const API_MARKER_GREP = "chore(api): bump version";
const MOBILE_MARKER_GREP = "chore(mobile): bump buildNumber";

function git(...args) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `git ${args.join(" ")} failed (exit ${code})`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function gitOptional(...args) {
  try {
    return await git(...args);
  } catch {
    return "";
  }
}

async function resolveMainRef() {
  const originMain = await gitOptional("rev-parse", "--verify", "origin/main");
  if (originMain) return "origin/main";
  const main = await gitOptional("rev-parse", "--verify", "main");
  if (main) return "main";
  return "HEAD";
}

async function findLastMarker(grepPattern) {
  const mainRef = await resolveMainRef();
  const hash = await gitOptional(
    "log",
    mainRef,
    `--grep=${grepPattern}`,
    "--format=%H",
    "-n",
    "1",
  );
  return hash || null;
}

async function collectChangedFiles(baseline) {
  const sets = new Set();

  const addLines = (output) => {
    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) sets.add(trimmed);
    }
  };

  if (baseline) {
    addLines(await gitOptional("diff", "--name-only", `${baseline}..HEAD`));
  } else {
    const mainRef = await resolveMainRef();
    addLines(await gitOptional("diff", "--name-only", `${mainRef}..HEAD`));
  }

  addLines(await gitOptional("diff", "--name-only", "HEAD"));
  addLines(await gitOptional("diff", "--name-only", "--cached"));

  return [...sets];
}

function classifyFiles(files) {
  const surfaces = {
    api: [],
    mobile: [],
    webAdmin: [],
    webSite: [],
    webApp: [],
    wyscanHint: [],
  };

  for (const file of files) {
    if (file.startsWith("api/")) surfaces.api.push(file);
    if (file.startsWith("mobile/")) surfaces.mobile.push(file);
    if (file.startsWith("web/__PROJECT_SLUG__-admin/")) surfaces.webAdmin.push(file);
    if (file.startsWith("web/__PROJECT_SLUG__-site/")) surfaces.webSite.push(file);
    if (file.startsWith("web/__PROJECT_SLUG__-app/")) surfaces.webApp.push(file);

    if (
      file === "api/package.json" ||
      file === "mobile/package.json" ||
      file === "pnpm-lock.yaml" ||
      file === "api/pnpm-lock.yaml" ||
      file === "mobile/pnpm-lock.yaml"
    ) {
      surfaces.wyscanHint.push(file);
    }
  }

  return surfaces;
}

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function parseEnvFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return {};
  const vars = {};
  const content = fs.readFileSync(fullPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function hasWyscanFileDeps(files) {
  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      if (content.includes('"file:') || content.includes("'file:")) {
        return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

function deriveHealthUrl(fastlaneEnv, publicHealthUrl) {
  if (publicHealthUrl?.trim()) return publicHealthUrl.trim();
  const apiUrl = fastlaneEnv.EXPO_PUBLIC_API_URL?.trim();
  if (!apiUrl) return null;
  try {
    const url = new URL(apiUrl);
    url.pathname = "/api/health";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function isDirtyTree() {
  const status = await gitOptional("status", "--porcelain");
  return Boolean(status);
}

async function hasUnpushedCommits() {
  const mainRef = await resolveMainRef();
  const ahead = await gitOptional("rev-list", "--count", `${mainRef}..HEAD`);
  return Number(ahead || 0) > 0;
}

function runCommand(command, args, { cwd = ROOT, prefix } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const writePrefixed = (stream, data) => {
      const text = data.toString();
      for (const line of text.split("\n")) {
        if (!line) continue;
        stream.write(prefix ? `${prefix} ${line}\n` : `${line}\n`);
      }
    };

    child.stdout.on("data", (data) => writePrefixed(process.stdout, data));
    child.stderr.on("data", (data) => writePrefixed(process.stderr, data));

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

async function runPreflightGate(name, condition, runner) {
  if (!condition) {
    return { name, status: "skip", detail: "not required" };
  }
  process.stdout.write(`\n▶ Pre-flight: ${name}…\n`);
  try {
    const code = await runner();
    if (code !== 0) {
      return { name, status: "fail", detail: `exit ${code}` };
    }
    return { name, status: "pass", detail: "ok" };
  } catch (error) {
    return { name, status: "fail", detail: error instanceof Error ? error.message : String(error) };
  }
}

async function runPreflight(surfaces) {
  const apiChanged = surfaces.api.length > 0;
  const mobileChanged = surfaces.mobile.length > 0;
  const gates = [];

  gates.push(
    await runPreflightGate("API lint", apiChanged, () =>
      runCommand("pnpm", ["lint"], { cwd: path.join(ROOT, "api") }),
    ),
  );

  gates.push(
    await runPreflightGate("API type-check", apiChanged, () =>
      runCommand("pnpm", ["type-check"], { cwd: path.join(ROOT, "api") }),
    ),
  );

  gates.push(
    await runPreflightGate("API tests", apiChanged, () =>
      runCommand("pnpm", ["test"], { cwd: path.join(ROOT, "api") }),
    ),
  );

  gates.push(
    await runPreflightGate("Mobile typecheck", mobileChanged, () =>
      runCommand("pnpm", ["exec", "tsc", "--noEmit"], { cwd: path.join(ROOT, "mobile") }),
    ),
  );

  gates.push(
    await runPreflightGate("Mobile tests", mobileChanged, () =>
      runCommand("pnpm", ["test"], { cwd: path.join(ROOT, "mobile") }),
    ),
  );

  gates.push(
    await runPreflightGate("Docker build env", apiChanged, async () => {
      const envPath = path.join(ROOT, "docker/build.env");
      if (!fs.existsSync(envPath)) {
        throw new Error("docker/build.env missing (see docker/build.env.example)");
      }
      const vars = parseEnvFile("docker/build.env");
      if (!vars.GITHUB_USER?.trim() || !vars.GITHUB_TOKEN?.trim()) {
        throw new Error("GITHUB_USER and GITHUB_TOKEN required in docker/build.env");
      }
      return 0;
    }),
  );

  gates.push(
    await runPreflightGate("Mobile Fastlane env", mobileChanged, async () => {
      const envPath = path.join(ROOT, "mobile/fastlane/.env");
      if (!fs.existsSync(envPath)) {
        throw new Error("mobile/fastlane/.env missing (see mobile/fastlane/.env.example)");
      }
      const vars = parseEnvFile("mobile/fastlane/.env");
      const apiUrl = vars.EXPO_PUBLIC_API_URL?.trim();
      if (!apiUrl) {
        throw new Error("EXPO_PUBLIC_API_URL required in mobile/fastlane/.env");
      }
      if (!apiUrl.startsWith("https://")) {
        throw new Error("EXPO_PUBLIC_API_URL must be HTTPS for store builds");
      }
      return 0;
    }),
  );

  gates.push(
    await runPreflightGate("Production API health", mobileChanged, async () => {
      const fastlaneEnv = parseEnvFile("mobile/fastlane/.env");
      const healthUrl = deriveHealthUrl(fastlaneEnv, process.env.PUBLIC_HEALTH_URL);
      if (!healthUrl) {
        throw new Error("Could not derive health URL; set PUBLIC_HEALTH_URL");
      }
      const code = await runCommand("curl", ["-sf", healthUrl]);
      if (code !== 0) {
        throw new Error(`health check failed: ${healthUrl}`);
      }
      return 0;
    }),
  );

  return gates;
}

function bumpPatchPreview(version) {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return version;
  parts[2] += 1;
  return parts.join(".");
}

const STORE_LABEL = { ios: "TestFlight", android: "Play internal" };

function mobileMakeArgs(platforms) {
  return [`PLATFORMS=${platforms.join(" ")}`];
}

function printPlan({
  surfaces,
  apiMarker,
  mobileMarker,
  apiBaselineNote,
  mobileBaselineNote,
  apiPkg,
  mobilePkg,
  gates,
  warnings,
  apiChanged,
  mobileChanged,
  platforms,
}) {
  console.log("\n## Ship-it plan\n");

  console.log("### Changes since last release");
  console.log(
    `- API: ${apiChanged ? "yes" : "no"} (${apiBaselineNote}; ${surfaces.api.length} files)`,
  );
  console.log(
    `- Mobile: ${mobileChanged ? "yes" : "no"} (${mobileBaselineNote}; ${surfaces.mobile.length} files)`,
  );
  console.log(
    `- Web admin: ${surfaces.webAdmin.length > 0 ? "yes" : "no"}${surfaces.webAdmin.length > 0 ? " — manual deploy required" : ""}`,
  );
  console.log(
    `- Web site: ${surfaces.webSite.length > 0 ? "yes" : "no"}${surfaces.webSite.length > 0 ? " — manual deploy required" : ""}`,
  );
  console.log(
    `- Web app: ${surfaces.webApp.length > 0 ? "yes" : "no"}${surfaces.webApp.length > 0 ? " — manual deploy required" : ""}`,
  );

  if (apiMarker) console.log(`  - API marker: ${apiMarker.slice(0, 7)}`);
  if (mobileMarker) console.log(`  - Mobile marker: ${mobileMarker.slice(0, 7)}`);

  console.log("\n### Versions (current → after ship)");
  if (apiChanged) {
    const next = bumpPatchPreview(apiPkg.version);
    console.log(
      `- API image: ${apiPkg.version} published → api/package.json → ${next} (patch bump commit)`,
    );
  }
  if (mobileChanged) {
    const nextBuild = Number(mobilePkg.buildNumber ?? 1) + 1;
    const stores = platforms.map((p) => STORE_LABEL[p]).join(" + ");
    console.log(
      `- Mobile: version ${mobilePkg.version}, buildNumber ${mobilePkg.buildNumber} → ${nextBuild} (commit) → ${stores} (${platforms.join(" + ")})`,
    );
    if (platforms.length === 1) {
      const other = platforms[0] === "ios" ? "android" : "ios";
      console.log(
        `  - ⚠️ ${other} not shipped this run; sync it later at the SAME build with: SKIP_BUILD_BUMP=1 make mobile-${other}-beta`,
      );
    }
  }
  if (!apiChanged && !mobileChanged) {
    console.log("- No API/mobile version changes planned");
  }

  if (warnings.length > 0) {
    console.log("\n### Warnings");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log("\n### Pre-flight");
  for (const gate of gates) {
    const icon = gate.status === "pass" ? "✅" : gate.status === "skip" ? "⏭️" : "❌";
    console.log(`- ${icon} ${gate.name}: ${gate.status} (${gate.detail})`);
  }

  console.log("\n### Commands to execute (build machine)");
  const mobileCmd = `make mobile-beta-select PLATFORMS="${platforms.join(" ")}"`;
  if (apiChanged && mobileChanged) {
    console.log(`- Parallel: make api-docker-release TAG=latest ∥ ${mobileCmd}`);
  } else if (apiChanged) {
    console.log("- make api-docker-release TAG=latest");
  } else if (mobileChanged) {
    console.log(`- ${mobileCmd}`);
  } else {
    console.log("- (none — no API/mobile changes detected)");
  }

  console.log("\n### Commands for you later (not executed)");
  console.log("- git push origin main");
  if (apiChanged) {
    console.log("- On production server (after push):");
    console.log("  cd __DEPLOY_ROOT__/docker/deploy");
    console.log("  make upgrade");
    console.log("  make health");
    console.log("  # Optional: cd __DEPLOY_ROOT__ && make api-production-upgrade GIT_PULL=1");
  }
  if (surfaces.webAdmin.length > 0) {
    console.log("- Deploy web/__PROJECT_SLUG__-admin via your Vercel/host workflow after push");
  }
  if (surfaces.webSite.length > 0) {
    console.log("- Deploy web/__PROJECT_SLUG__-site via your Vercel/host workflow after push");
  }
  if (surfaces.webApp.length > 0) {
    console.log("- Deploy web/__PROJECT_SLUG__-app via Vercel after push");
    console.log("  Optional validation: make web-app-deploy-check");
  }
}

async function askConfirmation() {
  if (AUTO_YES) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => {
    rl.question("\nProceed with ship? [y/N] ", (value) => {
      rl.close();
      resolve(value.trim().toLowerCase());
    });
  });
  return answer === "y" || answer === "yes";
}

async function runMake(target, makeArgs = [], prefix) {
  return new Promise((resolve) => {
    const child = spawn("make", [target, ...makeArgs], {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const writePrefixed = (stream, data) => {
      for (const line of data.toString().split("\n")) {
        if (!line) continue;
        stream.write(prefix ? `${prefix} ${line}\n` : `${line}\n`);
      }
    };
    child.stdout.on("data", (d) => writePrefixed(process.stdout, d));
    child.stderr.on("data", (d) => writePrefixed(process.stderr, d));
    child.on("close", (code) => resolve({ target, code: code ?? 1 }));
  });
}

function printPostShip(results, { apiChanged, mobileChanged, surfaces, platforms }) {
  console.log("\n## Ship-it complete\n");

  console.log("### Outcome");
  for (const result of results) {
    const icon = result.code === 0 ? "✅" : "❌";
    console.log(`- ${icon} ${result.target}: ${result.code === 0 ? "success" : `failed (exit ${result.code})`}`);
  }

  console.log("\n### Git reminder");
  console.log("- Version/build commits may exist locally; run when ready:");
  console.log("  git push origin main");

  if (apiChanged) {
    console.log("\n### Production server (run manually on server)");
    console.log("cd __DEPLOY_ROOT__/docker/deploy");
    console.log("make upgrade");
    console.log("make health");
  }

  if (mobileChanged) {
    const anyFail = results.some((r) => r.target.includes("mobile") && r.code !== 0);
    if (anyFail) {
      console.log("\n### Mobile retry hints");
      console.log("- Retry failed platform without bumping buildNumber:");
      console.log("  SKIP_BUILD_BUMP=1 make mobile-ios-beta");
      console.log("  SKIP_BUILD_BUMP=1 make mobile-android-beta");
    } else if (platforms?.length === 1) {
      const other = platforms[0] === "ios" ? "android" : "ios";
      console.log("\n### Keep stores in sync");
      console.log(
        `- ${other} was not shipped this run. Bring it to the SAME build (no new bump):`,
      );
      console.log(`  SKIP_BUILD_BUMP=1 make mobile-${other}-beta`);
    }
  }

  if (
    surfaces.webAdmin.length > 0 ||
    surfaces.webSite.length > 0 ||
    surfaces.webApp.length > 0
  ) {
    console.log("\n### Web manual deploy");
    if (surfaces.webAdmin.length > 0) console.log("- Deploy __PROJECT_SLUG__-admin after push");
    if (surfaces.webSite.length > 0) console.log("- Deploy __PROJECT_SLUG__-site after push");
    if (surfaces.webApp.length > 0) {
      console.log("- Deploy __PROJECT_SLUG__-app after push (optional: make web-app-deploy-check)");
    }
  }
}

async function main() {
  process.chdir(ROOT);

  const apiMarker = await findLastMarker(API_MARKER_GREP);
  const mobileMarker = await findLastMarker(MOBILE_MARKER_GREP);
  const mainRef = await resolveMainRef();

  const apiFiles = await collectChangedFiles(apiMarker);
  const mobileFiles = await collectChangedFiles(mobileMarker);
  const allFiles = [...new Set([...apiFiles, ...mobileFiles])];

  const surfaces = classifyFiles(allFiles);
  surfaces.api = apiFiles.filter((f) => f.startsWith("api/"));
  surfaces.mobile = mobileFiles.filter((f) => f.startsWith("mobile/"));

  const apiChanged = surfaces.api.length > 0;
  const mobileChanged = surfaces.mobile.length > 0;

  const apiBaselineNote = apiMarker
    ? `since ${apiMarker.slice(0, 7)}`
    : `since ${mainRef} (no API marker)`;
  const mobileBaselineNote = mobileMarker
    ? `since ${mobileMarker.slice(0, 7)}`
    : `since ${mainRef} (no mobile marker)`;

  const apiPkg = readJson("api/package.json");
  const mobilePkg = readJson("mobile/package.json");

  const warnings = [];
  if (await isDirtyTree()) {
    warnings.push("Working tree has uncommitted changes");
  }
  if (await hasUnpushedCommits()) {
    warnings.push("Local commits not pushed to remote yet");
  }
  if (surfaces.wyscanHint.length > 0 && hasWyscanFileDeps(surfaces.wyscanHint)) {
    warnings.push("Wyscan file: deps may have changed — consider make wyscan-dev-setup");
  }

  console.log("Ship-it: analyzing changes…");

  const gates = await runPreflight(surfaces);
  const preflightFailed = gates.some((g) => g.status === "fail");

  printPlan({
    surfaces,
    apiMarker,
    mobileMarker,
    apiBaselineNote,
    mobileBaselineNote,
    apiPkg,
    mobilePkg,
    gates,
    warnings,
    apiChanged,
    mobileChanged,
    platforms: PLATFORMS,
  });

  if (preflightFailed) {
    console.error("\nPre-flight failed — fix issues above before shipping.");
    process.exit(1);
  }

  if (!apiChanged && !mobileChanged) {
    console.log("\nNo API/mobile changes to ship.");
    process.exit(0);
  }

  if (PLAN_ONLY) {
    console.log("\n--plan-only: stopping before confirmation and execution.");
    process.exit(0);
  }

  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log("\nAborted — no release commands executed.");
    process.exit(0);
  }

  const jobs = [];
  if (apiChanged) {
    jobs.push({ target: "api-docker-release", makeArgs: ["TAG=latest"], prefix: "[api]" });
  }
  if (mobileChanged) {
    jobs.push({
      target: "mobile-beta-select",
      makeArgs: mobileMakeArgs(PLATFORMS),
      prefix: "[mobile]",
    });
  }

  console.log("\nExecuting ship jobs…");
  const results = await Promise.all(
    jobs.map((job) => runMake(job.target, job.makeArgs, job.prefix)),
  );

  printPostShip(results, { apiChanged, mobileChanged, surfaces, platforms: PLATFORMS });

  const failed = results.some((r) => r.code !== 0);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
