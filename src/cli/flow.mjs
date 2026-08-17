/**
 * The interactive question flow. Questions are skipped when the answer is
 * already known from a flag or a --config file, so the prompts and the
 * non-interactive path share one code path.
 */

import { existsSync } from "node:fs";
import { hostname } from "node:os";
import { resolve } from "node:path";

import { text, confirm, select, multiselect, colors as c } from "./prompt.mjs";
import { titleCase, DEFAULT_PORTS, ALL_WORKSPACES } from "../config/derive.mjs";
import { makeGroupsFor } from "../generate/plan.mjs";
import { ALL_SERVICES } from "../generate/compose.mjs";

const WORKSPACE_CHOICES = [
  { value: "api", label: "api", hint: "Hono + MongoDB + Redis" },
  { value: "web:site", label: "web site", hint: "Next.js marketing site" },
  { value: "web:app", label: "web app", hint: "Next.js member app" },
  { value: "web:admin", label: "web admin", hint: "Next.js admin" },
  { value: "mobile", label: "mobile", hint: "Expo / React Native" },
];

const AI_CHOICES = [
  { value: "claude", label: ".claude", hint: "skills, agents, commands, rules, hooks" },
  { value: "cursor", label: ".cursor", hint: "agents, rules, commands" },
  { value: "github", label: ".github", hint: "CI workflows" },
];

const slugRules = (v) => {
  if (!/^[a-z][a-z0-9-]{1,42}[a-z0-9]$/.test(v)) {
    return "lowercase letters, digits and hyphens; must start with a letter (3-44 chars)";
  }
  if (v.includes("--")) return "no consecutive hyphens";
  return null;
};

/**
 * @param {object} known  answers already supplied by flags or --config
 * @returns {Promise<object>} a complete answer set
 */
export async function runFlow(known) {
  const a = { ...known };

  if (!a.slug) {
    a.slug = await text({
      message: "Project slug",
      default: a.slug,
      validate: slugRules,
    });
  }

  a.displayName ??= await text({
    message: "Display name",
    default: titleCase(a.slug),
  });

  a.targetDir ??= await text({
    message: "Directory",
    default: `./${a.slug}`,
    validate: (v) =>
      existsSync(resolve(v)) ? "that path already exists (use --force to override)" : null,
  });

  a.workspaces ??= await multiselect({
    message: "Which workspaces?",
    choices: WORKSPACE_CHOICES,
    default: ALL_WORKSPACES,
    min: 1,
  });

  a.owner ??= await text({ message: "GitHub owner or org", default: a.owner || "" });
  a.domain ??= await text({ message: "Root domain", default: `${a.slug}.com` });

  if (a.workspaces.includes("mobile")) {
    a.bundleId ??= await text({
      message: "Mobile bundle id",
      default: `com.${a.slug.replaceAll("-", "")}.app`,
      validate: (v) =>
        /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/.test(v)
          ? null
          : "reverse-DNS with 3+ segments, each starting with a letter",
    });
    a.devHost ??= await text({
      message: "Hostname your phone can reach this machine at",
      default: hostname().replace(/\.local$/, ""),
    });
    // Off by default: the Firebase packages autolink a Crashlytics build phase
    // that fails the iOS build until GoogleService-Info.plist exists, and a fresh
    // project has no Firebase account behind it yet.
    a.firebase ??= await confirm({
      message: "Add Firebase (push notifications, Crashlytics)? Needs a Firebase project",
      default: false,
    });
  }

  if (a.workspaces.includes("api") || a.workspaces.includes("mobile")) {
    a.wyscanMode ??= await select({
      message: "How should shared packages resolve?",
      choices: [
        {
          value: "standalone",
          label: "standalone",
          hint: "vendored stubs; installs from public npm alone",
        },
        { value: "local", label: "local checkout", hint: "file: links into a sibling repo" },
        { value: "registry", label: "private registry", hint: "scoped packages, needs NPM_TOKEN" },
      ],
      default: existsSync(resolve("../WyscanDev/Packages")) ? "local" : "standalone",
    });
  }
  a.wyscanMode ??= "standalone";

  a.aiTools ??= await multiselect({
    message: "Which assistant tooling?",
    choices: AI_CHOICES,
    default: ["claude", "github"],
  });

  // Not a question: Make groups follow the workspaces. --make-groups remains
  // available for the rare case where you want a narrower set.
  a.makeGroups ??= makeGroupsFor(a.workspaces);

  if (a.workspaces.includes("api")) {
    a.services ??= await multiselect({
      message: "Which Docker services?",
      choices: ALL_SERVICES.map((s) => ({ value: s, label: s })),
      default: ALL_SERVICES,
    });
    // The API container is the point of the stack.
    if (!a.services.includes("api")) a.services = ["api", ...a.services];
  }
  a.services ??= [];

  a.ports ??= DEFAULT_PORTS;

  a.gitInit ??= await confirm({ message: "Initialise a git repo and commit?", default: true });
  a.runInstall ??= await confirm({ message: "Run pnpm install now?", default: false });

  return a;
}

/** One-line summary printed before writing anything. */
export function summarize(cfg, targetDir) {
  const L = [];
  L.push("");
  L.push(`  ${c.bold(cfg.displayName)} ${c.dim("->")} ${targetDir}`);
  L.push(`  ${c.dim("workspaces  ")} ${cfg.workspaces.join(", ")}`);
  L.push(`  ${c.dim("ai tooling  ")} ${cfg.aiTools.join(", ") || "none"}`);
  L.push(`  ${c.dim("shared pkgs ")} ${cfg.wyscanMode}`);
  if (cfg.services.length) L.push(`  ${c.dim("services    ")} ${cfg.services.join(", ")}`);
  L.push("");
  return L.join("\n");
}
