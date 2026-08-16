#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { derive, validate, DEFAULT_PORTS, ALL_WORKSPACES } from "../src/config/derive.mjs";
import { planFiles } from "../src/generate/plan.mjs";
import { writeProject } from "../src/generate/write.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = join(ROOT, "templates");

const HELP = `
wyscan-app-boilerplate — scaffold a full-stack monorepo

Usage
  npx github:<owner>/wyscan-app-boilerplate [target-dir] [options]

Options
  --slug <name>          project slug (lowercase, hyphens)
  --name <display>       display name          (default: title-cased slug)
  --owner <handle>       GitHub owner/org
  --domain <host>        root domain           (default: <slug>.com)
  --bundle-id <id>       mobile bundle id      (default: com.<slug>.app)
  --dev-host <host>      mobile LAN dev host   (default: localhost)
  --workspaces <list>    ${ALL_WORKSPACES.join(",")}
  --ai <list>            claude,cursor,github  (default: claude,github)
  --wyscan <mode>        local | registry | standalone   (default: standalone)
  --config <file.json>   load answers from a file
  --print-config         resolve config, print as JSON, exit
  --dry-run              print the file plan without writing
  --force                allow a non-empty target directory
  -y, --yes              accept all defaults
  -h, --help             show this help
`;

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      slug: { type: "string" },
      name: { type: "string" },
      owner: { type: "string" },
      domain: { type: "string" },
      "bundle-id": { type: "string" },
      "dev-host": { type: "string" },
      workspaces: { type: "string" },
      ai: { type: "string" },
      wyscan: { type: "string" },
      config: { type: "string" },
      "print-config": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      yes: { type: "boolean", short: "y", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  const fromFile = values.config
    ? JSON.parse(readFileSync(resolve(values.config), "utf8"))
    : {};

  // A positional is always the target directory; its basename is the fallback slug.
  const slug = values.slug ?? fromFile.slug ?? (positionals[0] ? basename(resolve(positionals[0])) : undefined);
  if (!slug) {
    console.error("error: a project slug is required (--slug, --config, or a positional arg)");
    process.exit(1);
  }

  const answers = {
    ...fromFile,
    slug,
    displayName: values.name ?? fromFile.displayName,
    owner: values.owner ?? fromFile.owner ?? "",
    domain: values.domain ?? fromFile.domain,
    bundleId: values["bundle-id"] ?? fromFile.bundleId,
    devHost: values["dev-host"] ?? fromFile.devHost,
    workspaces: values.workspaces?.split(",") ?? fromFile.workspaces ?? ALL_WORKSPACES,
    aiTools: values.ai?.split(",") ?? fromFile.aiTools ?? ["claude", "github"],
    wyscanMode: values.wyscan ?? fromFile.wyscanMode ?? "standalone",
    ports: { ...DEFAULT_PORTS, ...(fromFile.ports ?? {}) },
  };

  const cfg = derive(answers);
  const errors = validate(cfg);
  if (errors.length) {
    console.error("error: invalid configuration\n");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  if (values["print-config"]) {
    console.log(JSON.stringify(cfg, null, 2));
    return;
  }

  const targetDir = resolve(positionals[0] ?? fromFile.targetDir ?? `./${cfg.slug}`);
  if (existsSync(targetDir) && readdirSync(targetDir).length && !values.force) {
    console.error(`error: ${targetDir} is not empty (use --force to override)`);
    process.exit(2);
  }

  const manifest = JSON.parse(readFileSync(join(TEMPLATES, "manifest.json"), "utf8"));
  const { ops, skipped } = planFiles(manifest, cfg);

  if (values["dry-run"]) {
    console.log(`\n${cfg.displayName} -> ${targetDir}`);
    console.log(`  workspaces: ${cfg.workspaces.join(", ")}`);
    console.log(`  ai tooling: ${cfg.aiTools.join(", ") || "none"}`);
    console.log(`  shared pkgs: ${cfg.wyscanMode}`);
    console.log(`\n  ${ops.length} files to write, ${skipped.length} skipped\n`);
    for (const op of ops.slice(0, 15)) console.log(`    ${op.dest}`);
    if (ops.length > 15) console.log(`    … and ${ops.length - 15} more`);
    return;
  }

  mkdirSync(targetDir, { recursive: true });
  const { written, leftovers } = writeProject(ops, {
    templatesDir: TEMPLATES,
    targetDir,
    values: cfg,
  });

  if (leftovers.length) {
    console.error(`\nerror: ${leftovers.length} file(s) still contain unresolved template tokens:`);
    for (const l of leftovers.slice(0, 10)) {
      console.error(`  ${l.dest}: ${l.sentinels.join(", ")}`);
    }
    process.exit(3);
  }

  console.log(`\n${cfg.displayName} created at ${targetDir}`);
  console.log(`  ${written.length} files written (${skipped.length} skipped)\n`);
}

main();
