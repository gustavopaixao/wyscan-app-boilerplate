import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "create.mjs");
const GROUPS = JSON.parse(readFileSync(join(ROOT, "templates", "makefile-groups.json"), "utf8"));
const TARGETS = Object.keys(GROUPS).filter((k) => !k.startsWith("_"));

function generate(args) {
  const dir = mkdtempSync(join(tmpdir(), "wab-mk-"));
  execFileSync("node", [CLI, ...args, dir], { encoding: "utf8" });
  return dir;
}

function make(dir, args) {
  try {
    return execFileSync("make", args, { cwd: dir, encoding: "utf8", stdio: "pipe" });
  } catch (e) {
    // Recursive `$(MAKE)` lines run even under -n, so a non-zero exit does not
    // mean the target is broken. Resolution is what we assert.
    return (e.stdout ?? "") + (e.stderr ?? "");
  }
}

describe("generated Makefile", () => {
  test("every mapped target resolves", () => {
    // local mode keeps the shared-package bootstrap targets, so this is the
    // configuration in which the full target set should exist.
    const dir = generate(["--slug", "mk-full", "--owner", "octocat", "--wyscan", "local"]);
    const unresolved = TARGETS.filter((t) => make(dir, ["-n", t]).includes("No rule to make target"));
    assert.deepEqual(unresolved, []);
    rmSync(dir, { recursive: true, force: true });
  });

  test("help lists targets from every included group", () => {
    const dir = generate(["--slug", "mk-help", "--owner", "octocat"]);
    const help = make(dir, ["help"]);
    for (const t of ["api-build", "mobile-dev", "site-dev", "ship-it", "features-index"]) {
      assert.ok(help.includes(t), `help should list ${t}`);
    }
    rmSync(dir, { recursive: true, force: true });
  });

  test("deselected groups leave no fragment and no target", () => {
    const dir = generate([
      "--slug", "mk-min",
      "--workspaces", "api",
      "--make-groups", "api-build,docs",
    ]);
    const fragments = readdirSync(join(dir, "make"));
    assert.deepEqual(fragments.sort(), ["api-build.mk", "docs.mk"]);

    // A target from an excluded group must be genuinely gone.
    assert.ok(make(dir, ["-n", "mobile-dev"]).includes("No rule to make target"));
    assert.ok(make(dir, ["-n", "api-docker-build"]).includes("No rule to make target"));

    // ...while an included one still resolves.
    assert.ok(!make(dir, ["-n", "api-lint"]).includes("No rule to make target"));
    rmSync(dir, { recursive: true, force: true });
  });

  test("cross-group prerequisites stay valid for any subset", () => {
    // push-check spans api-build and mobile. With only api-build selected it
    // must still resolve, running just the API half.
    const dir = generate([
      "--slug", "mk-cross",
      "--workspaces", "api",
      "--make-groups", "api-build,verify",
    ]);
    const out = make(dir, ["-n", "push-check"]);
    assert.ok(!out.includes("No rule to make target"), "push-check should resolve");
    assert.ok(out.includes("pnpm lint"), "should run the API lint half");
    assert.ok(!out.includes("mobile"), "should not reference the absent mobile workspace");
    rmSync(dir, { recursive: true, force: true });
  });

  test("aliases are declared phony alongside their primary target", () => {
    const dir = generate(["--slug", "mk-alias", "--workspaces", "api", "--make-groups", "docker-dev"]);
    const mk = readFileSync(join(dir, "make", "docker-dev.mk"), "utf8");
    const phony = mk.split("\n").find((l) => l.startsWith(".PHONY:"));
    for (const alias of ["dev-up", "dev-down", "recreate", "dev-restart", "dev-fresh"]) {
      assert.ok(phony.includes(alias), `.PHONY should include the alias ${alias}`);
    }
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("generated compose", () => {
  test("drops deselected services and their depends_on references", () => {
    const dir = generate([
      "--slug", "cp-min",
      "--workspaces", "api",
      "--services", "redis,mongodb,api",
    ]);
    const yml = readFileSync(join(dir, "docker/docker-compose.yml"), "utf8");

    const services = yml
      .slice(yml.indexOf("services:"), yml.indexOf("\nvolumes:"))
      .split("\n")
      .filter((l) => /^ {2}[a-z-]+:/.test(l))
      .map((l) => l.trim().replace(":", ""));

    assert.deepEqual(services.sort(), ["api", "mongodb", "redis"]);
    assert.ok(!yml.includes("container_name: cp-min-nginx"));
    assert.ok(!yml.includes("container_name: cp-min-realtime"));

    // No depends_on may point at a service that no longer exists.
    for (const dropped of ["realtime", "log-agent", "nginx"]) {
      const dependsBlocks = yml.match(/depends_on:[\s\S]*?(?=\n {4}[a-z]|\n {2}[a-z]|$)/g) ?? [];
      for (const b of dependsBlocks) {
        assert.ok(!b.includes(dropped), `depends_on still references ${dropped}`);
      }
    }
    rmSync(dir, { recursive: true, force: true });
  });

  test("keeps every service when none are deselected", () => {
    const dir = generate(["--slug", "cp-full", "--workspaces", "api"]);
    const yml = readFileSync(join(dir, "docker/docker-compose.yml"), "utf8");
    for (const s of ["redis", "mongodb", "api", "realtime", "log-agent", "nginx"]) {
      assert.ok(yml.includes(`container_name: cp-full-${s}`), `${s} should be present`);
    }
    rmSync(dir, { recursive: true, force: true });
  });
});
