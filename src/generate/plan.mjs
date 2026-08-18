/**
 * Pure mapping: config + manifest -> FileOp[].
 * No I/O, so the entire pruning surface is directly testable.
 */

import { renderPath } from "../tokens/apply.mjs";
import { stubFileOps, ECOSYSTEM_ONLY_FILES } from "./wyscan.mjs";

/** Groups that are always emitted regardless of selection. */
const ALWAYS = new Set(["core", "make", "scripts", "docs"]);

/**
 * A Make fragment needs both its group selected AND the workspace it drives.
 * Selecting `mobile` targets in an api-only project would produce rules that
 * cd into a directory that was never generated.
 */
const MAKE_GROUP_REQUIRES = {
  "docker-dev": "api",
  "api-dev": "api",
  "api-build": "api",
  "docker-release": "api",
  production: "api",
  mobile: "mobile",
  "mobile-release": "mobile",
  "web:site": "web:site",
  "web:app": "web:app",
  "web:admin": "web:admin",
};

export const ALL_MAKE_GROUPS = [
  "setup",
  "docker-dev",
  "api-dev",
  "api-build",
  "web:site",
  "web:app",
  "web:admin",
  "mobile",
  "mobile-release",
  "docker-release",
  "production",
  "ship",
  "verify",
  "docs",
  // Shell completion for whatever targets ended up selected. Workspace
  // independent: it reads make/*.mk at completion time, so any subset works.
  "completion",
];

/**
 * Make groups follow the workspaces: a group tied to a workspace ships when
 * that workspace does, and everything else (setup, ship, verify, docs) always
 * ships. There is nothing to ask — a group whose workspace is absent would
 * only produce targets that cd into a directory that was never generated.
 */
export function makeGroupsFor(workspaces) {
  return ALL_MAKE_GROUPS.filter((g) => {
    const required = MAKE_GROUP_REQUIRES[g];
    return !required || workspaces.includes(required);
  });
}

/** Map a manifest group to the config flag that gates it. */
function isGroupSelected(group, cfg) {
  if (ALWAYS.has(group)) return true;

  if (group.startsWith("make:")) {
    const mk = group.slice(5);
    if (!cfg.makeGroups.includes(mk)) return false;
    const required = MAKE_GROUP_REQUIRES[mk];
    return !required || cfg.workspaces.includes(required);
  }

  switch (group) {
    case "api":
      return cfg.workspaces.includes("api");
    case "mobile":
      return cfg.workspaces.includes("mobile");
    case "web:site":
      return cfg.workspaces.includes("web:site");
    case "web:app":
      return cfg.workspaces.includes("web:app");
    case "web:admin":
      return cfg.workspaces.includes("web:admin");
    case "docker":
      return cfg.workspaces.includes("api") && cfg.docker !== false;
    case "deploy":
      return cfg.workspaces.includes("api") && cfg.includeDeploy !== false;
    case "ai:claude":
      return cfg.aiTools.includes("claude");
    case "ai:cursor":
      return cfg.aiTools.includes("cursor");
    case "ai:github":
      return cfg.aiTools.includes("github");
    default:
      return true;
  }
}

/**
 * Some AI-tooling files target one specific workspace. The reference ships a
 * single CI workflow for the member web app, gated only on `.github` being
 * wanted — so an api-only project received a workflow whose working-directory
 * is a `web/<slug>-app` that was never generated, and CI failed on first push.
 *
 * Keyed by a substring of the rendered dest, since the dest carries the slug.
 */
const DEST_REQUIRES_WORKSPACE = [
  { match: /^\.github\/workflows\/.*-app\.yml$/, workspace: "web:app" },
  { match: /^\.github\/workflows\/.*-site\.yml$/, workspace: "web:site" },
  { match: /^\.github\/workflows\/.*-admin\.yml$/, workspace: "web:admin" },
];

/** True when a file targets a workspace that was not selected. */
function targetsMissingWorkspace(dest, cfg) {
  const rule = DEST_REQUIRES_WORKSPACE.find((r) => r.match.test(dest));
  return Boolean(rule) && !cfg.workspaces.includes(rule.workspace);
}

/** Files invalidated by a non-local shared-package mode (stale lockfiles). */
function isInvalidated(file, cfg) {
  if (!file.invalidatedBy) return false;
  return file.invalidatedBy.includes(`wyscan:${cfg.wyscanMode}`);
}

/**
 * Pruning the Firebase dependencies rewrites mobile/package.json, which leaves the
 * checked-in lockfile describing packages that are no longer declared — enough to
 * fail `pnpm install --frozen-lockfile`. The lockfile only survives `local` mode
 * anyway (see `invalidatedBy` in the manifest); this covers the remaining case.
 *
 * The rule lives here rather than in manifest.json because the manifest is
 * regenerated wholesale by scripts/sync-from-reference.mjs.
 */
function isStaleWithoutFirebase(file, cfg) {
  return file.dest === "mobile/pnpm-lock.yaml" && !cfg.firebase;
}

/**
 * Same shape, for the other injected rewrite: when the project's scope differs
 * from the checkout's, `addEcosystemOverrides` adds keys to api/package.json
 * that the reference lockfile's `overrides:` block does not carry. pnpm treats
 * a changed override set as a full invalidation — it re-resolves anyway, and
 * `--frozen-lockfile` fails outright — so shipping the lockfile would only
 * promise a reproducibility it cannot keep.
 */
function isStaleUnderMirroredOverrides(file, cfg) {
  if (file.dest !== "api/pnpm-lock.yaml" || cfg.wyscanMode !== "local") return false;
  const eco = cfg.ecosystem;
  return Boolean(eco?.packages?.length) && !eco.scopes.includes(cfg.npmScope);
}

/**
 * @returns {{ops: Array, skipped: Array}} ops = {src, dest, mode, raw}
 */
export function planFiles(manifest, cfg, templatesDir) {
  const ops = [];
  const skipped = [];

  // Standalone mode vendors local stand-ins for the shared packages.
  if (cfg.wyscanMode === "standalone" && templatesDir) {
    const needsStubs =
      cfg.workspaces.includes("api") || cfg.workspaces.includes("mobile");
    if (needsStubs) {
      for (const op of stubFileOps(templatesDir)) {
        ops.push({ ...op, dest: renderPath(op.dest, cfg) });
      }
    }
  }

  for (const file of manifest.files) {
    if (!isGroupSelected(file.group, cfg)) {
      skipped.push({ ...file, reason: `group ${file.group} not selected` });
      continue;
    }
    if (isInvalidated(file, cfg)) {
      skipped.push({ ...file, reason: `lockfile invalid under wyscan=${cfg.wyscanMode}` });
      continue;
    }
    if (isStaleWithoutFirebase(file, cfg)) {
      skipped.push({ ...file, reason: "lockfile stale once Firebase deps are pruned" });
      continue;
    }
    if (isStaleUnderMirroredOverrides(file, cfg)) {
      skipped.push({ ...file, reason: "lockfile stale once shared-package overrides are mirrored" });
      continue;
    }
    // These clone or prebuild the sibling checkout, which only `local` has.
    if (cfg.wyscanMode !== "local" && ECOSYSTEM_ONLY_FILES.has(file.dest)) {
      skipped.push({ ...file, reason: `shared-package bootstrap, unused in ${cfg.wyscanMode}` });
      continue;
    }
    const dest = renderPath(file.dest, cfg);
    if (targetsMissingWorkspace(dest, cfg)) {
      skipped.push({ ...file, reason: "targets a workspace that was not selected" });
      continue;
    }

    ops.push({ src: file.src, dest, mode: file.mode, raw: file.raw });
  }

  return { ops, skipped };
}
