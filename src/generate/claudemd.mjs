/**
 * Build the root CLAUDE.md for the selected stack.
 *
 * The reference's copy is generated once and never updated: it still claims the
 * repo "contains no code yet" and "is not yet a git repository", and it carries
 * zero `@import` lines even though .claude/README.md documents an
 * always-apply-rules-are-imported contract. The four rule files are therefore
 * never loaded. Generating this file fixes both problems and keeps the command
 * list honest for whichever workspaces actually exist.
 */

const WEB_APPS = [
  { ws: "web:site", suffix: "site", label: "Marketing site", port: "site" },
  { ws: "web:app", suffix: "app", label: "Member app", port: "app" },
  { ws: "web:admin", suffix: "admin", label: "Admin", port: "admin" },
];

/** Rules the reference marks always-apply, in load order. */
const ALWAYS_RULES = [
  "requirements",
  "references",
  "error-handling",
  "shell-commands",
];

export function buildClaudeMd(cfg) {
  const has = (w) => cfg.workspaces.includes(w);
  const webs = WEB_APPS.filter((w) => has(w.ws));
  const L = [];

  L.push("# CLAUDE.md", "");
  L.push(
    "This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.",
    "",
  );

  L.push("## Architecture", "");
  L.push(
    `${cfg.displayName} is a monorepo of independent pnpm projects with **no root package.json and no pnpm workspace**.`,
    "Each project owns its own lockfile and tooling config; the root `Makefile` is the orchestrator.",
    "",
  );

  L.push("| Workspace | Stack | Dev command |", "|---|---|---|");
  if (has("api")) {
    L.push(`| \`api/\` | Hono + TypeScript (ESM, NodeNext), MongoDB, Redis, BullMQ, Socket.IO | \`make api-watch\` |`);
  }
  for (const w of webs) {
    L.push(
      `| \`web/${cfg.slug}-${w.suffix}/\` | Next.js + React, Tailwind v4 | \`make ${w.suffix}-dev\` (:${cfg.ports?.[w.port] ?? "?"}) |`,
    );
  }
  if (has("mobile")) {
    L.push(`| \`mobile/\` | Expo / React Native, expo-router | \`make mobile-dev\` |`);
  }
  L.push("");

  L.push("## Commands", "");
  L.push("Run `make help` for the full list. The most common:", "");
  L.push("```bash");
  if (has("api")) {
    L.push("make start          # full docker stack (mongo, redis, api, realtime)");
    L.push("make health         # verify the stack is up");
    L.push("make api-watch      # infra in docker, API on the host with hot reload");
    L.push("make api-test       # vitest");
    L.push("make api-lint       # biome");
  }
  for (const w of webs) L.push(`make ${w.suffix}-dev`.padEnd(20) + `# ${w.label}`);
  if (has("mobile")) {
    L.push("make mobile-dev     # Expo / Metro");
    L.push("make mobile-check   # type-check + tests");
  }
  L.push("make push-check     # the pre-push gate for every selected workspace");
  L.push("```", "");

  L.push("### Running a single test", "");
  L.push("```bash");
  if (has("api")) {
    L.push("cd api && pnpm exec vitest run src/lib/apiError.test.ts");
    L.push("cd api && pnpm exec vitest run -t \"returns a 404\"   # by test name");
  } else if (webs.length) {
    L.push(`cd web/${cfg.slug}-${webs[0].suffix} && pnpm exec vitest run src/app/page.test.tsx`);
  }
  if (has("mobile")) L.push("cd mobile && pnpm exec vitest run lib/i18n/normalizePreferredLanguage.test.ts");
  L.push("```", "");

  L.push("## Conventions", "");
  L.push("- **Biome** for lint and format everywhere. There is no ESLint and no Prettier.");
  L.push("- **Vitest** for tests, colocated with the code they cover.");
  L.push("- Each workspace is installed separately (`cd <workspace> && pnpm install`); there is no root install.");
  if (webs.length) L.push("- Web icons come from `react-icons`; mobile icons from `@expo/vector-icons`.");
  if (has("mobile")) {
    L.push(
      "- Mobile runs edge-to-edge on Android: any bottom-anchored surface must derive padding from `useSafeAreaInsets().bottom`.",
    );
  }
  L.push("");

  L.push("## Shared packages", "");
  if (cfg.wyscanMode === "local") {
    L.push(
      `Shared packages are consumed from a sibling checkout at \`../${cfg.ecosystemDir}\` via pnpm \`file:\` links.`,
      "Run `make wyscan-dev-setup` before the first install.",
    );
  } else if (cfg.wyscanMode === "registry") {
    L.push(
      `Shared packages resolve from a scoped registry (\`${cfg.npmScope}\`). Set \`NPM_TOKEN\` before installing.`,
      "Version ranges were set to a placeholder at scaffold time — pin them before the first real install.",
    );
  } else {
    L.push(
      "This project is standalone: it installs from public npm alone.",
      "Local stubs under `packages/stubs/` stand in for the shared packages — see `docs/shared-packages.md`.",
      "Import specifiers match the real packages, so adopting them later is a dependency swap, not a code change.",
    );
  }
  L.push("");

  if (cfg.aiTools.includes("claude")) {
    L.push("## Always-apply rules", "");
    L.push("These are imported so they load in every session:", "");
    for (const r of ALWAYS_RULES) L.push(`@.claude/rules/${r}.md`);
    L.push("");
  }

  return L.join("\n");
}
