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
  "docker-release",
  "production",
  "ship",
  "verify",
  "docs",
];

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

/** Files invalidated by a non-local shared-package mode (stale lockfiles). */
function isInvalidated(file, cfg) {
  if (!file.invalidatedBy) return false;
  return file.invalidatedBy.includes(`wyscan:${cfg.wyscanMode}`);
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
    if (cfg.wyscanMode === "standalone" && ECOSYSTEM_ONLY_FILES.has(file.dest)) {
      skipped.push({ ...file, reason: "shared-package bootstrap, not used in standalone" });
      continue;
    }
    ops.push({
      src: file.src,
      dest: renderPath(file.dest, cfg),
      mode: file.mode,
      raw: file.raw,
    });
  }

  return { ops, skipped };
}
