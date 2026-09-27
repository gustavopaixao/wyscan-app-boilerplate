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
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
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
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
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
      rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
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
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  test("registry mode drops the dev-script prebuild that needs a sibling checkout", () => {
    const dir = generate(["--slug", "rg-demo", "--workspaces", "api", "--wyscan", "registry", "--yes"]);
    const pkg = JSON.parse(readFileSync(join(dir, "api/package.json"), "utf8"));
    assert.ok(!pkg.scripts["dev:watch"].includes("ensure-auth-api-dist"));
    assert.ok(!existsSync(join(dir, "api/scripts/ensure-auth-api-dist.sh")));
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });
});

describe("workspace-targeted CI", () => {
  test("no workflow ships for a project without the web app it targets", () => {
    const dir = generate(["--slug", "ci-api", "--workspaces", "api", "--ai", "github", "--yes"]);
    assert.ok(!existsSync(join(dir, ".github/workflows/ci-api-app.yml")));
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  test("the workflow ships when its web app is selected", () => {
    const dir = generate(["--slug", "ci-web", "--workspaces", "web:app", "--ai", "github", "--yes"]);
    assert.ok(existsSync(join(dir, ".github/workflows/ci-web-app.yml")));
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  test("every workspace gets a workflow that runs scripts it actually has", () => {
    const dir = generate(["--slug", "ci-all", "--ai", "github", "--yes"]);
    const workflows = {
      "ci-all-api.yml": "api",
      "ci-all-mobile.yml": "mobile",
      "ci-all-site.yml": "web/ci-all-site",
      "ci-all-app.yml": "web/ci-all-app",
      "ci-all-admin.yml": "web/ci-all-admin",
    };
    for (const [file, workspace] of Object.entries(workflows)) {
      const yml = readFileSync(join(dir, ".github/workflows", file), "utf8");
      assert.match(yml, new RegExp(`working-directory: ${workspace}\\n`), `${file}: wrong workspace`);
      assert.ok(!/__[A-Z_]+__/.test(yml), `${file}: unrendered sentinel`);
      const { scripts } = JSON.parse(readFileSync(join(dir, workspace, "package.json"), "utf8"));
      for (const [, script] of yml.matchAll(/run: pnpm (?!install)(\S+)/g)) {
        assert.ok(scripts[script], `${file}: runs "${script}", which ${workspace} does not define`);
      }
    }
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  test("api and mobile workflows ship only where CI can install the shared packages", () => {
    const dir = generate([
      "--slug", "ci-reg", "--workspaces", "api,mobile,web:site", "--wyscan", "registry",
      "--ai", "github", "--yes",
    ]);
    assert.ok(!existsSync(join(dir, ".github/workflows/ci-reg-api.yml")));
    assert.ok(!existsSync(join(dir, ".github/workflows/ci-reg-mobile.yml")));
    assert.ok(existsSync(join(dir, ".github/workflows/ci-reg-site.yml")));
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  test("next steps say to commit the lockfiles a workspace ships without", () => {
    const dir = mkdtempSync(join(tmpdir(), "wab-hard-"));
    const out = execFileSync(
      "node",
      [CLI, "--slug", "ci-lock", "--workspaces", "api,web:site", "--yes", dir],
      { encoding: "utf8" },
    );
    const line = out.split("\n").find((l) => l.includes("git add"));
    assert.ok(line, "no commit-the-lockfile step printed");
    assert.match(line, /api\/pnpm-lock\.yaml/);
    // web/ci-lock-site ships its lockfile, so it must not be listed.
    assert.ok(!line.includes("ci-lock-site"), line);
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
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
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
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
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
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
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });
});
