/**
 * Format `templates/authored/**` with the generated project's own Biome config.
 *
 * The authored templates are ordinary source files with `__SENTINEL__` tokens
 * in them, and the generated project runs `biome check` in CI and in the
 * pre-commit hook. So they have to be formatted the way Biome will want them
 * *after* substitution — but Biome cannot be run against the templates
 * directly, because each workspace's config lives in the generated tree.
 *
 * So: generate a project, let Biome format it, then port the result back and
 * re-tokenize. Every file is verified to round-trip — `render(template)` must
 * reproduce the formatted output exactly — so a bad reverse substitution fails
 * loudly instead of silently corrupting a template.
 *
 *   node scripts/format-authored.mjs <generated-project-dir>
 *
 * The project must have been generated with the fixture values below.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../src/tokens/apply.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The values the fixture project must have been generated with. */
const FIXTURE = {
  slug: "demo-shop",
  displayName: "Demo Shop",
  npmScope: "@octocat",
  owner: "octocat",
  domain: "demo-shop.com",
  apiDomain: "api.demo-shop.com",
  webDomain: "app.demo-shop.com",
  adminDomain: "admin.demo-shop.com",
  wwwDomain: "www.demo-shop.com",
  projectConst: "DEMO_SHOP",
  bundleId: "com.demoshop.app",
  iosProjectName: "DemoShop",
  ecosystemDir: "WyscanDev",
  imageRegistry: "ghcr.io/octocat",
  deployRoot: "/websites/demo-shop",
  serverDeployDir: "/opt/demo-shop-api",
  devHost: "localhost",
};

/**
 * Longest-first, so `com.demoshop.app` is re-tokenized before the bare slug
 * can eat part of it — the same ordering constraint the extractor has.
 */
const REVERSE = [
  ["/websites/demo-shop", "__DEPLOY_ROOT__"],
  ["/opt/demo-shop-api", "__SERVER_DEPLOY_DIR__"],
  ["ghcr.io/octocat", "__IMAGE_REGISTRY__"],
  ["com.demoshop.app", "__BUNDLE_ID__"],
  ["api.demo-shop.com", "__API_DOMAIN__"],
  ["app.demo-shop.com", "__WEB_DOMAIN__"],
  ["admin.demo-shop.com", "__ADMIN_DOMAIN__"],
  ["www.demo-shop.com", "__WWW_DOMAIN__"],
  ["demo-shop.com", "__PROJECT_DOMAIN__"],
  ["@octocat", "__NPM_SCOPE__"],
  ["DEMO_SHOP", "__PROJECT_CONST__"],
  ["Demo Shop", "__PROJECT_NAME__"],
  ["demo-shop", "__PROJECT_SLUG__"],
];

function retokenize(text) {
  let out = text;
  for (const [literal, sentinel] of REVERSE) out = out.replaceAll(literal, sentinel);
  return out;
}

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node scripts/format-authored.mjs <generated-project-dir>");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(ROOT, "templates", "authored.json"), "utf8"));

/** Only source files Biome formats; docs, env examples and Makefiles are ours. */
const FORMATTABLE = /\.(ts|tsx|mjs|js|jsx)$/;

/**
 * Biome-managed workspaces. `mobile/` is absent on purpose: it ships no Biome
 * config and its existing sources are tab-indented, so the authored mobile
 * templates match that by hand instead.
 */
const WORKSPACES = [
  "api",
  `web/${FIXTURE.slug}-app`,
  `web/${FIXTURE.slug}-admin`,
  `web/${FIXTURE.slug}-site`,
];

const rendered = (p) => join(projectDir, render(p, FIXTURE));

let formatted = 0;
let skipped = 0;
const failures = [];

// One invocation per workspace: Biome resolves its config from the working
// directory, and a per-file run from a nested directory does not find it.
for (const workspace of WORKSPACES) {
  const cwd = join(projectDir, workspace);
  if (!existsSync(cwd)) continue;
  try {
    // `check`, not `format`: the generated projects run `biome check` in CI and
    // in the pre-commit hook, and that also enforces import ordering, which
    // `format` alone leaves alone. Safe fixes only — an unsafe fix could change
    // behaviour, so those are left to fail the lint and be fixed by hand.
    execFileSync("npx", ["biome", "check", "--write", "."], { cwd, stdio: "pipe" });
  } catch (error) {
    // biome exits non-zero when unsafe-only findings remain; that is not a
    // failure to write, so only report when nothing was applied at all.
    const stderr = error.stderr?.toString() ?? "";
    if (stderr.trim()) failures.push(`${workspace}: ${stderr.slice(0, 200)}`);
  }
}

for (const file of manifest.files) {
  if (!FORMATTABLE.test(file.dest)) continue;

  const target = rendered(file.dest);
  if (!existsSync(target)) {
    skipped++;
    continue;
  }

  const after = readFileSync(target, "utf8");
  const template = retokenize(after);

  // The safety net: re-rendering the template must reproduce Biome's output
  // byte for byte, or the reverse substitution ate something it should not have.
  if (render(template, FIXTURE) !== after) {
    failures.push(`${file.dest}: does not round-trip; refusing to write`);
    continue;
  }

  const templatePath = join(ROOT, "templates", file.src);
  if (readFileSync(templatePath, "utf8") !== template) {
    writeFileSync(templatePath, template);
    formatted++;
  }
}

console.log(`formatted ${formatted} template(s); ${skipped} not present in this project`);
for (const f of failures) console.error(`  ! ${f}`);
process.exit(failures.length > 0 ? 1 : 0);
