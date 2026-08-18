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
    // Asserting template content, not install feasibility: these run in a
    // tmpdir with no sibling checkout, which local mode now refuses by default.
    const dir = generate([
      "--slug", "mk-full", "--owner", "octocat",
      "--wyscan", "local", "--allow-missing-ecosystem",
    ]);
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

  test("mobile release targets follow the mobile workspace", () => {
    const withMobile = generate(["--slug", "mk-rel", "--workspaces", "api,mobile"]);
    assert.ok(existsSync(join(withMobile, "make", "mobile-release.mk")));
    for (const t of ["mobile-beta", "mobile-beta-select", "mobile-ios-beta", "mobile-android-beta"]) {
      assert.ok(!make(withMobile, ["-n", t]).includes("No rule to make target"), `${t} should resolve`);
    }
    // ship-it drives mobile-beta-select; without it the shipped release path is dead.
    assert.ok(!make(withMobile, ["-n", "ship-it"]).includes("No rule to make target"));
    rmSync(withMobile, { recursive: true, force: true });

    const apiOnly = generate(["--slug", "mk-norel", "--workspaces", "api"]);
    assert.ok(!existsSync(join(apiOnly, "make", "mobile-release.mk")));
    assert.ok(make(apiOnly, ["-n", "mobile-ios-beta"]).includes("No rule to make target"));
    rmSync(apiOnly, { recursive: true, force: true });
  });

  test("a dry-run beta neither bumps the build nor commits", () => {
    // GNU make executes any recipe line containing $(MAKE) even under -n, so the
    // bump and its git commit have to sit on a line that has none. Regression
    // guard: `make -n mobile-beta` must not touch the repo.
    const dir = generate(["--slug", "mk-dry", "--workspaces", "api,mobile"]);
    const pkg = join(dir, "mobile", "package.json");
    const buildBefore = JSON.parse(readFileSync(pkg, "utf8")).buildNumber;
    const commitsBefore = execFileSync("git", ["rev-list", "--count", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();

    make(dir, ["-n", "mobile-beta"]);

    assert.equal(JSON.parse(readFileSync(pkg, "utf8")).buildNumber, buildBefore, "buildNumber must not change");
    assert.equal(
      execFileSync("git", ["rev-list", "--count", "HEAD"], { cwd: dir, encoding: "utf8" }).trim(),
      commitsBefore,
      "a dry run must not commit",
    );
    assert.equal(
      execFileSync("git", ["status", "--porcelain"], { cwd: dir, encoding: "utf8" }).trim(),
      "",
      "a dry run must leave the tree clean",
    );
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

  test("serialises the install across services sharing api node_modules", () => {
    // api, realtime and log-agent all run ensure-api-node-modules.sh against
    // one shared volume. Starting them together races two pnpm installs and
    // leaves the tree half-written (observed: ERR_PNPM_ENOENT, missing tsx).
    const dir = generate(["--slug", "rc-demo", "--workspaces", "api"]);
    const yml = readFileSync(join(dir, "docker/docker-compose.yml"), "utf8");

    const section = (name) => {
      const start = yml.indexOf(`\n  ${name}:`);
      const after = yml.slice(start + 1);
      const next = after.search(/\n {2}[a-z-]+:\n/);
      return next === -1 ? after : after.slice(0, next);
    };

    // api must be health-gated, or the dependents have nothing to wait on.
    assert.match(section("api"), /healthcheck:/, "api needs a healthcheck");

    for (const svc of ["realtime", "log-agent"]) {
      assert.match(
        section(svc),
        /api:\s*\n\s*condition: service_healthy/,
        `${svc} must wait for api to be healthy`,
      );
    }
    rmSync(dir, { recursive: true, force: true });
  });

  test("stays valid YAML in every shared-package mode", () => {
    // Stripping the ecosystem lines must not leave a childless mapping key
    // (compose rejects `additional_contexts:` with nothing under it).
    for (const mode of ["standalone", "local", "registry"]) {
      const dir = generate([
        "--slug", `ym-${mode}`, "--workspaces", "api",
        // Template content, not install feasibility; see above.
        "--wyscan", mode, "--allow-missing-ecosystem",
      ]);
      const yml = readFileSync(join(dir, "docker/docker-compose.yml"), "utf8");
      const bareKeys = yml
        .split("\n")
        .filter((l, i, all) => {
          if (!/^\s*[A-Za-z_][\w-]*:\s*$/.test(l)) return false;
          const indent = (s) => s.length - s.trimStart().length;
          const next = all.slice(i + 1).find((x) => x.trim() !== "");
          return !next || indent(next) <= indent(l);
        });
      assert.deepEqual(bareKeys, [], `${mode}: keys left with no children`);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
