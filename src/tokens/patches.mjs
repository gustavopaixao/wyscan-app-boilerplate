/**
 * Post-tokenization text patches applied by the extractor.
 *
 * These fix defects in the reference project that would otherwise ship into
 * every generated scaffold. They live here (not as edits to the reference,
 * which is read-only) so a re-sync reapplies them automatically.
 */

/**
 * The reference still carries comment references to its own predecessor
 * project. Harmless at runtime, but a dangling name in a generic boilerplate.
 * Ordered longest-first so the catch-all cannot pre-empt a specific phrasing.
 */
export const PROSE_REWRITES = [
  ["palpitepro keeps the real, gitignored files", "the real, gitignored files live"],
  ["see the palpitepro reference structure", "see the reference structure"],
  ["palpitepro's reference implementation", "the reference implementation"],
  ["same seam palpitepro used", "same seam the reference implementation used"],
  ["the palpitepro reference", "the reference implementation"],
  ["palpitepro reference", "reference implementation"],
  ["palpitepro", "the reference implementation"],
];

/**
 * `claude-opus-4-8` is not a valid model id. `inherit` is already the value in
 * 10 sibling agent files, so it is the established in-repo convention and
 * cannot go stale again.
 */
export const MODEL_REWRITES = [
  ["model: claude-opus-4-8", "model: inherit"],
];

/**
 * Expo names the generated Xcode project after the app `name` with
 * non-alphanumerics stripped, so a multi-word display name such as
 * "Demo Shop" yields `ios/DemoShop.xcodeproj`. The reference hardcodes the
 * display name directly, which only worked because "Botonistas" is one word.
 */
/**
 * The reference names a JS identifier after itself
 * (`const botonistasSchemeFilter`). Tokenizing it yields
 * `const __PROJECT_SLUG__SchemeFilter`, which renders as `const my-appSchemeFilter`
 * for any hyphenated slug — a syntax error that breaks typecheck, Metro,
 * `expo prebuild` and `make mobile-dev`. It only worked upstream because
 * "botonistas" happens to be a valid identifier.
 *
 * The identifier does not need to carry the project name at all.
 */
export const IDENTIFIER_REWRITES = [
  ["__PROJECT_SLUG__SchemeFilter", "appSchemeFilter"],
];

export const IOS_PATH_REWRITES = [
  ["ios/__PROJECT_NAME__.xcodeproj", "ios/__IOS_PROJECT_NAME__.xcodeproj"],
  ["ios/__PROJECT_NAME__/", "ios/__IOS_PROJECT_NAME__/"],
];

/**
 * Formatter suppressions for lines whose width depends on a substituted value.
 *
 * The generated project runs `biome check` in CI and in its pre-commit hook,
 * and Biome decides line wrapping by width. A line carrying `__PROJECT_SLUG__`
 * or `__PROJECT_NAME__` is a different width in every generated project — the
 * slug alone ranges from 3 to 44 characters — so **no single formatting of
 * these lines is correct for every project**. The reference is formatted for
 * "botonistas" and is therefore wrong for both shorter and longer names: a
 * fresh scaffold failed `biome check` on its very first commit.
 *
 * A suppression comment freezes the wrapping, which is stable at every length.
 * Verified against both a 3-character and a 44-character slug.
 *
 * Where the boilerplate owns the file (`templates/authored/`) the same problem
 * is solved properly instead — the substituted value is bound to a short
 * `const` and referenced, so the long line never occurs. That is not available
 * here: these patches are text replacements over reference sources, and
 * introducing a module-scope binding by string surgery would be far more
 * fragile than one comment.
 */
const FORMAT_SUPPRESSION = "// biome-ignore format: width depends on the generated project name";

export const FORMAT_SUPPRESSIONS = [
  // api/src/realtime/websocketServer.ts
  [
    `  return (
    process.env.REALTIME_EMIT_CHANNEL?.trim() || "__PROJECT_SLUG__:realtime:emit"
  );`,
    `  ${FORMAT_SUPPRESSION}
  return (
    process.env.REALTIME_EMIT_CHANNEL?.trim() || "__PROJECT_SLUG__:realtime:emit"
  );`,
  ],
  [
    "    console.log(`__PROJECT_NAME__ realtime listening on http://0.0.0.0:${port}`);",
    `    ${FORMAT_SUPPRESSION}
    console.log(\`__PROJECT_NAME__ realtime listening on http://0.0.0.0:\${port}\`);`,
  ],

  // api/src/server.ts
  [
    "console.log(`__PROJECT_NAME__ API listening on http://0.0.0.0:${port}`);",
    `${FORMAT_SUPPRESSION}
console.log(\`__PROJECT_NAME__ API listening on http://0.0.0.0:\${port}\`);`,
  ],

  // api/src/logAgent/server.ts
  [
    '    res.end(JSON.stringify({ ok: true, service: "__PROJECT_SLUG__-log-agent" }));',
    `    ${FORMAT_SUPPRESSION}
    res.end(JSON.stringify({ ok: true, service: "__PROJECT_SLUG__-log-agent" }));`,
  ],
  [
    "  console.log(`__PROJECT_NAME__ log agent listening on http://0.0.0.0:${port}`);",
    `  ${FORMAT_SUPPRESSION}
  console.log(\`__PROJECT_NAME__ log agent listening on http://0.0.0.0:\${port}\`);`,
  ],

  // api/src/lib/firebaseAdmin.test.ts
  [
    '  client_email: "svc@__PROJECT_SLUG__-test.iam.gserviceaccount.com",',
    `  ${FORMAT_SUPPRESSION}
  client_email: "svc@__PROJECT_SLUG__-test.iam.gserviceaccount.com",`,
  ],

  // api/src/lib/validateProductionEnv.test.ts
  [
    '          CORS_ORIGIN: "https://__PROJECT_DOMAIN__",',
    `          ${FORMAT_SUPPRESSION}
          CORS_ORIGIN: "https://__PROJECT_DOMAIN__",`,
  ],

  // web/*/src/lib/theme/theme-preference.ts
  [
    'export const THEME_STORAGE_KEY = "__PROJECT_SLUG__-theme";',
    `${FORMAT_SUPPRESSION}
export const THEME_STORAGE_KEY = "__PROJECT_SLUG__-theme";`,
  ],

  // web/_app/security-headers.test.ts
  [
    '    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://__API_DOMAIN__");',
    `    ${FORMAT_SUPPRESSION}
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://__API_DOMAIN__");`,
  ],
  [
    '    expect(csp).toContain("wss://__API_DOMAIN__");',
    `    ${FORMAT_SUPPRESSION}
    expect(csp).toContain("wss://__API_DOMAIN__");`,
  ],
];

/** All rewrites, applied in order, to every non-raw file. */
export function applyPatches(text) {
  let out = text;
  for (const [from, to] of [
    ...PROSE_REWRITES,
    ...MODEL_REWRITES,
    ...IDENTIFIER_REWRITES,
    ...IOS_PATH_REWRITES,
  ]) {
    out = out.replaceAll(from, to);
  }

  // Applied last, and only once per site: the replacement contains the original
  // text, so re-running an already-patched file would stack a second comment.
  for (const [from, to] of FORMAT_SUPPRESSIONS) {
    if (out.includes(from) && !out.includes(to)) out = out.replaceAll(from, to);
  }

  return out;
}
