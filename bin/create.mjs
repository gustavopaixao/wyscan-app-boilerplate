#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { runFlow, summarize } from "../src/cli/flow.mjs";
import { closePrompts, interactive, colors as c } from "../src/cli/prompt.mjs";
import { derive, validate, DEFAULT_PORTS, ALL_WORKSPACES } from "../src/config/derive.mjs";
import { ALL_SERVICES } from "../src/generate/compose.mjs";
import {
  apiClaudeMd,
  mobileClaudeMd,
  sharedPackagesDoc,
  webAppEnvExample,
  webAppEnvLocal,
} from "../src/generate/extradocs.mjs";
import { planFiles, makeGroupsFor } from "../src/generate/plan.mjs";
import { writeProject } from "../src/generate/write.mjs";
import { initRepo, createGithubRepo, installWorkspaces } from "../src/post/git.mjs";
import { nextSteps } from "../src/post/nextsteps.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = join(ROOT, "templates");

const HELP = `
${c.bold("wyscan-app-boilerplate")} — scaffold a full-stack monorepo

Usage
  npx github:<owner>/wyscan-app-boilerplate [target-dir] [options]

Run with no options for an interactive setup.

Options
  --slug <name>          project slug (lowercase, hyphens)
  --name <display>       display name         (default: title-cased slug)
  --owner <handle>       GitHub owner/org
  --domain <host>        root domain          (default: <slug>.com)
  --bundle-id <id>       mobile bundle id     (default: com.<slug>.app)
  --dev-host <host>      mobile LAN dev host
  --firebase             add Firebase (push, Crashlytics); off by default
  --workspaces <list>    ${ALL_WORKSPACES.join(",")}
  --make-groups <list>   narrow the Make targets (default: follows --workspaces)
  --services <list>      compose services     (default: ${ALL_SERVICES.join(",")})
  --ai <list>            claude,cursor,github (default: claude,github)
  --wyscan <mode>        local | registry | standalone
  --config <file.json>   load answers from a file
  --print-config         resolve config, print as JSON, exit
  --dry-run              print the file plan without writing
  --no-git               skip git init and the initial commit
  --install              run pnpm install in each workspace afterwards
  --gh-repo              create a GitHub repo via the gh CLI and push
  --force                allow a non-empty target directory
  -y, --yes              accept all defaults, ask nothing
  -h, --help             show this help
`;

function fail(message, code = 1) {
  console.error(`${c.red("error")}: ${message}`);
  process.exit(code);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      slug: { type: "string" },
      name: { type: "string" },
      owner: { type: "string" },
      domain: { type: "string" },
      "bundle-id": { type: "string" },
      "dev-host": { type: "string" },
      firebase: { type: "boolean" },
      workspaces: { type: "string" },
      "make-groups": { type: "string" },
      services: { type: "string" },
      ai: { type: "string" },
      wyscan: { type: "string" },
      config: { type: "string" },
      "print-config": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "no-git": { type: "boolean", default: false },
      install: { type: "boolean", default: false },
      "gh-repo": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      yes: { type: "boolean", short: "y", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  const fromFile = values.config ? JSON.parse(readFileSync(resolve(values.config), "utf8")) : {};
  const list = (v) => v?.split(",").map((s) => s.trim()).filter(Boolean);

  // Flags beat the config file; anything still unset is either prompted for
  // (interactive) or defaulted (--yes / non-TTY).
  const known = {
    ...fromFile,
    slug: values.slug ?? fromFile.slug ?? (positionals[0] ? basename(resolve(positionals[0])) : undefined),
    displayName: values.name ?? fromFile.displayName,
    owner: values.owner ?? fromFile.owner,
    domain: values.domain ?? fromFile.domain,
    bundleId: values["bundle-id"] ?? fromFile.bundleId,
    devHost: values["dev-host"] ?? fromFile.devHost,
    firebase: values.firebase ?? fromFile.firebase,
    workspaces: list(values.workspaces) ?? fromFile.workspaces,
    makeGroups: list(values["make-groups"]) ?? fromFile.makeGroups,
    services: list(values.services) ?? fromFile.services,
    aiTools: list(values.ai) ?? fromFile.aiTools,
    wyscanMode: values.wyscan ?? fromFile.wyscanMode,
    targetDir: positionals[0] ?? fromFile.targetDir,
    gitInit: values["no-git"] ? false : fromFile.gitInit,
    runInstall: values.install || fromFile.runInstall,
  };

  // --dry-run still asks: it is a preview of what you would actually get.
  const skipPrompts = values.yes || values["print-config"] || !interactive;

  let answers;
  if (skipPrompts) {
    const workspaces = known.workspaces ?? ALL_WORKSPACES;
    answers = {
      ...known,
      slug: known.slug,
      workspaces,
      makeGroups: known.makeGroups ?? makeGroupsFor(workspaces),
      services: known.services ?? ALL_SERVICES,
      aiTools: known.aiTools ?? ["claude", "github"],
      wyscanMode: known.wyscanMode ?? "standalone",
      ports: { ...DEFAULT_PORTS, ...(fromFile.ports ?? {}) },
      gitInit: known.gitInit ?? true,
      // This branch bypasses runFlow, so anything the prompts would default has
      // to be defaulted here too or it arrives undefined.
      firebase: known.firebase ?? false,
    };
    if (!answers.slug) fail("a project slug is required (--slug, --config, or a positional path)");
  } else {
    answers = await runFlow(known);
    answers.ports = { ...DEFAULT_PORTS, ...(fromFile.ports ?? {}) };
    closePrompts();
  }

  const cfg = derive(answers);
  const errors = validate(cfg);
  if (errors.length) {
    console.error(`${c.red("error")}: invalid configuration\n`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  if (values["print-config"]) {
    console.log(JSON.stringify(cfg, null, 2));
    return;
  }

  const targetDir = resolve(answers.targetDir ?? `./${cfg.slug}`);
  // Whether the directory already held anything decides how far we may roll
  // back on failure: we must never delete files this run did not create.
  const preExisting = existsSync(targetDir) && readdirSync(targetDir).length > 0;
  if (preExisting && !values.force) {
    fail(`${targetDir} is not empty (use --force to override)`, 2);
  }

  // Two template roots: `tree/` is extracted from the reference project and its
  // manifest is regenerated by `npm run sync`; `authored/` is hand-maintained here
  // for content the reference has none of. See templates/authored/README.md.
  const manifest = JSON.parse(readFileSync(join(TEMPLATES, "manifest.json"), "utf8"));
  const authored = JSON.parse(readFileSync(join(TEMPLATES, "authored.json"), "utf8"));
  const { ops, skipped } = planFiles(
    { ...manifest, files: [...manifest.files, ...authored.files] },
    cfg,
    TEMPLATES,
  );

  if (values["dry-run"]) {
    console.log(summarize(cfg, targetDir));
    console.log(`  ${ops.length} files to write, ${skipped.length} skipped\n`);
    for (const op of ops.slice(0, 15)) console.log(`    ${op.dest}`);
    if (ops.length > 15) console.log(`    … and ${ops.length - 15} more`);
    return;
  }

  console.log(summarize(cfg, targetDir));

  // Files the reference promises but never shipped.
  const extras = [{ dest: "docs/shared-packages.md", content: sharedPackagesDoc(cfg) }];
  if (cfg.workspaces.includes("web:app")) {
    const appDir = `web/${cfg.slug}-app`;
    extras.push({ dest: `${appDir}/.env.example`, content: webAppEnvExample(cfg) });
    extras.push({ dest: `${appDir}/.env.local`, content: webAppEnvLocal(cfg) });
  }
  if (cfg.aiTools.includes("claude")) {
    if (cfg.workspaces.includes("api")) extras.push({ dest: "api/CLAUDE.md", content: apiClaudeMd(cfg) });
    if (cfg.workspaces.includes("mobile")) {
      extras.push({ dest: "mobile/CLAUDE.md", content: mobileClaudeMd(cfg) });
    }
  }

  mkdirSync(targetDir, { recursive: true });

  /**
   * Roll back only what this run created.
   *
   * Deleting targetDir wholesale is data loss the moment --force is used on a
   * populated directory: any generation error would take the user's existing
   * files with it. Remove the written files instead, then prune the directories
   * that became empty as a result.
   */
  const rollback = (writtenFiles) => {
    for (const { dest } of writtenFiles ?? []) {
      rmSync(join(targetDir, dest), { force: true });
    }
    if (!preExisting) rmSync(targetDir, { recursive: true, force: true });
  };

  let written;
  try {
    const result = writeProject(ops, { templatesDir: TEMPLATES, targetDir, values: cfg, extras });
    written = result.written;
    if (result.leftovers.length) {
      console.error(`\n${c.red("error")}: unresolved template tokens remain:`);
      for (const l of result.leftovers.slice(0, 10)) {
        console.error(`  ${l.dest}: ${l.sentinels.join(", ")}`);
      }
      // Same rule as a thrown failure: never leave a half-written tree.
      rollback(written);
      process.exit(3);
    }
  } catch (e) {
    rollback(e.written);
    fail(
      preExisting
        ? `generation failed, files written by this run were removed: ${e.message}`
        : `generation failed, target directory removed: ${e.message}`,
    );
  }

  const warnings = [];
  let committed = false;
  let sha;

  if (cfg.gitInit !== false) {
    const r = initRepo(targetDir, {
      message: `Initial commit: ${cfg.displayName} monorepo scaffold`,
    });
    committed = r.ok;
    sha = r.sha;
    if (r.warning) warnings.push(r.warning);
  }

  if (values["gh-repo"]) {
    const r = createGithubRepo(targetDir, { owner: cfg.owner, slug: cfg.slug });
    if (r.warning) warnings.push(r.warning);
  }

  if (cfg.runInstall) {
    const failures = installWorkspaces(targetDir, cfg.workspaces, cfg, (m) => console.log(m));
    if (failures.length) warnings.push(`pnpm install failed in: ${failures.join(", ")}`);
    else cfg.installed = true;
  }

  console.log(
    `  ${written.length} files written${skipped.length ? `, ${skipped.length} skipped` : ""}`,
  );
  console.log(nextSteps(cfg, targetDir, { warnings, committed, sha }));
}

main().catch((e) => {
  closePrompts();
  // Ctrl+D / closed stdin mid-prompt is a cancel, not a crash.
  if (/readline was closed|Aborted with Ctrl/i.test(e.message)) {
    console.error(`\n${c.dim("cancelled — nothing was written")}`);
    process.exit(130);
  }
  fail(e.message);
});

process.on("SIGINT", () => {
  closePrompts();
  console.error(`\n${c.dim("cancelled — nothing was written")}`);
  process.exit(130);
});
