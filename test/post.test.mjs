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
  const dir = mkdtempSync(join(tmpdir(), "wab-post-"));
  execFileSync("node", [CLI, ...args, dir], { encoding: "utf8" });
  return dir;
}

const git = (dir, args) =>
  execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();

describe("post-scaffold git", () => {
  test("initialises a repo with exactly one commit and a clean tree", () => {
    const dir = generate(["--slug", "git-demo", "--owner", "octocat", "--workspaces", "api"]);

    assert.ok(existsSync(join(dir, ".git")), "should be a git repo");
    assert.equal(git(dir, ["rev-list", "--count", "HEAD"]), "1");
    assert.equal(git(dir, ["branch", "--show-current"]), "main");
    assert.equal(git(dir, ["status", "--porcelain"]), "", "working tree should be clean");
    assert.ok(Number(git(dir, ["ls-files"]).split("\n").length) > 50);

    rmSync(dir, { recursive: true, force: true });
  });

  test("--no-git leaves the tree unversioned", () => {
    const dir = generate(["--slug", "nogit-demo", "--workspaces", "api", "--no-git"]);
    assert.ok(!existsSync(join(dir, ".git")));
    rmSync(dir, { recursive: true, force: true });
  });

  test("ignores machine-local assistant settings in the project's own gitignore", () => {
    // The reference relied on the author's global gitignore, so a fresh clone
    // would have committed the local allowlist.
    const dir = generate(["--slug", "ign-demo", "--workspaces", "api"]);
    const ignore = readFileSync(join(dir, ".gitignore"), "utf8");
    assert.ok(ignore.includes(".claude/settings.local.json"));

    const rule = execFileSync(
      "git",
      ["check-ignore", "-v", ".claude/settings.local.json"],
      { cwd: dir, encoding: "utf8" },
    );
    assert.ok(rule.startsWith(".gitignore:"), `should match the project gitignore, got: ${rule}`);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("non-interactive behaviour", () => {
  test("--yes needs no input and never hangs", () => {
    const dir = mkdtempSync(join(tmpdir(), "wab-yes-"));
    const out = execFileSync("node", [CLI, "--slug", "yes-demo", "--yes", dir], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    });
    assert.match(out, /files written/);
    rmSync(dir, { recursive: true, force: true });
  });

  test("--print-config resolves derivations without writing anything", () => {
    const out = execFileSync(
      "node",
      [CLI, "--slug", "cfg-demo", "--owner", "octocat", "--print-config"],
      { encoding: "utf8" },
    );
    const cfg = JSON.parse(out);
    assert.equal(cfg.slug, "cfg-demo");
    assert.equal(cfg.displayName, "Cfg Demo");
    // Reverse-DNS segments may not contain hyphens.
    assert.equal(cfg.bundleId, "com.cfgdemo.app");
    assert.equal(cfg.imageRegistry, "ghcr.io/octocat");
    assert.equal(cfg.apiDomain, "api.cfg-demo.com");
    assert.ok(!existsSync(resolve("./cfg-demo")), "must not create a directory");
  });

  test("rejects an invalid slug rather than generating something broken", () => {
    assert.throws(() =>
      execFileSync("node", [CLI, "--slug", "Bad_Slug", "--yes", "/tmp/wab-never"], {
        encoding: "utf8",
        stdio: "pipe",
      }),
    );
  });
});
