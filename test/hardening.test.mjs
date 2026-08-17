import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { writeProject } from "../src/generate/write.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "create.mjs");
const TEMPLATES = join(ROOT, "templates");

function generate(args) {
  const dir = mkdtempSync(join(tmpdir(), "wab-hard-"));
  execFileSync("node", [CLI, ...args, dir], { encoding: "utf8" });
  return dir;
}

function cliFails(args) {
  try {
    execFileSync("node", [CLI, ...args], { encoding: "utf8", stdio: "pipe" });
    return null;
  } catch (e) {
    return (e.stdout ?? "") + (e.stderr ?? "");
  }
}

describe("input validation", () => {
  const cases = [
    ["--wyscan", "bogus", /shared-package mode "bogus" is not recognised/],
    ["--workspaces", "bogus", /workspace "bogus" is not recognised/],
    ["--ai", "bogus", /ai tool "bogus" is not recognised/],
    ["--services", "bogus", /service "bogus" is not recognised/],
  ];

  for (const [flag, value, expected] of cases) {
    test(`${flag} rejects an unknown value instead of generating silently`, () => {
      const out = cliFails(["--slug", "val-demo", flag, value, "--yes", "--dry-run", "/tmp/wab-nope"]);
      assert.ok(out, `${flag} ${value} should have failed`);
      assert.match(out, expected);
    });
  }
});

describe("rollback safety", () => {
  test("a failed write never deletes files the run did not create", () => {
    // --force allows a populated target. Previously any generation error ran
    // rmSync(targetDir, {recursive:true}), taking the user's files with it.
    const dir = mkdtempSync(join(tmpdir(), "wab-precious-"));
    writeFileSync(join(dir, "important.txt"), "IRREPLACEABLE");
    mkdirSync(join(dir, "mywork"));
    writeFileSync(join(dir, "mywork/db.sql"), "data");

    assert.throws(() =>
      writeProject([{ src: "tree/DOES_NOT_EXIST", dest: "boom.txt", mode: 644, raw: false }], {
        templatesDir: TEMPLATES,
        targetDir: dir,
        values: { slug: "x" },
      }),
    );

    assert.equal(readFileSync(join(dir, "important.txt"), "utf8"), "IRREPLACEABLE");
    assert.ok(existsSync(join(dir, "mywork/db.sql")));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("hyphenated slugs", () => {
  test("do not produce an invalid JS identifier in app.config.ts", () => {
    // `const <slug>SchemeFilter` is a syntax error for any hyphenated slug —
    // and `my-app` is the README's own example.
    const dir = generate(["--slug", "my-app", "--workspaces", "mobile", "--yes"]);
    const cfgFile = readFileSync(join(dir, "mobile/app.config.ts"), "utf8");
    assert.ok(!/const\s+[\w-]*-[\w-]*SchemeFilter/.test(cfgFile), "identifier must not contain a hyphen");
    assert.match(cfgFile, /const appSchemeFilter/);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("shared-package modes leave a buildable project", () => {
  test("metro config has no dangling references outside local mode", () => {
    for (const mode of ["standalone", "registry"]) {
      const dir = generate(["--slug", `mc-${mode}`, "--workspaces", "mobile", "--wyscan", mode, "--yes"]);
      const metro = readFileSync(join(dir, "mobile/metro.config.js"), "utf8");
      // Stripping the ecosystem lines used to leave these declared-nowhere.
      for (const ref of ["wyscanRNRoot", "coreRNRoot", "analyticsRNRoot"]) {
        assert.ok(!metro.includes(ref), `${mode}: ${ref} should not survive`);
      }
      execFileSync("node", ["--check", join(dir, "mobile/metro.config.js")]);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("standalone Dockerfile does not COPY a script it never ships", () => {
    const dir = generate(["--slug", "df-demo", "--workspaces", "api", "--wyscan", "standalone", "--yes"]);
    const dockerfile = readFileSync(join(dir, "api/Dockerfile"), "utf8");
    assert.ok(!existsSync(join(dir, "api/scripts/prepare-deps.sh")));
    // Any surviving mention must be the `|| true` guarded one.
    for (const line of dockerfile.split("\n").filter((l) => l.includes("prepare-deps.sh"))) {
      assert.match(line, /\|\| true/, `unguarded reference: ${line}`);
    }
    rmSync(dir, { recursive: true, force: true });
  });

  test("registry mode drops the dev-script prebuild that needs a sibling checkout", () => {
    const dir = generate(["--slug", "rg-demo", "--workspaces", "api", "--wyscan", "registry", "--yes"]);
    const pkg = JSON.parse(readFileSync(join(dir, "api/package.json"), "utf8"));
    assert.ok(!pkg.scripts["dev:watch"].includes("ensure-auth-api-dist"));
    assert.ok(!existsSync(join(dir, "api/scripts/ensure-auth-api-dist.sh")));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("workspace-targeted CI", () => {
  test("no workflow ships for a project without the web app it targets", () => {
    const dir = generate(["--slug", "ci-api", "--workspaces", "api", "--ai", "github", "--yes"]);
    assert.ok(!existsSync(join(dir, ".github/workflows/ci-api-app.yml")));
    rmSync(dir, { recursive: true, force: true });
  });

  test("the workflow ships when its web app is selected", () => {
    const dir = generate(["--slug", "ci-web", "--workspaces", "web:app", "--ai", "github", "--yes"]);
    assert.ok(existsSync(join(dir, ".github/workflows/ci-web-app.yml")));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("ports affect generated output, not just docs", () => {
  test("a custom web port reaches the package.json dev script", () => {
    const cfgPath = join(mkdtempSync(join(tmpdir(), "wab-port-")), "cfg.json");
    writeFileSync(
      cfgPath,
      JSON.stringify({ slug: "port-demo", workspaces: ["web:site"], ports: { site: 3999 } }),
    );
    const dir = generate(["--config", cfgPath, "--yes"]);
    const pkg = JSON.parse(readFileSync(join(dir, "web/port-demo-site/package.json"), "utf8"));
    assert.match(pkg.scripts.dev, /-p 3999/);
    rmSync(dir, { recursive: true, force: true });
  });

  test("a custom api port reaches the compose default", () => {
    const cfgPath = join(mkdtempSync(join(tmpdir(), "wab-port2-")), "cfg.json");
    writeFileSync(
      cfgPath,
      JSON.stringify({ slug: "port-api", workspaces: ["api"], ports: { api: 3999 } }),
    );
    const dir = generate(["--config", cfgPath, "--yes"]);
    const yml = readFileSync(join(dir, "docker/docker-compose.yml"), "utf8");
    assert.match(yml, /\$\{API_PORT:-3999\}/);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("compose service selection", () => {
  test("a typo in a full --services list still prunes", () => {
    // Length-equality used to make a 6-element list with a typo skip pruning
    // entirely, silently keeping every service.
    const dir = generate([
      "--slug", "svc-demo",
      "--workspaces", "api",
      "--services", "redis,mongodb,api,realtime,log-agent,nginx",
      "--yes",
    ]);
    const yml = readFileSync(join(dir, "docker/docker-compose.yml"), "utf8");
    assert.ok(yml.includes("container_name: svc-demo-nginx"));
    rmSync(dir, { recursive: true, force: true });
  });
});
