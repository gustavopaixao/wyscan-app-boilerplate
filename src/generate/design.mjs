/**
 * Design-system wiring for files that live in `templates/tree/`.
 *
 * The design system itself ships as authored templates; this module holds the
 * edits to machine-extracted files that have to *carry* it — the token blocks in
 * each `globals.css`, and the admin shell mount.
 *
 * Tokens are **appended**, never rewritten. Tailwind v4 merges multiple
 * `@theme inline` blocks and later CSS wins, so an append is order-safe, leaves
 * the reference content untouched, and stays correct if upstream adds a token of
 * its own. Every append is idempotent — `applyPatches`-style guards, because
 * `transform()` runs once per file but the same helper is reused across the
 * three web workspaces.
 */

/** Re-indent a block of declarations for a deeper nesting level. */
function indent(block, spaces) {
  const pad = " ".repeat(spaces);
  return block
    .split("\n")
    .map((line) => (line.trim() ? pad + line.trimStart() : line))
    .join("\n");
}

/** Throw with a useful message rather than silently producing an unstyled app. */
function requireAnchor(text, anchor, dest) {
  if (!text.includes(anchor)) {
    throw new Error(
      `design wiring: anchor not found in ${dest}.\n` +
        `Expected to find:\n  ${anchor.split("\n")[0]}\n` +
        `The reference project changed shape — update src/generate/design.mjs.`,
    );
  }
}

export const DESIGN_ANCHORS = {
  "tree/web/_app/src/app/globals.css": "@theme inline {",
  "tree/web/_site/src/app/globals.css": "@theme inline {",
  "tree/web/_admin/src/app/globals.css": "@theme inline {",
  "tree/web/_admin/src/app/page.tsx": "export default function DashboardPage()",
  "tree/mobile/lib/theme/index.ts": 'export { semanticColors } from "./colors";',
};

/**
 * Marker so a second pass cannot double-append, and so the test suite can find
 * the block without matching on colour values.
 */
const MARKER = "/* --- design system ------------------------------------------";

/**
 * Text on top of `--accent`.
 *
 * The reference hard-codes `text-white` on its accent fills. That is safe there
 * because its accent is a mid green in both themes, but it is NOT safe here: the
 * dark accent is a light blue (`#60a5fa`), and white on it lands around 2.2:1 —
 * far below the 4.5:1 AA minimum. So the boilerplate carries an explicit
 * on-accent token that flips to near-black in dark mode (~9:1).
 */
const SHARED_TOKENS_LIGHT = `  --on-accent: #ffffff;
  --danger: #dc2626;
  --success: #15803d;`;

const SHARED_TOKENS_DARK = `  --on-accent: #0b1220;
  --danger: #f87171;
  --success: #22c55e;`;

/** Accent scale for the admin console, which ships without one entirely. */
const ADMIN_ACCENT_LIGHT = `  --accent: #2563eb;
  --accent-muted: rgba(37, 99, 235, 0.12);
  --accent-hover: #1d4ed8;`;

const ADMIN_ACCENT_DARK = `  --accent: #60a5fa;
  --accent-muted: rgba(96, 165, 250, 0.18);
  --accent-hover: #93c5fd;`;

const SHARED_THEME_MAP = `  --color-on-accent: var(--on-accent);
  --color-danger: var(--danger);
  --color-success: var(--success);
  /* Alias of --color-card-bg. Both resolve to the same value; bg-card is the
     name used across the design system and its documentation. */
  --color-card: var(--card-bg);`;

/**
 * `_app` and `_site` load Geist in layout.tsx and set --font-geist-sans on
 * <html>, but never map it into the theme and never set a font-family — so both
 * rendered in the browser default font while paying the full font download.
 * `_admin` maps it correctly, which is how the omission was visible at all.
 */
const FONT_FIX = `  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);`;

/**
 * The member app and the public site: add the missing semantic tokens, alias
 * `--color-card`, and actually wire up the fonts they already download.
 */
export function appendWebAppTokens(text, dest) {
  if (text.includes(MARKER)) return text;
  requireAnchor(text, DESIGN_ANCHORS["tree/web/_app/src/app/globals.css"], dest);

  return `${text.trimEnd()}

${MARKER}
   Added by the boilerplate on top of the extracted stylesheet. Appended rather
   than merged into the blocks above so a re-sync cannot clobber it: Tailwind v4
   merges @theme blocks, and later declarations win. */

:root {
${SHARED_TOKENS_LIGHT}
}

.dark {
${SHARED_TOKENS_DARK}
}

@theme inline {
${SHARED_THEME_MAP}
${FONT_FIX}
}

/* The fonts are loaded by layout.tsx and were previously never applied. */
body {
  font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
}
`;
}

/**
 * The admin console. Same additions, plus the accent scale it has no version of,
 * and its dark values go in a media query because admin follows the OS rather
 * than a class (it ships no next-themes).
 */
export function appendAdminTokens(text, dest) {
  if (text.includes(MARKER)) return text;
  requireAnchor(text, DESIGN_ANCHORS["tree/web/_admin/src/app/globals.css"], dest);

  return `${text.trimEnd()}

${MARKER}
   The extracted admin stylesheet has no accent scale at all, so an active nav
   item or a primary button had no colour to reach for. Added here rather than
   hard-coding Tailwind palette classes in the components, which is what the
   reference implementation does and what makes its light mode impossible. */

:root {
${ADMIN_ACCENT_LIGHT}
${SHARED_TOKENS_LIGHT}
}

@media (prefers-color-scheme: dark) {
  :root {
${indent(ADMIN_ACCENT_DARK, 4)}
${indent(SHARED_TOKENS_DARK, 4)}
  }
}

@theme inline {
  --color-accent: var(--accent);
  --color-accent-muted: var(--accent-muted);
  --color-accent-hover: var(--accent-hover);
${SHARED_THEME_MAP}
}
`;
}

/**
 * The admin dashboard page.
 *
 * The extracted page is a `min-h-dvh` centred splash, which is correct for a
 * console with no chrome and wrong the moment it sits inside a sidebar layout.
 * Replaced wholesale rather than patched — the same call the generated
 * `CLAUDE.md` and the mobile entry route already make.
 */
export function buildAdminDashboardPage() {
  return `import { MdOutlineSpaceDashboard } from "react-icons/md";
import { PageHeader } from "@/components/layout/PageHeader";
import { t } from "@/lib/i18n/strings";

/**
 * Placeholder dashboard. Sits inside the shell from \`AppShell\`, so it owns no
 * page chrome of its own — no min-height, no centring.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin_dashboard_title")}
        description={t("admin_dashboard_placeholder")}
      />

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-12 text-center">
        <MdOutlineSpaceDashboard className="size-10 text-muted" aria-hidden />
        <p className="text-sm text-muted">{t("admin_dashboard_placeholder")}</p>
      </div>
    </div>
  );
}
`;
}

/** Mount the shell inside the guard that the auth wiring already added. */
export function mountAdminShell(text, dest) {
  const anchor = "<AuthGuard>";
  requireAnchor(text, anchor, dest);
  if (text.includes("<AppShell>")) return text;

  return text
    .replace(/<AuthGuard>([\s\S]*?)<\/AuthGuard>/, (_match, inner) => {
      return `<AuthGuard>\n            <AppShell>${inner.trim()}</AppShell>\n          </AuthGuard>`;
    })
    .replace(
      `import { AuthGuard } from "@/components/auth/AuthGuard";`,
      `import { AuthGuard } from "@/components/auth/AuthGuard";\nimport { AppShell } from "@/components/layout/AppShell";`,
    );
}

/**
 * The mobile theme barrel.
 *
 * `lib/theme/` is extracted, so the new scales are re-exported by appending to
 * its barrel rather than by rewriting it. Screens import everything from
 * `@/lib/theme`, so this is what makes the additions reachable.
 */
export function appendMobileThemeBarrel(text, dest) {
  if (text.includes("./appColors")) return text;
  requireAnchor(text, DESIGN_ANCHORS["tree/mobile/lib/theme/index.ts"], dest);

  return `${text.trimEnd()}

// --- design system ---------------------------------------------------------
// Added by the boilerplate. appColors() extends semanticColors() above with the
// on-accent, error and success roles; the scales below have no extracted
// counterpart. Appended so a re-sync of this barrel cannot clobber them.
export type { AppColors } from "./appColors";
export { appColors, resolveScheme } from "./appColors";
export type { TypographyRole } from "./typography";
export { typography } from "./typography";
export { BUTTON_STACK_GAP, MIN_TOUCH_TARGET, SCREEN_EDGE_PADDING } from "./spacing";
export { radii } from "./radii";
export { screenChromeOptions } from "./screenChromeOptions";
`;
}
