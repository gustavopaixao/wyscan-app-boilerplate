import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "create.mjs");

function generate(args) {
  const dir = mkdtempSync(join(tmpdir(), "wab-cmp-"));
  execFileSync("node", [CLI, ...args, dir], { encoding: "utf8" });
  return dir;
}

function make(dir, args, env = {}) {
  return execFileSync("make", ["--no-print-directory", ...args], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

/** Run the shipped zsh harvester against `dir` and return `target:description` lines. */
function harvestZsh(projectDir, dir = projectDir) {
  const script = join(projectDir, "scripts", "completion", "make.zsh");
  const out = execFileSync(
    "zsh",
    ["-f", "-c", `source ${script} >/dev/null 2>&1; _make_fragment_harvest ${dir}`],
    { encoding: "utf8" },
  );
  return out.split("\n").filter(Boolean);
}

/** The project root the shipped widget resolves for `dir` ("" when it declines). */
function rootZsh(projectDir, dir) {
  const script = join(projectDir, "scripts", "completion", "make.zsh");
  try {
    return execFileSync(
      "zsh",
      ["-f", "-c", `source ${script} >/dev/null 2>&1; _make_fragment_root ${dir}`],
      { encoding: "utf8" },
    ).trim();
  } catch {
    return ""; // non-zero exit is the "not ours" answer
  }
}

/** Every target the fragments declare .PHONY — the independent oracle. */
function phonyTargets(dir) {
  const files = [join(dir, "Makefile"), ...readdirSync(join(dir, "make")).map((f) => join(dir, "make", f))];
  const names = new Set();
  for (const f of files) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (!line.startsWith(".PHONY:")) continue;
      for (const t of line.slice(7).trim().split(/\s+/)) if (t) names.add(t);
    }
  }
  return [...names].sort();
}

function has(cmd) {
  try {
    execFileSync("which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("make completion", () => {
  test("ships by default and prints a sourceable snippet", () => {
    const dir = generate(["--slug", "cmp-def", "--owner", "octocat"]);

    assert.ok(existsSync(join(dir, "make", "completion.mk")));
    assert.ok(existsSync(join(dir, "scripts", "completion", "make.zsh")));
    assert.ok(existsSync(join(dir, "scripts", "completion", "make.bash")));

    // `make completion >> ~/.zshrc` is the documented install, so every line of
    // the output has to be valid shell — comments or the source line, nothing else.
    const snippet = make(dir, ["completion"], { SHELL: "/bin/zsh" });
    const lines = snippet.split("\n").filter((l) => l.trim());
    assert.ok(lines.every((l) => l.startsWith("#") || l.startsWith("[ -f ")), snippet);
    assert.ok(snippet.includes(join(dir, "scripts", "completion", "make.zsh")));

    // The path has to be absolute: ~/.zshrc is sourced from the home directory.
    assert.ok(!snippet.includes("[ -f scripts/"), "snippet must not use a relative path");

    const bashSnippet = make(dir, ["completion"], { SHELL: "/bin/bash" });
    assert.ok(bashSnippet.includes(join(dir, "scripts", "completion", "make.bash")));

    rmSync(dir, { recursive: true, force: true });
  });

  test("offers exactly the targets the fragments declare", { skip: !has("zsh") }, () => {
    // zsh's builtin _make follows `include` lines but expands only plain $(VAR),
    // so `include $(wildcard make/*.mk)` leaves it offering `help` alone. The
    // shipped harvester reads the fragments; .PHONY is the independent check.
    const dir = generate(["--slug", "cmp-all", "--owner", "octocat", "--wyscan", "local"]);

    const harvested = harvestZsh(dir).map((l) => l.split(":")[0]).sort();
    assert.deepEqual(harvested, phonyTargets(dir));
    assert.ok(harvested.length > 50, `expected the full target set, got ${harvested.length}`);
    assert.ok(harvested.includes("completion"));

    // Descriptions come along, so the completion list reads like `make help`.
    const described = harvestZsh(dir).filter((l) => l.split(":").slice(1).join(":").trim());
    assert.equal(described.length, harvested.length, "every target should carry its ## help");

    rmSync(dir, { recursive: true, force: true });
  });

  test("only offers targets that survived group pruning", { skip: !has("zsh") }, () => {
    const dir = generate([
      "--slug", "cmp-min",
      "--workspaces", "api",
      "--make-groups", "api-build,completion",
    ]);
    const harvested = harvestZsh(dir).map((l) => l.split(":")[0]);
    assert.ok(harvested.includes("api-lint"));
    assert.ok(!harvested.includes("mobile-dev"), "a pruned target must not be completable");
    rmSync(dir, { recursive: true, force: true });
  });

  test("claims the fragment layout only, from any depth", { skip: !has("zsh") }, () => {
    // An empty root is what hands an unrelated repo back to the shell's own
    // `_make`, so completion everywhere else stays exactly as it was.
    const dir = generate(["--slug", "cmp-out", "--workspaces", "api"]);
    const plain = mkdtempSync(join(tmpdir(), "wab-plain-"));
    writeFileSync(join(plain, "Makefile"), "foo: ## not ours\n\t@true\n");

    assert.equal(rootZsh(dir, plain), "", "a plain Makefile is not ours");
    assert.equal(rootZsh(dir, dir), dir);
    // `make` works from a subdirectory, so completion has to walk up too.
    assert.equal(rootZsh(dir, join(dir, "api", "src")), dir);

    rmSync(plain, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  });

  test("bash completion filters by prefix", { skip: !has("bash") }, () => {
    const dir = generate(["--slug", "cmp-bash", "--workspaces", "api,mobile"]);
    const script = join(dir, "scripts", "completion", "make.bash");
    const out = execFileSync(
      "bash",
      ["-c", `source ${script}; cd ${dir}; COMP_WORDS=(make mobile-a); COMP_CWORD=1;
              _make_fragment_targets make mobile-a make; printf '%s\\n' "\${COMPREPLY[@]}"`],
      { encoding: "utf8" },
    );
    const reply = out.split("\n").filter(Boolean);
    assert.ok(reply.length > 0);
    assert.ok(reply.every((t) => t.startsWith("mobile-a")), out);
    rmSync(dir, { recursive: true, force: true });
  });

  test("deselecting the group leaves no completion files", () => {
    const dir = generate([
      "--slug", "cmp-off",
      "--workspaces", "api",
      "--make-groups", "api-build,docs",
    ]);
    assert.ok(!existsSync(join(dir, "make", "completion.mk")));
    assert.ok(!existsSync(join(dir, "scripts", "completion")));
    rmSync(dir, { recursive: true, force: true });
  });
});
