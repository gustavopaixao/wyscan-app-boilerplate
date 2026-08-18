import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { DESIGN_ANCHORS } from "../src/generate/design.mjs";
import { AUTH_STRINGS, NAV_STRINGS, NAV_STRING_KEYS } from "../src/generate/authStrings.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "create.mjs");
const TEMPLATES = join(ROOT, "templates");

function generate(args) {
  const dir = mkdtempSync(join(tmpdir(), "wab-design-"));
  execFileSync("node", [CLI, ...args, dir], { encoding: "utf8" });
  return dir;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/**
 * The design tokens and the admin shell are injected into machine-extracted
 * files. A re-sync that reshapes one of them would otherwise fail only when
 * someone generated a project.
 */
describe("design transform anchors", () => {
  for (const [src, anchor] of Object.entries(DESIGN_ANCHORS)) {
    test(`${src} still contains its anchor`, () => {
      const text = readFileSync(join(TEMPLATES, src), "utf8");
      assert.ok(
        text.includes(anchor),
        `Anchor missing from templates/${src}. Update DESIGN_ANCHORS in src/generate/design.mjs.`,
      );
    });
  }
});

describe("navigation string catalogue", () => {
  test("every locale defines every navigation key", () => {
    for (const [locale, strings] of Object.entries(NAV_STRINGS)) {
      const missing = NAV_STRING_KEYS.filter((k) => !strings[k]);
      assert.deepEqual(missing, [], `${locale} is missing navigation keys`);
    }
  });

  test("covers the same locales as the auth catalogue", () => {
    assert.deepEqual(Object.keys(NAV_STRINGS).sort(), Object.keys(AUTH_STRINGS).sort());
  });
});

describe("generated design system", () => {
  let dir;

  before(() => {
    dir = generate(["--slug", "demo-shop", "--owner", "octocat", "--wyscan", "standalone"]);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  test("every web surface exposes the full token set", () => {
    for (const app of ["app", "admin", "site"]) {
      const css = readFileSync(join(dir, `web/demo-shop-${app}/src/app/globals.css`), "utf8");
      for (const token of ["--color-accent", "--color-on-accent", "--color-card", "--color-danger"]) {
        assert.ok(css.includes(token), `${app} is missing ${token}`);
      }
    }
  });

  // The member app and the site downloaded Geist and never applied it — the
  // fonts were dead weight on every page load.
  test("the loaded fonts are actually applied on every web surface", () => {
    for (const app of ["app", "admin", "site"]) {
      const css = readFileSync(join(dir, `web/demo-shop-${app}/src/app/globals.css`), "utf8");
      assert.match(css, /--font-sans:\s*var\(--font-geist-sans\)/, `${app} does not map the font`);
      assert.match(css, /font-family:\s*var\(--font-sans\)/, `${app} never applies the font`);
    }
  });

  test("mobile exposes the extended palette and the scales", () => {
    const barrel = readFileSync(join(dir, "mobile/lib/theme/index.ts"), "utf8");
    for (const symbol of ["appColors", "typography", "radii", "SCREEN_EDGE_PADDING"]) {
      assert.ok(barrel.includes(symbol), `theme barrel does not export ${symbol}`);
    }
    assert.ok(existsSync(join(dir, "mobile/lib/theme/appColors.ts")));
  });

  test("admin ships the shell, mounted inside the auth guard", () => {
    const layout = readFileSync(join(dir, "web/demo-shop-admin/src/app/layout.tsx"), "utf8");
    assert.match(layout, /<AppShell>/);
    // Order matters: the shell reads auth state, so the guard must be outside.
    assert.ok(layout.indexOf("<AuthGuard>") < layout.indexOf("<AppShell>"));

    for (const file of ["AppShell", "Sidebar", "SidebarGroup", "Header", "navItems"]) {
      assert.ok(
        existsSync(join(dir, `web/demo-shop-admin/src/components/layout/${file}.tsx`)) ||
          existsSync(join(dir, `web/demo-shop-admin/src/components/layout/${file}.ts`)),
        `missing layout/${file}`,
      );
    }
  });

  test("admin logout is reachable from the shell chrome", () => {
    const header = readFileSync(
      join(dir, "web/demo-shop-admin/src/components/layout/Header.tsx"),
      "utf8",
    );
    assert.match(header, /useSignOut/);
    assert.match(header, /nav_sign_out/);
  });

  test("the dashboard no longer owns page chrome", () => {
    const page = readFileSync(join(dir, "web/demo-shop-admin/src/app/page.tsx"), "utf8");
    // A full-height centred splash inside a sidebar layout is the bug this
    // transform exists to prevent.
    assert.ok(!page.includes("min-h-dvh"), "dashboard still sets its own min-height");
    assert.match(page, /PageHeader/);
  });

  test("mobile ships bottom tabs and the toolbar", () => {
    assert.ok(existsSync(join(dir, "mobile/app/(app)/(tabs)/_layout.tsx")));
    const tabs = readFileSync(join(dir, "mobile/app/(app)/(tabs)/_layout.tsx"), "utf8");
    assert.match(tabs, /useTabChromeScreenOptions/);
    assert.match(tabs, /AppMainToolbar/);

    // The old flat entry screen must be gone, or it collides with the tab index.
    assert.ok(!existsSync(join(dir, "mobile/app/(app)/index.tsx")));
  });

  test("mobile logout lives in the account menu", () => {
    const menu = readFileSync(
      join(dir, "mobile/components/navigation/AccountMenu.tsx"),
      "utf8",
    );
    assert.match(menu, /signOut/);
    assert.match(menu, /auth_sign_out/);
  });

  test("no generated component hard-codes a colour outside the token files", () => {
    // Token definitions are the one place a literal belongs.
    const TOKEN_FILES = [
      "mobile/lib/theme/colors.ts",
      "mobile/lib/theme/appColors.ts",
      "globals.css",
    ];
    const offenders = [];

    for (const file of walk(dir)) {
      if (!/\/(components|app)\/.*\.tsx?$/.test(file)) continue;
      if (TOKEN_FILES.some((t) => file.endsWith(t))) continue;
      const text = readFileSync(file, "utf8");
      // Six-digit hex literals only; rgba() chrome tints are deliberate and
      // documented where they appear.
      for (const match of text.match(/#[0-9a-fA-F]{6}\b/g) ?? []) {
        offenders.push(`${file.replace(dir, "")}: ${match}`);
      }
    }

    assert.deepEqual(offenders, []);
  });
});

/**
 * The shared design-system package is declared in `mobile/package.json` and
 * aliased in `metro.config.js`, so an import of it resolves cleanly while you
 * work in `--wyscan local` — and breaks the build in `registry` and
 * `standalone`, where both the alias and the dependency are gone.
 *
 * Nothing in the app imports it, and `docs/runbooks/design-system.md` says
 * nothing should. This is what stops that rule from being prose only: the mode
 * that breaks is never the mode the author is working in, so without a guard
 * the mistake ships.
 */
describe("mobile never imports the shared design-system package", () => {
  const PACKAGE = "wyscan-react-native";

  test("no shipped mobile template imports it", () => {
    const offenders = [];
    for (const file of walk(join(TEMPLATES, "authored/mobile"))) {
      if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      // Only an actual import binds the app to the package; a comment naming it
      // (several do, explaining precisely this) is fine.
      if (new RegExp(`from\\s+["']${PACKAGE}["']|require\\(["']${PACKAGE}["']`).test(text)) {
        offenders.push(relative(TEMPLATES, file));
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `These import \`${PACKAGE}\`, which only resolves in --wyscan local and ` +
        `breaks the mobile build in registry and standalone. Reimplement what you ` +
        `need in mobile/components/ui/ — see "The shared package, and why nothing ` +
        `imports it" in templates/authored/docs/runbooks/design-system.md.`,
    );
  });

  test("the generated app does not import it either", () => {
    // Covers the extracted tree/ templates too, not just the authored ones.
    // Asserting template content, not install feasibility: these run in a
    // tmpdir with no sibling checkout, which local mode now refuses by default.
    const dir = generate([
      "--slug", "demo-ds", "--workspaces", "mobile",
      "--wyscan", "local", "--allow-missing-ecosystem",
    ]);
    try {
      const offenders = walk(join(dir, "mobile"))
        .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f) && !f.includes("node_modules"))
        .filter((f) => {
          const text = readFileSync(f, "utf8");
          return new RegExp(`from\\s+["']${PACKAGE}["']`).test(text);
        })
        .map((f) => relative(dir, f));
      assert.deepEqual(offenders, [], `generated mobile app imports ${PACKAGE}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the runbook still documents the rule it is guarding", () => {
    const runbook = readFileSync(join(TEMPLATES, "authored/docs/runbooks/design-system.md"), "utf8");
    assert.match(runbook, /The shared package, and why nothing imports it/);
    assert.match(runbook, /nothing in the generated app imports it, and nothing should/i);
  });
});

describe("design respects workspace selection", () => {
  test("an api-only project carries no shell or tab chrome", () => {
    const dir = generate(["--slug", "demo-api", "--workspaces", "api", "--wyscan", "standalone"]);
    try {
      const stray = walk(dir).filter((f) => f.includes("/web/") || f.includes("/mobile/"));
      assert.deepEqual(stray, []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
