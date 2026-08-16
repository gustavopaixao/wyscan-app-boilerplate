/**
 * Content transforms applied after token substitution, keyed by destination
 * path. Anything needing structural editing rather than string replacement
 * lives here.
 */

import { pruneCompose, ALL_SERVICES } from "./compose.mjs";
import { rewritePackageJson, rewriteMetroConfig, rewriteNpmrc } from "./wyscan.mjs";
import { buildClaudeMd } from "./claudemd.mjs";
import { rewritePreCommitGate, rewriteValidateEdit } from "./hooks.mjs";

const COMPOSE_FILES = new Set([
  "docker/docker-compose.yml",
  "docker/docker-compose.dev-host-api.yml",
  "docker/docker-compose.prod.yml",
]);

/**
 * The reference `.code-workspace` is JSONC (trailing commas). Parse tolerantly
 * and re-emit strict JSON, which is both valid for VS Code and parseable by
 * the test suite.
 */
function parseJsonc(text) {
  return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"));
}

/** Remove named rules (and their recipes and .PHONY entries) from a .mk fragment. */
function stripMakeRules(text, names) {
  const lines = text.split("\n");
  const out = [];
  let skipping = false;

  for (const line of lines) {
    if (line.startsWith(".PHONY:")) {
      const kept = line
        .slice(7)
        .trim()
        .split(/\s+/)
        .filter((t) => !names.has(t));
      out.push(`.PHONY: ${kept.join(" ")}`);
      continue;
    }
    const rule = line.match(/^([A-Za-z0-9_][A-Za-z0-9_ .-]*):(?!=)/);
    if (rule) {
      skipping = rule[1].trim().split(/\s+/).some((t) => names.has(t));
      if (skipping) continue;
    } else if (skipping) {
      // Recipe lines and the blank line that ends the rule.
      if (line.startsWith("\t") || line.trim() === "") continue;
      skipping = false;
    }
    if (!skipping) out.push(line);
  }

  return out.join("\n");
}

/** Drop lines that reference the shared-package tree (compose mounts, contexts). */
function stripEcosystemLines(text, cfg) {
  if (cfg.wyscanMode === "local") return text;
  return text
    .split("\n")
    .filter((l) => !l.includes(cfg.ecosystemDir))
    .join("\n");
}

/**
 * @param {string} dest  destination path within the generated project
 * @param {string} text  rendered file contents
 * @param {object} cfg   resolved config
 */
export function transform(dest, text, cfg) {
  let out = text;

  if (COMPOSE_FILES.has(dest)) {
    const services = cfg.services ?? ALL_SERVICES;
    if (services.length !== ALL_SERVICES.length) out = pruneCompose(out, services);
    out = stripEcosystemLines(out, cfg);
  }

  // These targets exist only to clone or prebuild the sibling checkout.
  if (dest === "make/setup.mk" && cfg.wyscanMode === "standalone") {
    out = stripMakeRules(out, new Set(["wyscan-dev-setup", "design-system-setup", "api-auth-dist"]));
  }

  if (dest === "api/package.json") out = rewritePackageJson(out, cfg, "api");
  if (dest === "mobile/package.json") out = rewritePackageJson(out, cfg, "mobile");
  if (dest === "mobile/metro.config.js") out = rewriteMetroConfig(out, cfg);
  if (dest === "api/.npmrc") out = rewriteNpmrc(out, cfg);
  if (dest === "api/Dockerfile") out = stripEcosystemLines(out, cfg);

  // The reference CLAUDE.md is stale and imports nothing; generate a real one.
  if (dest === "CLAUDE.md") out = buildClaudeMd(cfg);

  // The reference relies on the author's *global* gitignore to keep machine-local
  // assistant settings out of the repo, so anyone else cloning it would commit
  // their own allowlist. Make the ignore explicit.
  if (dest === ".gitignore" && !out.includes("settings.local.json")) {
    out +=
      "\n# Machine-local assistant config (never commit an allowlist)\n" +
      ".claude/settings.local.json\n" +
      ".cursor/*.local.*\n";
  }

  // The reference hooks hardcode a workspace list that omits web/<slug>-app.
  if (dest === ".claude/hooks/pre-commit-gate.sh") out = rewritePreCommitGate(out, cfg);
  if (dest === ".claude/hooks/validate-edit.sh") out = rewriteValidateEdit(out, cfg);

  // Sibling folders only exist in local mode.
  if (dest.endsWith(".code-workspace")) {
    const ws = parseJsonc(out);
    if (cfg.wyscanMode !== "local") {
      ws.folders = ws.folders.filter((f) => !String(f.path).includes(cfg.ecosystemDir));
    }
    out = JSON.stringify(ws, null, 2) + "\n";
  }

  if (dest === ".claude/settings.json" && cfg.wyscanMode !== "local") {
    const s = JSON.parse(out);
    if (s.permissions?.additionalDirectories) s.permissions.additionalDirectories = [];
    out = JSON.stringify(s, null, 2) + "\n";
  }

  return out;
}
