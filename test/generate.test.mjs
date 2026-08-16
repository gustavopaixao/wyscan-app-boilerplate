import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { allSentinels } from "../src/tokens/catalog.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "create.mjs");
const MANIFEST = JSON.parse(readFileSync(join(ROOT, "templates", "manifest.json"), "utf8"));

/** Literals from the reference project that must never reach a generated tree. */
const FORBIDDEN = ["botonistas", "gustavopaixao", "gmpaixao", "palpitepro"];

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
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
    const notExecutable = MANIFEST.files
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
