/** The closing summary: what to run next, tailored to what was generated. */

import { colors as c } from "../cli/prompt.mjs";
import { ROOT_USER } from "../generate/seed.mjs";

export function nextSteps(cfg, targetDir, { warnings = [], committed, sha }) {
  const L = [];
  const has = (w) => cfg.workspaces.includes(w);

  L.push("");
  L.push(`${c.green("✔")} ${c.bold(cfg.displayName)} created at ${targetDir}`);
  if (committed) L.push(`  ${c.dim(`git repo initialised on main @ ${sha}`)}`);
  L.push("");

  L.push(c.bold("Next steps"));
  L.push("");
  L.push(`  cd ${targetDir}`);

  // The shared-package story differs per mode and comes first, because it
  // determines whether `pnpm install` can succeed at all.
  if (cfg.wyscanMode === "local") {
    L.push(`  make wyscan-dev-setup      ${c.dim("# clone the shared package repos first")}`);
    if (cfg.ecosystemPath) {
      L.push(`  ${c.dim(`# file: links resolve against ${cfg.ecosystemPath}`)}`);
    }
  } else if (cfg.wyscanMode === "registry") {
    L.push(`  export NPM_TOKEN=…         ${c.dim("# needed to resolve scoped packages")}`);
    L.push(`  ${c.dim("# pin the placeholder version ranges before installing")}`);
  }

  if (!cfg.installed) {
    // Only what still needs installing. Listing every workspace after one of
    // them failed sends people to re-run installs that already succeeded.
    const failed = cfg.installFailures;
    const pending = (w, dir) => (failed ? failed.includes(dir) || failed.includes(w) : has(w));

    if (has("api") && pending("api", "api")) L.push(`  cd api && pnpm install && cd -`);
    for (const w of ["site", "app", "admin"]) {
      const dir = `web/${cfg.slug}-${w}`;
      if (has(`web:${w}`) && pending(`web:${w}`, dir)) {
        L.push(`  cd ${dir} && pnpm install && cd -`);
      }
    }
    if (has("mobile") && pending("mobile", "mobile")) {
      L.push(`  cd mobile && pnpm install && cd -`);
    }
  }

  if (has("api")) {
    L.push("");
    L.push(`  make jwt-secret            ${c.dim("# seed api/.env")}`);
    L.push(`  make start                 ${c.dim("# bring up the docker stack")}`);
    L.push(`  make health                ${c.dim(`# http://localhost:${cfg.ports.nginx}`)}`);

    // The generated project has no account that can reach the admin console
    // until this user exists, and nothing else ever prints the password.
    L.push("");
    L.push(`  ${c.bold("Root user")} ${c.dim("— created automatically on the first API start")}`);
    L.push(`    email     ${ROOT_USER.email}`);
    L.push(`    password  ${ROOT_USER.password}`);
    L.push(`    ${c.dim("role: admin — signs into the admin console. Change it before deploying.")}`);
  }

  const webs = ["site", "app", "admin"].filter((w) => has(`web:${w}`));
  if (webs.length) {
    L.push("");
    for (const w of webs) {
      L.push(`  make ${w}-dev`.padEnd(29) + c.dim(`# :${cfg.ports[w]}`));
    }
  }
  if (has("mobile")) L.push(`  make mobile-dev            ${c.dim("# Expo")}`);

  L.push("");
  L.push(`  make help                  ${c.dim("# everything else")}`);
  if (cfg.makeGroups?.includes("completion")) {
    // The fragments arrive via `include $(wildcard make/*.mk)`, which the shells'
    // own make completion cannot follow — so `make <TAB>` needs this once.
    L.push(`  make completion >> ~/.zshrc  ${c.dim("# tab-complete every target")}`);
  }

  if (cfg.wyscanMode === "standalone" && (has("api") || has("mobile"))) {
    L.push("");
    L.push(
      c.dim("  Shared packages are stubbed under packages/stubs — see docs/shared-packages.md"),
    );
  }

  if (warnings.length) {
    L.push("");
    L.push(c.bold("Warnings"));
    for (const w of warnings) L.push(`  ${c.red("!")} ${w}`);
  }

  L.push("");
  return L.join("\n");
}
