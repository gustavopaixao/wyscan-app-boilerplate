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
  return out;
}
