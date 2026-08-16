import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "create.mjs");

function generate(args) {
  const dir = mkdtempSync(join(tmpdir(), "wab-mode-"));
  execFileSync("node", [CLI, ...args, dir], { encoding: "utf8" });
  return dir;
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

describe("standalone mode", () => {
  test("removes every shared-package linkage that would break install", () => {
    const dir = generate(["--slug", "sa-demo", "--owner", "octocat", "--wyscan", "standalone"]);

    const api = readJson(join(dir, "api/package.json"));
    const specs = Object.values(api.dependencies).map(String);
    assert.ok(!specs.some((s) => s.includes("WyscanDev")), "no file: link into the sibling repo");
    assert.ok(
      !Object.values(api.pnpm?.overrides ?? {}).some((s) => String(s).includes("WyscanDev")),
      "overrides must not point at the sibling repo",
    );

    // Dev scripts must not prebuild packages that are not there.
    assert.ok(!api.scripts["dev:watch"].includes("ensure-auth-api-dist"));

    // Bootstrap scripts and their Make targets go away entirely.
    assert.ok(!existsSync(join(dir, "scripts/init-wyscan-dev.sh")));
    assert.ok(!existsSync(join(dir, "api/scripts/ensure-auth-api-dist.sh")));
    const setup = readFileSync(join(dir, "make/setup.mk"), "utf8");
    assert.ok(!setup.includes("wyscan-dev-setup:"));

    // Stubs are present for every package the source actually imports.
    for (const p of ["core-api", "auth-api", "notify-api", "core-react-native"]) {
      assert.ok(existsSync(join(dir, "packages/stubs", p, "package.json")), `${p} stub missing`);
    }

    rmSync(dir, { recursive: true, force: true });
  });

  test("keeps the linkage in local mode", () => {
    const dir = generate(["--slug", "lo-demo", "--owner", "octocat", "--wyscan", "local"]);
    const api = readJson(join(dir, "api/package.json"));
    assert.ok(Object.values(api.dependencies).some((s) => String(s).includes("WyscanDev")));
    assert.ok(existsSync(join(dir, "scripts/init-wyscan-dev.sh")));
    assert.ok(!existsSync(join(dir, "packages/stubs")));
    // Lockfiles are only valid when the linkage is intact.
    assert.ok(existsSync(join(dir, "api/pnpm-lock.yaml")));
    rmSync(dir, { recursive: true, force: true });
  });

  test("registry mode replaces file: specs with ranges and drops stale lockfiles", () => {
    const dir = generate(["--slug", "rg-demo", "--owner", "octocat", "--wyscan", "registry"]);
    const api = readJson(join(dir, "api/package.json"));
    const scoped = Object.entries(api.dependencies).filter(([k]) => k.startsWith("@octocat/"));
    assert.ok(scoped.length > 0, "scoped deps should remain");
    assert.ok(scoped.every(([, v]) => !String(v).startsWith("file:")), "none may stay file:");
    assert.ok(!existsSync(join(dir, "api/pnpm-lock.yaml")));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("generated CLAUDE.md", () => {
  test("imports the always-apply rules the reference never loaded", () => {
    const dir = generate(["--slug", "cm-demo", "--owner", "octocat"]);
    const md = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    for (const r of ["requirements", "references", "error-handling", "shell-commands"]) {
      assert.ok(md.includes(`@.claude/rules/${r}.md`), `should import ${r}`);
    }
    // ...and must not repeat the reference's false claims.
    assert.ok(!md.includes("no code yet"));
    assert.ok(!md.includes("not yet a git repository"));
    rmSync(dir, { recursive: true, force: true });
  });

  test("documents only the selected workspaces", () => {
    const dir = generate(["--slug", "cm-two", "--workspaces", "api"]);
    const md = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    assert.ok(md.includes("`api/`"));
    assert.ok(!md.includes("make mobile-dev"));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("Claude hooks", () => {
  test("gate every selected workspace, including the main web app", () => {
    const dir = generate(["--slug", "hk-demo", "--owner", "octocat"]);
    const gate = readFileSync(join(dir, ".claude/hooks/pre-commit-gate.sh"), "utf8");
    // The reference omitted web/<slug>-app entirely.
    for (const ws of ["api/", "web/hk-demo-site/", "web/hk-demo-app/", "web/hk-demo-admin/", "mobile/"]) {
      assert.ok(gate.includes(`'^${ws}'`), `pre-commit gate should cover ${ws}`);
    }
    rmSync(dir, { recursive: true, force: true });
  });

  test("gate nothing that was not generated", () => {
    const dir = generate(["--slug", "hk-two", "--workspaces", "api"]);
    const gate = readFileSync(join(dir, ".claude/hooks/pre-commit-gate.sh"), "utf8");
    assert.ok(gate.includes("'^api/'"));
    assert.ok(!gate.includes("web/"));
    assert.ok(!gate.includes("mobile"));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("promised-but-missing docs", () => {
  test("ships the nested CLAUDE.md files .claude/README.md advertises", () => {
    const dir = generate(["--slug", "nd-demo", "--owner", "octocat"]);
    assert.ok(existsSync(join(dir, "api/CLAUDE.md")));
    assert.ok(existsSync(join(dir, "mobile/CLAUDE.md")));
    // The mobile one is the only route by which the safe-area rule is loaded.
    assert.ok(readFileSync(join(dir, "mobile/CLAUDE.md"), "utf8").includes("useSafeAreaInsets"));
    assert.ok(existsSync(join(dir, "docs/shared-packages.md")));
    rmSync(dir, { recursive: true, force: true });
  });
});
