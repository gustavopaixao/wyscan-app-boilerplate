/**
 * Pure mapping: config + manifest -> FileOp[].
 * No I/O, so the entire pruning surface is directly testable.
 */

import { renderPath } from "../tokens/apply.mjs";

/** Groups that are always emitted regardless of selection. */
const ALWAYS = new Set(["core", "make", "scripts", "docs"]);

/** Map a manifest group to the config flag that gates it. */
function isGroupSelected(group, cfg) {
  if (ALWAYS.has(group)) return true;

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
export function planFiles(manifest, cfg) {
  const ops = [];
  const skipped = [];

  for (const file of manifest.files) {
    if (!isGroupSelected(file.group, cfg)) {
      skipped.push({ ...file, reason: `group ${file.group} not selected` });
      continue;
    }
    if (isInvalidated(file, cfg)) {
      skipped.push({ ...file, reason: `lockfile invalid under wyscan=${cfg.wyscanMode}` });
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
