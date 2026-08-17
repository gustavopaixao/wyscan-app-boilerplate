/**
 * Pure config derivation. Every value here is overridable via --config.
 * Kept side-effect free so it can be unit-tested directly.
 */

import { ALL_SERVICES } from "../generate/compose.mjs";
import { ALL_MAKE_GROUPS } from "../generate/plan.mjs";

export const ALL_AI_TOOLS = ["claude", "cursor", "github"];
export const WYSCAN_MODES = ["local", "registry", "standalone"];
const ALL_SERVICE_NAMES = ALL_SERVICES;
const ALL_MAKE_GROUP_NAMES = ALL_MAKE_GROUPS;

const RESERVED = new Set(["node_modules", "test", "src", "api", "web", "mobile", "docker"]);

export function titleCase(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** Derive the full value set from a minimal answer set. */
export function derive(answers) {
  const slug = answers.slug;
  const displayName = answers.displayName ?? titleCase(slug);
  const owner = answers.owner ?? "";
  const domain = answers.domain ?? `${slug}.com`;
  // URL schemes and reverse-DNS segments cannot contain hyphens.
  const flat = slug.replaceAll("-", "");

  const derived = {
    slug,
    displayName,
    owner,
    domain,
    projectConst: slug.toUpperCase().replaceAll("-", "_"),
    // The reference uses the bare slug for both the deep-link scheme and the
    // Mongo database name, and hyphens are legal in each, so these track the
    // slug rather than being independently configurable.
    appScheme: slug,
    dbName: slug,
    // Reverse-DNS segments may NOT contain hyphens, so this one is stripped.
    bundleId: answers.bundleId ?? `com.${flat}.app`,
    // Expo strips non-alphanumerics from `name` when it generates ios/.
    iosProjectName: (answers.displayName ?? displayName).replace(/[^A-Za-z0-9]/g, ""),
    apiDomain: `api.${domain}`,
    webDomain: `app.${domain}`,
    adminDomain: `admin.${domain}`,
    wwwDomain: `www.${domain}`,
    npmScope: answers.npmScope ?? (owner ? `@${owner}` : "@local"),
    imageRegistry: answers.imageRegistry ?? (owner ? `ghcr.io/${owner}` : "localhost"),
    deployRoot: answers.deployRoot ?? `/websites/${slug}`,
    serverDeployDir: answers.serverDeployDir ?? `/opt/${slug}-api`,
    ecosystemDir: answers.ecosystemDir ?? "WyscanDev",
    devHost: answers.devHost ?? "localhost",
  };

  // Explicit answers always win over derivations.
  return { ...derived, ...stripUndefined(answers) };
}

function stripUndefined(o) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

/** Returns an array of human-readable problems; empty means valid. */
export function validate(cfg) {
  const errors = [];

  if (!/^[a-z][a-z0-9-]{1,42}[a-z0-9]$/.test(cfg.slug ?? "")) {
    errors.push(
      `slug "${cfg.slug}" must be lowercase, start with a letter, and contain only a-z 0-9 and hyphens (3-44 chars)`,
    );
  }
  if (RESERVED.has(cfg.slug)) errors.push(`slug "${cfg.slug}" is a reserved name`);
  if (cfg.slug?.includes("--")) errors.push(`slug "${cfg.slug}" must not contain consecutive hyphens`);

  if (cfg.bundleId && !/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/.test(cfg.bundleId)) {
    errors.push(
      `bundleId "${cfg.bundleId}" must be reverse-DNS with 3+ segments, each starting with a letter`,
    );
  }

  if (cfg.domain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(cfg.domain)) {
    errors.push(`domain "${cfg.domain}" is not a valid hostname`);
  }

  const ports = Object.entries(cfg.ports ?? {});
  for (const [name, p] of ports) {
    if (!Number.isInteger(p) || p < 1024 || p > 65535) {
      errors.push(`port ${name}=${p} must be an integer between 1024 and 65535`);
    }
  }
  const seen = new Map();
  for (const [name, p] of ports) {
    if (seen.has(p)) errors.push(`ports ${seen.get(p)} and ${name} both use ${p}`);
    else seen.set(p, name);
  }

  if (!cfg.workspaces?.length) errors.push("at least one workspace must be selected");

  // Unknown enum values previously generated silently: `--workspaces bogus`
  // produced a near-empty project and `--wyscan bogus` quietly stripped the
  // shared-package linkage. Fail loudly instead.
  const oneOf = (field, values, allowed) => {
    for (const v of values ?? []) {
      if (!allowed.includes(v)) {
        errors.push(`${field} "${v}" is not recognised — choose from: ${allowed.join(", ")}`);
      }
    }
  };

  oneOf("workspace", cfg.workspaces, ALL_WORKSPACES);
  oneOf("ai tool", cfg.aiTools, ALL_AI_TOOLS);
  oneOf("service", cfg.services, ALL_SERVICE_NAMES);
  oneOf("make group", cfg.makeGroups, ALL_MAKE_GROUP_NAMES);

  if (cfg.wyscanMode && !WYSCAN_MODES.includes(cfg.wyscanMode)) {
    errors.push(
      `shared-package mode "${cfg.wyscanMode}" is not recognised — choose from: ${WYSCAN_MODES.join(", ")}`,
    );
  }

  return errors;
}

export const DEFAULT_PORTS = {
  api: 3000,
  realtime: 3001,
  logAgent: 3090,
  site: 3500,
  admin: 4000,
  app: 4500,
  nginx: 8080,
  mongodb: 27017,
  redis: 6379,
};

export const ALL_WORKSPACES = ["api", "web:site", "web:app", "web:admin", "mobile"];
