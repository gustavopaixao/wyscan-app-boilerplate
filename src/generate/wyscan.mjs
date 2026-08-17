/**
 * Shared-package dependency modes.
 *
 * The reference project's api/ and mobile/ consume a sibling repo pair via
 * pnpm `file:` specifiers. That is fine on the author's machine and fatal
 * everywhere else, so a generated project picks one of three strategies.
 *
 *   local       keep the file: links; `make wyscan-dev-setup` clones the
 *               siblings. Reproduces the reference exactly.
 *   registry    resolve the same packages from a scoped registry.
 *   standalone  strip them entirely and vendor local stubs, so the project
 *               installs from public npm alone.
 *
 * Import specifiers are never rewritten, so a project can graduate from
 * standalone to local later by swapping the dependency specs back.
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** True for a dependency that resolves into the shared ecosystem. */
function isEcosystemDep(name, spec, cfg) {
  return (
    name.startsWith(`${cfg.npmScope}/`) ||
    name === "wyscan-react-native" ||
    String(spec).includes(`/${cfg.ecosystemDir}/`)
  );
}

/** Packages we ship stubs for, keyed by the dependency name suffix. */
const STUBBED = new Set(["core-api", "auth-api", "notify-api", "core-react-native"]);

/**
 * Rewrite a package.json for the chosen mode.
 * @returns {string} serialized package.json
 */
export function rewritePackageJson(text, cfg, workspace) {
  if (cfg.wyscanMode === "local") return text;

  const pkg = JSON.parse(text);
  const deps = pkg.dependencies ?? {};
  const overrides = pkg.pnpm?.overrides ?? {};

  for (const [name, spec] of Object.entries(deps)) {
    if (!isEcosystemDep(name, spec, cfg)) continue;

    if (cfg.wyscanMode === "registry") {
      deps[name] = cfg.registryRange ?? "latest";
      continue;
    }

    // standalone: keep only what we can stub, drop the rest.
    const short = name.split("/").pop();
    if (STUBBED.has(short)) {
      const depth = workspace === "api" ? "../packages/stubs" : "../packages/stubs";
      deps[name] = `file:${depth}/${short}`;
    } else {
      delete deps[name];
    }
  }

  for (const [name, spec] of Object.entries(overrides)) {
    if (!isEcosystemDep(name, spec, cfg)) continue;
    if (cfg.wyscanMode === "registry") {
      overrides[name] = cfg.registryRange ?? "latest";
    } else {
      delete overrides[name];
    }
  }

  if (pkg.pnpm && Object.keys(overrides).length === 0) delete pkg.pnpm.overrides;
  if (pkg.pnpm && Object.keys(pkg.pnpm).length === 0) delete pkg.pnpm;

  // The dev scripts prebuild the shared packages from the sibling checkout
  // before starting. That checkout exists only in `local` mode, and the script
  // hard-exits when it is absent — so `pnpm dev` was broken out of the box in
  // registry mode too, not just standalone.
  if (cfg.wyscanMode !== "local" && pkg.scripts) {
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      pkg.scripts[name] = String(cmd)
        .replace(/sh scripts\/ensure-auth-api-dist\.sh\s*&&\s*/g, "")
        .replace(/sh scripts\/ensure-local-packages-built\.sh\s*&&\s*/g, "");
    }
  }

  return JSON.stringify(pkg, null, 2) + "\n";
}

/**
 * Files that exist only to bootstrap or build the sibling shared-package
 * checkout. Meaningless — and misleading — in standalone mode.
 */
export const ECOSYSTEM_ONLY_FILES = new Set([
  "scripts/init-wyscan-dev.sh",
  "scripts/setup-design-system.sh",
  "api/scripts/ensure-auth-api-dist.sh",
  "api/scripts/ensure-local-packages-built.sh",
  "api/scripts/prepare-deps.sh",
]);

/**
 * Metro only needs the shared-package roots in `local` mode.
 *
 * Emit a clean config rather than stripping lines: the roots are declared as
 * multi-line `path.resolve(...)` calls whose *consumers* (`watchFolders`,
 * `extraNodeModules`) don't mention the ecosystem directory at all. Line-based
 * removal left `wyscanRNRoot` undefined but still referenced — a ReferenceError
 * that stopped Metro booting — and silently collapsed the other two roots to
 * the mobile directory itself.
 */
export function rewriteMetroConfig(text, cfg) {
  if (cfg.wyscanMode === "local") return text;

  return `const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

module.exports = config;
`;
}

/** Remove the scoped-registry line from .npmrc when nothing needs it. */
export function rewriteNpmrc(text, cfg) {
  if (cfg.wyscanMode !== "standalone") return text;
  return text
    .split("\n")
    .filter((l) => !l.includes("npm.pkg.github.com"))
    .join("\n");
}

/** Enumerate the stub package files to emit for standalone mode. */
export function stubFileOps(templatesDir) {
  const root = join(templatesDir, "partials", "stubs");
  const ops = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else {
        const rel = relative(root, p);
        ops.push({
          src: join("partials", "stubs", rel),
          dest: join("packages", "stubs", rel),
          mode: 644,
          raw: false,
        });
      }
    }
  };

  walk(root);
  return ops;
}
