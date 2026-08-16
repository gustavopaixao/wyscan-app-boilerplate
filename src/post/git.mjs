/**
 * Post-scaffold steps. Every one is individually skippable and non-fatal: a
 * failure here must never leave an otherwise-good project tree unusable, so
 * problems are collected and reported rather than thrown.
 */

import { execFileSync } from "node:child_process";

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function has(cmd) {
  try {
    run("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

/**
 * `git init` + a single initial commit.
 * @returns {{ok: boolean, sha?: string, warning?: string}}
 */
export function initRepo(targetDir, { message, branch = "main" }) {
  if (!has("git")) return { ok: false, warning: "git not found on PATH; skipped repo init" };

  try {
    run("git", ["init", "-b", branch], targetDir);
  } catch {
    // Older git without -b support.
    try {
      run("git", ["init"], targetDir);
    } catch (e) {
      return { ok: false, warning: `git init failed: ${e.message.trim()}` };
    }
  }

  try {
    run("git", ["add", "-A"], targetDir);
  } catch (e) {
    return { ok: false, warning: `git add failed: ${e.message.trim()}` };
  }

  // Use the caller's identity when configured; fall back only if it is not,
  // so we never silently attribute a commit to the wrong person.
  const args = ["commit", "-q", "-m", message];
  let identity = [];
  try {
    run("git", ["config", "user.email"], targetDir);
  } catch {
    identity = [
      "-c",
      "user.name=Project Scaffold",
      "-c",
      "user.email=scaffold@localhost",
    ];
  }

  try {
    run("git", [...identity, ...args], targetDir);
    const sha = run("git", ["rev-parse", "--short", "HEAD"], targetDir).trim();
    return { ok: true, sha };
  } catch (e) {
    return { ok: false, warning: `git commit failed: ${e.message.trim()}` };
  }
}

/** Optionally create and push a GitHub repo via the gh CLI. */
export function createGithubRepo(targetDir, { owner, slug, visibility = "private" }) {
  if (!has("gh")) return { ok: false, warning: "gh CLI not found; skipped remote creation" };
  try {
    run("gh", ["auth", "status"], targetDir);
  } catch {
    return { ok: false, warning: "gh is not authenticated; skipped remote creation" };
  }
  try {
    run(
      "gh",
      [
        "repo",
        "create",
        owner ? `${owner}/${slug}` : slug,
        `--${visibility}`,
        "--source",
        ".",
        "--remote",
        "origin",
        "--push",
      ],
      targetDir,
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, warning: `gh repo create failed: ${e.message.trim()}` };
  }
}

/** Install dependencies per workspace, sequentially. */
export function installWorkspaces(targetDir, workspaces, cfg, log) {
  const dirs = [];
  if (workspaces.includes("api")) dirs.push("api");
  if (workspaces.includes("mobile")) dirs.push("mobile");
  for (const w of ["site", "app", "admin"]) {
    if (workspaces.includes(`web:${w}`)) dirs.push(`web/${cfg.slug}-${w}`);
  }

  const failures = [];
  for (const d of dirs) {
    log?.(`  installing ${d}…`);
    try {
      execFileSync("pnpm", ["install"], { cwd: `${targetDir}/${d}`, stdio: "inherit" });
    } catch {
      failures.push(d);
    }
  }
  return failures;
}
