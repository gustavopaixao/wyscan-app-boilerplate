import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { ecosystemPathFor } from "../src/config/derive.mjs";
import { findEcosystem, ecosystemIsUsable, looksNested } from "../src/cli/preflight.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "create.mjs");

/**
 * Run the CLI, capturing status and BOTH streams.
 *
 * The diagnostic goes to stderr while the plan goes to stdout, and some cases
 * assert across both, so neither can be dropped.
 */
function run(args, cwd) {
  const r = spawnSync("node", [CLI, ...args], { encoding: "utf8", cwd });
  return { status: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/** A throwaway directory to generate into; nothing beside it. */
function sandbox() {
  return mkdtempSync(join(tmpdir(), "wab-pre-"));
}

/** Make `<parent>/<name>/Packages` look like a real checkout. */
function fakeCheckout(parent, name = "WyscanDev") {
  const dir = join(parent, name, "Packages");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * `local` mode's `file:` links are `../../<ecosystem>/Packages` relative to
 * `<target>/api`. That depth is template text, so it can only be pinned from
 * outside — if a re-sync changes it, this is what notices.
 */
describe("ecosystemPathFor", () => {
  test("resolves beside the project, not inside it", () => {
    assert.equal(
      ecosystemPathFor("/a/b/proj", "WyscanDev"),
      resolve("/a/b/WyscanDev/Packages"),
    );
  });

  test("honours a custom ecosystem directory name", () => {
    assert.equal(ecosystemPathFor("/a/b/proj", "Shared"), resolve("/a/b/Shared/Packages"));
  });

  test("defaults to WyscanDev", () => {
    assert.equal(ecosystemPathFor("/a/b/proj"), resolve("/a/b/WyscanDev/Packages"));
  });

  test("agrees with what api/package.json will say", () => {
    // `<target>/api` + `../../WyscanDev/Packages` — the literal in the template.
    const target = "/a/b/proj";
    assert.equal(
      ecosystemPathFor(target),
      resolve(join(target, "api"), "../../WyscanDev/Packages"),
    );
  });
});

describe("findEcosystem", () => {
  test("finds a checkout at the expected place", () => {
    const box = sandbox();
    try {
      const target = join(box, "proj");
      const expected = fakeCheckout(box);
      const r = findEcosystem(target);
      assert.equal(r.found, expected);
      assert.equal(r.expected, expected);
      assert.ok(ecosystemIsUsable(target));
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("names a checkout that is merely one level too high", () => {
    // Exactly the reported failure: generating one directory deeper than usual.
    const box = sandbox();
    try {
      const nestedTarget = join(box, "outer", "proj");
      const actual = fakeCheckout(box);
      const r = findEcosystem(nestedTarget);

      assert.notEqual(r.found, r.expected, "should not consider this usable");
      assert.equal(r.found, actual, "should still locate the real checkout");
      assert.equal(r.levelsUp, 2);
      assert.ok(!ecosystemIsUsable(nestedTarget));
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("reports nothing when there is nothing to find", () => {
    const box = sandbox();
    try {
      const r = findEcosystem(join(box, "proj"));
      assert.equal(r.found, null);
      assert.match(r.expected, /WyscanDev[/\\]Packages$/);
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });
});

describe("looksNested", () => {
  test("spots a target inside an existing generated project", () => {
    const box = sandbox();
    try {
      const outer = join(box, "existing");
      mkdirSync(join(outer, "api"), { recursive: true });
      writeFileSync(join(outer, "Makefile"), "");
      writeFileSync(join(outer, "api", "package.json"), "{}");

      assert.equal(looksNested(join(outer, "inner")), outer);
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("is quiet about an ordinary directory", () => {
    const box = sandbox();
    try {
      assert.equal(looksNested(join(box, "proj")), null);
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });
});

/**
 * The behaviour that actually protects a user: `local` without a checkout used
 * to write and commit a whole project, then fail at `pnpm install` and exit 0.
 */
describe("local mode refuses before writing", () => {
  test("--wyscan local with no checkout exits 2 and writes nothing", () => {
    const box = sandbox();
    try {
      const target = join(box, "proj");
      const r = run(["--slug", "pf-demo", "--wyscan", "local", "--yes", target], box);

      assert.equal(r.status, 2, r.out);
      assert.match(r.out, /local checkout not found/);
      assert.ok(!existsSync(target), "the target directory must not exist");
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("the message names the checkout it found nearby", () => {
    const box = sandbox();
    try {
      fakeCheckout(box);
      const target = join(box, "outer", "proj");
      const r = run(["--slug", "pf-demo", "--wyscan", "local", "--yes", target], box);

      assert.equal(r.status, 2);
      // Pointing at the real checkout is the difference between fixing this and
      // cloning a second copy of a repo you already have.
      assert.match(r.out, /one level higher/);
      assert.ok(r.out.includes(join(box, "WyscanDev", "Packages")), r.out);
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("--allow-missing-ecosystem generates anyway, with a warning", () => {
    const box = sandbox();
    try {
      const target = join(box, "proj");
      const r = run(
        [
          "--slug", "pf-demo",
          "--wyscan", "local",
          "--yes",
          "--allow-missing-ecosystem",
          "--no-git",
          target,
        ],
        box,
      );

      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /continuing anyway/);
      assert.ok(readdirSync(target).length > 0, "should have written the project");
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("a real checkout beside the target passes without comment", () => {
    const box = sandbox();
    try {
      fakeCheckout(box);
      const target = join(box, "proj");
      const r = run(
        ["--slug", "pf-demo", "--wyscan", "local", "--yes", "--no-git", target],
        box,
      );

      assert.equal(r.status, 0, r.out);
      assert.ok(!/local checkout not found/.test(r.out), r.out);
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("standalone is untouched by any of this", () => {
    const box = sandbox();
    try {
      const target = join(box, "proj");
      const r = run(
        ["--slug", "pf-demo", "--wyscan", "standalone", "--yes", "--no-git", target],
        box,
      );

      assert.equal(r.status, 0, r.out);
      assert.ok(!/local checkout/.test(r.out));
      assert.ok(existsSync(join(target, "packages/stubs")));
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("--dry-run warns but still prints the plan", () => {
    const box = sandbox();
    try {
      const target = join(box, "proj");
      const r = run(["--slug", "pf-demo", "--wyscan", "local", "--yes", "--dry-run", target], box);

      // A preview should still show what you would get.
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /local checkout not found/);
      assert.ok(!existsSync(target), "dry-run must not write");
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("an api-less, mobile-less project does not need a checkout", () => {
    // Nothing links into the ecosystem, so local mode is harmless there.
    const box = sandbox();
    try {
      const target = join(box, "proj");
      const r = run(
        [
          "--slug", "pf-demo",
          "--wyscan", "local",
          "--workspaces", "web:site",
          "--yes", "--no-git",
          target,
        ],
        box,
      );

      assert.equal(r.status, 0, r.out);
      assert.ok(!/local checkout not found/.test(r.out), r.out);
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });
});

/**
 * There was no coverage of the install step at all, so the doomed-install path
 * could regress silently.
 */
describe("install is not attempted when it cannot work", () => {
  test("--install with a missing checkout skips pnpm and says so", () => {
    const box = sandbox();
    try {
      const target = join(box, "proj");
      const r = run(
        [
          "--slug", "pf-demo",
          "--wyscan", "local",
          "--yes",
          "--allow-missing-ecosystem",
          "--install",
          "--no-git",
          target,
        ],
        box,
      );

      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /skipped pnpm install/);
      // The raw pnpm failure is what this whole change exists to prevent.
      assert.ok(!/ERR_PNPM_LINKED_PKG_DIR_NOT_FOUND/.test(r.out), r.out);
      assert.ok(!existsSync(join(target, "api", "node_modules")), "must not have installed");
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });
});
