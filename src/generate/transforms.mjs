/**
 * Content transforms applied after token substitution, keyed by destination
 * path. Anything needing structural editing rather than string replacement
 * lives here.
 */

import { pruneCompose, serializeInstalls, ALL_SERVICES } from "./compose.mjs";
import { rewritePackageJson, rewriteMetroConfig, rewriteNpmrc } from "./wyscan.mjs";
import {
  pruneFirebaseDeps,
  dropReactNativeFromSource,
  registerFirebasePodsPlugin,
} from "./firebase.mjs";
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

/** Reference dev ports, by web app, as written in the template package.json. */
const REFERENCE_WEB_PORTS = { site: 3500, app: 4500, admin: 4000 };

/** Point a web app's dev/start scripts at the configured port. */
function rewriteWebPorts(text, cfg, which) {
  const wanted = cfg.ports?.[which];
  const current = REFERENCE_WEB_PORTS[which];
  if (!wanted || wanted === current) return text;
  return text.replaceAll(`-p ${current}`, `-p ${wanted}`);
}

/** Compose ports are `${API_PORT:-3000}` — rewrite the default, not the shape. */
const COMPOSE_PORT_VARS = {
  API_PORT: "api",
  REALTIME_PORT: "realtime",
  NGINX_PORT: "nginx",
  MONGODB_PORT: "mongodb",
  REDIS_PORT: "redis",
};

function rewriteComposePorts(text, cfg) {
  let out = text;
  for (const [variable, key] of Object.entries(COMPOSE_PORT_VARS)) {
    const wanted = cfg.ports?.[key];
    if (!wanted) continue;
    out = out.replace(
      new RegExp(`\\$\\{${variable}:-\\d+\\}`, "g"),
      `\${${variable}:-${wanted}}`,
    );
  }
  return out;
}

/**
 * Standalone mode drops `api/scripts/prepare-deps.sh`, but the Dockerfile
 * COPYs and runs it unconditionally — and neither line mentions the ecosystem
 * directory, so the generic line strip leaves them. The image then fails to
 * build at the COPY, taking `make start` with it.
 */
function rewriteDockerfile(text, cfg) {
  let out = stripEcosystemLines(text, cfg);
  if (cfg.wyscanMode !== "standalone") return out;

  return out
    .split("\n")
    .filter((l) => !/prepare-deps\.sh/.test(l) || /\|\| true/.test(l))
    .join("\n");
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

/**
 * Drop lines that reference the shared-package tree (compose mounts, build
 * contexts).
 *
 * Removing a mapping's only child leaves a childless key, which compose
 * rejects (`additional_contexts must be a mapping`), so prune those too.
 */
function stripEcosystemLines(text, cfg) {
  if (cfg.wyscanMode === "local") return text;

  const kept = text.split("\n").filter((l) => !l.includes(cfg.ecosystemDir));
  const indent = (l) => l.length - l.trimStart().length;

  return kept
    .filter((line, i) => {
      if (!/^\s*[A-Za-z_][\w-]*:\s*$/.test(line)) return true;
      // A bare key survives only if something is nested beneath it.
      const next = kept.slice(i + 1).find((l) => l.trim() !== "");
      return next !== undefined && indent(next) > indent(line);
    })
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
    // Serialise before pruning, so the dependency is only added for services
    // that actually survive.
    if (dest === "docker/docker-compose.yml") out = serializeInstalls(out);
    // Compare as a set, not by length: a six-element list containing a typo
    // has the same length as the full set and used to skip pruning entirely,
    // silently keeping every service.
    const services = cfg.services ?? ALL_SERVICES;
    const selected = new Set(services);
    if (!ALL_SERVICES.every((s) => selected.has(s))) out = pruneCompose(out, services);
    out = stripEcosystemLines(out, cfg);
  }

  // These targets exist only to clone or prebuild the sibling checkout.
  if (dest === "make/setup.mk" && cfg.wyscanMode !== "local") {
    out = stripMakeRules(out, new Set(["wyscan-dev-setup", "design-system-setup", "api-auth-dist"]));
  }

  // Web dev ports are hardcoded in each package.json (`next dev -p 3500`), and
  // compose carries its own ${VAR:-default}. Without rewriting both, a chosen
  // port would only ever appear in the docs.
  const web = dest.match(/^web\/.*-(site|app|admin)\/package\.json$/);
  if (web) out = rewriteWebPorts(out, cfg, web[1]);
  if (COMPOSE_FILES.has(dest)) out = rewriteComposePorts(out, cfg);

  if (dest === "api/package.json") out = rewritePackageJson(out, cfg, "api");
  if (dest === "mobile/package.json") {
    out = pruneFirebaseDeps(rewritePackageJson(out, cfg, "mobile"), cfg);
  }
  if (dest === "mobile/app.config.ts") {
    out = registerFirebasePodsPlugin(dropReactNativeFromSource(out, cfg));
  }
  if (dest === "mobile/metro.config.js") out = rewriteMetroConfig(out, cfg);
  if (dest === "api/.npmrc") out = rewriteNpmrc(out, cfg);
  if (dest === "api/Dockerfile") out = rewriteDockerfile(out, cfg);

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
