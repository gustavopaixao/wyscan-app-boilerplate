/**
 * Auth wiring for files that live in `templates/tree/`.
 *
 * The auth feature itself ships as authored templates, but a handful of
 * reference files have to *call* it: the Hono app has to register the routes,
 * the web proxy has to gate sessions, the mobile root layout has to mount the
 * provider. Those files are machine-extracted and cannot be hand-edited, so the
 * hooks are applied here at write time.
 *
 * Every injection is anchored on a unique existing string and **throws** when
 * the anchor is gone. That is deliberate: a future `npm run sync` that reshapes
 * `api/src/app.ts` must fail the build loudly rather than quietly produce a
 * project whose auth routes were never registered. `test/auth.test.mjs` asserts
 * each anchor is still present so the failure surfaces in CI, not in a user's
 * generated project.
 */

import { mobileStringsFor, webAuthMessages, webNavMessages } from "./authStrings.mjs";

/**
 * Replace `anchor` with `replacement`, or throw naming the file.
 * @param {string} text
 * @param {string} anchor   unique substring expected in `text`
 * @param {string} replacement
 * @param {string} dest     for the error message
 */
function anchoredReplace(text, anchor, replacement, dest) {
  if (!text.includes(anchor)) {
    throw new Error(
      `auth wiring: anchor not found in ${dest}.\n` +
        `Expected to find:\n  ${anchor.split("\n")[0]}\n` +
        `The reference project changed shape — update ANCHORS in src/generate/auth.mjs.`,
    );
  }
  return text.replace(anchor, replacement);
}

/**
 * Every anchor, in one place, so the guard test can assert them without
 * re-running a full generation.
 *
 * Keyed by the template `src` path (which is stable) rather than the rendered
 * `dest` (which carries the slug).
 */
export const ANCHORS = {
  "tree/api/src/app.ts": `  const { registerStaticAssetRoutes } = await import("./staticRoutes.js");`,
  "tree/web/_app/src/proxy.ts": `export default createMiddleware(routing);`,
  "tree/web/_app/src/app/[locale]/layout.tsx": `      {children}\n    </NextIntlClientProvider>`,
  "tree/web/_admin/src/app/layout.tsx": null, // resolved dynamically, see below
  "tree/mobile/app/_layout.tsx": `			<LocaleProvider>\n				<RootNavigation />\n			</LocaleProvider>`,
};

/** api/src/app.ts — register the auth routes and their rate limiter. */
export function wireApiApp(text, dest) {
  const anchor = ANCHORS["tree/api/src/app.ts"];
  return anchoredReplace(
    text,
    anchor,
    `  // Auth: the rate limiter must be bound BEFORE the routes it protects.
  const { authRateLimit } = await import("./middleware/authRateLimit.js");
  app.use("/api/v1/auth/*", authRateLimit());
  const { registerV1AuthRoutes } = await import("./v1/authRoutes.js");
  registerV1AuthRoutes(app);
  // The admin directory. Gated on \`requireAdmin\` in the handler itself, so it
  // needs no middleware of its own.
  const { registerV1AdminRoutes } = await import("./v1/admin/routes.js");
  registerV1AdminRoutes(app);
${anchor}`,
    dest,
  );
}

/** web/<slug>-app/src/proxy.ts — gate sessions ahead of locale routing. */
export function wireWebAppProxy(text, dest) {
  return anchoredReplace(
    text,
    ANCHORS["tree/web/_app/src/proxy.ts"],
    `const intlMiddleware = createMiddleware(routing);

/**
 * Session gate first, locale routing second. The gate redirects to a
 * locale-prefixed path, so running it after next-intl would double-handle the
 * prefix.
 */
export default function proxy(request: NextRequest) {
  const gated = applySessionGate(request);
  if (gated) return gated;
  return intlMiddleware(request);
}`,
    dest,
  )
    // Replace the whole import block rather than prepending, so the result is
    // already in Biome's `organizeImports` order (external packages sorted,
    // then `@/` aliases sorted). The generated project runs `biome check` in
    // its pre-commit hook, so an unsorted block would fail on first commit.
    .replace(
      `import createMiddleware from "next-intl/middleware";\nimport { routing } from "@/i18n/routing";`,
      `import type { NextRequest } from "next/server";\n` +
        `import createMiddleware from "next-intl/middleware";\n` +
        `import { routing } from "@/i18n/routing";\n` +
        `import { applySessionGate } from "@/lib/server/session-gate";`,
    )
    .replace(
      / \* Locale-routing proxy \(feature 0001\)\. Session gating plugs in here once auth\n \* lands \(see reference implementation `applySessionGate`\)\.\n/,
      " * Locale-routing proxy with session gating.\n",
    );
}

/** web/<slug>-app/src/app/[locale]/layout.tsx — mount the client-side guard. */
export function wireWebAppLocaleLayout(text, dest) {
  return anchoredReplace(
    text,
    ANCHORS["tree/web/_app/src/app/[locale]/layout.tsx"],
    `      <AuthGuard>{children}</AuthGuard>
    </NextIntlClientProvider>`,
    dest,
  ).replace(
    `import { routing } from "@/i18n/routing";`,
    `import { AuthGuard } from "@/components/auth/AuthGuard";\nimport { routing } from "@/i18n/routing";`,
  );
}

/**
 * web/<slug>-admin/src/app/layout.tsx — mount the guard inside <Providers>.
 *
 * The admin layout is not locale-aware and its JSX differs from the member
 * app's, so the anchor is discovered rather than hard-coded: we wrap whatever
 * sits directly inside <Providers>.
 */
export function wireWebAdminLayout(text, dest) {
  const match = text.match(/<Providers>([\s\S]*?)<\/Providers>/);
  if (!match) {
    throw new Error(
      `auth wiring: no <Providers> element in ${dest}.\n` +
        `The reference admin layout changed shape — update wireWebAdminLayout in src/generate/auth.mjs.`,
    );
  }
  const inner = match[1];
  return text
    .replace(match[0], `<Providers>\n          <AuthGuard>${inner.trimEnd()}</AuthGuard>\n        </Providers>`)
    .replace(
      /^(import .*?from "\.\/providers";)$/m,
      `import { AuthGuard } from "@/components/auth/AuthGuard";\n$1`,
    );
}

/** mobile/app/_layout.tsx — own auth state above navigation. */
export function wireMobileRootLayout(text, dest) {
  return anchoredReplace(
    text,
    ANCHORS["tree/mobile/app/_layout.tsx"],
    `			<AuthProvider>
				<LocaleProvider>
					<RootNavigation />
				</LocaleProvider>
			</AuthProvider>`,
    dest,
  ).replace(
    `import { LocaleProvider } from "@/lib/i18n";`,
    `import { AuthProvider } from "@/lib/auth/AuthContext";\nimport { LocaleProvider } from "@/lib/i18n";`,
  );
}

/**
 * mobile/app/index.tsx — the entry route becomes the auth branch point.
 *
 * A full replacement rather than an injection: the file is three lines and its
 * entire job changes. Same pattern as `buildClaudeMd`.
 */
export function buildMobileIndex() {
  return `import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";

/**
 * Entry route: send the user to the app or to sign-in once the stored session
 * has been checked. Rendering nothing while \`ready\` is false avoids a flash of
 * the sign-in screen for users who are in fact signed in.
 */
export default function Index() {
	const { user, ready } = useAuth();

	if (!ready) return <AuthLoadingScreen />;
	return <Redirect href={user ? "/(app)" : "/(auth)/login"} />;
}
`;
}

/**
 * Merge an `auth` namespace into a next-intl message catalogue.
 *
 * Parsed-JSON merge, never a string splice — the catalogues are reformatted by
 * Biome upstream and any textual anchor would be brittle. An existing `auth`
 * key wins, so a future reference translation is not clobbered.
 */
export function mergeWebMessages(text, locale) {
  const messages = JSON.parse(text);
  if (messages.auth && messages.nav) return text;
  // An existing namespace wins, so a future reference translation is not lost.
  messages.auth ??= webAuthMessages(locale);
  messages.nav ??= webNavMessages(locale);
  return `${JSON.stringify(messages, null, 2)}\n`;
}

/**
 * Merge flat `auth_*` keys into a mobile locale bundle. Mobile uses a flat
 * snake_case keyspace rather than next-intl's nested namespaces.
 */
export function mergeMobileLocale(text, locale) {
  const strings = JSON.parse(text);
  const additions = mobileStringsFor(locale);
  let changed = false;
  for (const [key, value] of Object.entries(additions)) {
    if (!(key in strings)) {
      strings[key] = value;
      changed = true;
    }
  }
  if (!changed) return text;
  return `${JSON.stringify(strings, null, 2)}\n`;
}

/**
 * api/.env.example — document the variables the BFF and mailer need.
 *
 * Appended rather than injected: the file is a flat list of comments and
 * assignments with no structure to anchor on, and appending is order-safe.
 */
export function appendApiEnvExample(text, cfg) {
  if (text.includes("INTERNAL_API_SECRET")) return text;

  // NOTE: transform() runs AFTER render(), so a `__SENTINEL__` written here is
  // never substituted and aborts generation. Interpolate from cfg instead.
  return `${text.trimEnd()}

# BFF <-> API shared secret. The web apps proxy every authenticated request
# server-side and identify themselves with these. Optional in development: when
# INTERNAL_API_SECRET is unset the API does not require the header, so a freshly
# generated project runs unconfigured. Set both before exposing the API.
# Generate: openssl rand -base64 32
INTERNAL_API_CLIENT_ID=
INTERNAL_API_SECRET=

# Transactional email for verification and password-reset codes.
# WITHOUT THIS the API writes codes to its own log instead of sending them —
# fine for local development, refused outright when NODE_ENV=production.
# See docs/runbooks/auth.md to wire a provider.
# MAILGUN_API_KEY=
# MAILGUN_DOMAIN=
# MAILGUN_FROM=${cfg.displayName} <no-reply@${cfg.domain}>
`;
}
