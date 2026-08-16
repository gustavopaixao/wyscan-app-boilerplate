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

/** All rewrites, applied in order, to every non-raw file. */
export function applyPatches(text) {
  let out = text;
  for (const [from, to] of [...PROSE_REWRITES, ...MODEL_REWRITES]) {
    out = out.replaceAll(from, to);
  }
  return out;
}
