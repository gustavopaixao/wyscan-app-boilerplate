/** The closing summary: what to run next, tailored to what was generated. */

import { colors as c } from "../cli/prompt.mjs";

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
  } else if (cfg.wyscanMode === "registry") {
    L.push(`  export NPM_TOKEN=…         ${c.dim("# needed to resolve scoped packages")}`);
    L.push(`  ${c.dim("# pin the placeholder version ranges before installing")}`);
  }

  if (!cfg.installed) {
    if (has("api")) L.push(`  cd api && pnpm install && cd -`);
    for (const w of ["site", "app", "admin"]) {
      if (has(`web:${w}`)) L.push(`  cd web/${cfg.slug}-${w} && pnpm install && cd -`);
    }
    if (has("mobile")) L.push(`  cd mobile && pnpm install && cd -`);
  }

  if (has("api")) {
    L.push("");
    L.push(`  make jwt-secret            ${c.dim("# seed api/.env")}`);
    L.push(`  make start                 ${c.dim("# bring up the docker stack")}`);
    L.push(`  make health                ${c.dim(`# http://localhost:${cfg.ports.nginx}`)}`);
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
