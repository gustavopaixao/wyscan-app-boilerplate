import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { ecosystemPathFor } from "../src/config/derive.mjs";
import {
  findEcosystem,
  ecosystemIsUsable,
  looksNested,
  scanEcosystem,
} from "../src/cli/preflight.mjs";

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

/**
 * A checkout whose packages are named `@<scope>/<short>-api` and wired to each
 * other with `workspace:*`, which is what the real one does and the whole
 * reason overrides exist.
 *
 * @param {Record<string, string[]>} graph  short name -> short names it needs
 */
function plantPackages(packagesRoot, scope, graph) {
  writeFileSync(
    join(packagesRoot, "pnpm-workspace.yaml"),
    "packages:\n  - 'packages/*/api/nextjs'\n",
  );
  for (const [short, needs] of Object.entries(graph)) {
    const dir = join(packagesRoot, "packages", `wyscan-${short}`, "api", "nextjs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        name: `${scope}/${short}-api`,
        version: "1.0.0",
        dependencies: Object.fromEntries(needs.map((n) => [`${scope}/${n}-api`, "workspace:*"])),
      }),
    );
  }
}

/**
 * The scan is what makes local mode independent of the project's own scope.
 * Its inputs are the checkout's `pnpm-workspace.yaml` globs and package names —
 * both outside this repo, so they can only be pinned from here.
 */
describe("scanEcosystem", () => {
  test("reads names, paths, workspace edges and scopes off the checkout", () => {
    const box = sandbox();
    try {
      const target = join(box, "proj");
      const packagesRoot = fakeCheckout(box);
      plantPackages(packagesRoot, "@acme", { core: [], auth: ["core"], ads: ["auth"] });

      const eco = scanEcosystem(target, "WyscanDev");

      assert.deepEqual(eco.scopes, ["@acme"]);
      assert.equal(eco.packages.length, 3);
      // Relative to the checkout root, because that is the tail of the file: specs.
      assert.deepEqual(
        eco.packages.find((p) => p.name === "@acme/auth-api").path,
        "Packages/packages/wyscan-auth/api/nextjs",
      );
      assert.deepEqual(eco.missing, []);
      assert.equal(eco.edges.length, 2);
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("reports a workspace: dep the checkout does not publish", () => {
    const box = sandbox();
    try {
      const packagesRoot = fakeCheckout(box);
      plantPackages(packagesRoot, "@acme", { auth: ["gone"] });

      const eco = scanEcosystem(join(box, "proj"), "WyscanDev");

      assert.deepEqual(eco.missing, [{ from: "@acme/auth-api", dep: "@acme/gone-api" }]);
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("an empty checkout scans to nothing rather than throwing", () => {
    const box = sandbox();
    try {
      fakeCheckout(box);
      const eco = scanEcosystem(join(box, "proj"), "WyscanDev");
      assert.deepEqual(eco.packages, []);
      assert.deepEqual(eco.scopes, []);
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });
});

/**
 * The scope of the generated project and the scope of the checkout are
 * independent — the first follows `--owner`, the second is whatever the shared
 * packages are published as. When they diverged, the overrides that rewrite the
 * packages' internal `workspace:*` deps matched nothing, and `pnpm install`
 * died with ERR_PNPM_WORKSPACE_PKG_NOT_FOUND naming a package the generated
 * project never mentions.
 */
describe("shared-package scope", () => {
  test("a mismatch is reported and repaired, not left to pnpm", () => {
    const box = sandbox();
    try {
      const target = join(box, "proj");
      const packagesRoot = fakeCheckout(box);
      plantPackages(packagesRoot, "@acme", { core: [], auth: ["core"], ads: ["auth"] });

      const r = run(
        ["--slug", "pf-demo", "--owner", "octocat", "--wyscan", "local", "--yes", "--no-git", target],
        box,
      );

      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /scope mismatch/);
      assert.match(r.out, /@acme/);

      const api = JSON.parse(readFileSync(join(target, "api/package.json"), "utf8"));
      const overrides = api.pnpm.overrides;
      // Reachable through the link, not just linked directly.
      assert.ok(overrides["@acme/auth-api"], "auth-api needs an override under its real name");
      assert.ok(overrides["@acme/core-api"], "and so does its own dependency");
      // The project's own keys are untouched; both sets ship.
      assert.ok(overrides["@octocat/auth-api"], JSON.stringify(overrides));
      // A lockfile whose overrides: block no longer matches is worse than none.
      assert.ok(!existsSync(join(target, "api/pnpm-lock.yaml")), "stale lockfile must be dropped");
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("a matching scope changes nothing and keeps the lockfile", () => {
    const box = sandbox();
    try {
      const target = join(box, "proj");
      const packagesRoot = fakeCheckout(box);
      plantPackages(packagesRoot, "@octocat", { core: [], auth: ["core"], ads: ["auth"] });

      const r = run(
        ["--slug", "pf-demo", "--owner", "octocat", "--wyscan", "local", "--yes", "--no-git", target],
        box,
      );

      assert.equal(r.status, 0, r.out);
      assert.ok(!/scope mismatch/.test(r.out), r.out);

      const api = JSON.parse(readFileSync(join(target, "api/package.json"), "utf8"));
      assert.ok(!Object.keys(api.pnpm.overrides).some((k) => k.startsWith("@acme/")));
      assert.ok(existsSync(join(target, "api/pnpm-lock.yaml")), "lockfile is still valid");
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });

  test("an unresolvable workspace: dep refuses before writing", () => {
    const box = sandbox();
    try {
      const target = join(box, "proj");
      const packagesRoot = fakeCheckout(box);
      plantPackages(packagesRoot, "@acme", { auth: ["gone"] });

      const r = run(
        ["--slug", "pf-demo", "--owner", "acme", "--wyscan", "local", "--yes", "--no-git", target],
        box,
      );

      assert.equal(r.status, 2, r.out);
      assert.match(r.out, /checkout is incomplete/);
      assert.match(r.out, /@acme\/gone-api/);
      assert.ok(!existsSync(target), "nothing may be written");
    } finally {
      rmSync(box, { recursive: true, force: true });
    }
  });
});
