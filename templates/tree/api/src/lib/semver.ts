/**
 * Minimal, fail-safe semver comparison (feature 0226).
 *
 * Used to validate update-gate config values and (client-side, in a mirrored
 * copy) to resolve the update gate. Intentionally tiny: no dependency, only the
 * subset needed for `major.minor.patch` with an optional pre-release suffix.
 *
 * **Fail-safe contract:** any malformed input makes `isVersionBelow` return
 * `false` ("not below") so a bad/garbled version can never trigger a hard block
 * — the gate always fails open (never locks a user out).
 */

export type ParsedSemver = {
  major: number;
  minor: number;
  patch: number;
  /** Dot-separated pre-release identifiers, or [] for a release build. */
  prerelease: string[];
};

const CORE_RE = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/;

/**
 * Parse a semver-shaped string. Accepts a missing minor/patch (treated as 0)
 * and an optional `-prerelease` suffix. Build metadata (`+…`) is ignored.
 * Returns `null` for anything not shaped like a version.
 */
export function parseSemver(input: unknown): ParsedSemver | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;

  // Strip build metadata (ignored for precedence per semver spec).
  const withoutBuild = trimmed.split("+", 1)[0] ?? trimmed;
  const [core, ...preParts] = withoutBuild.split("-");
  const prereleaseRaw = preParts.join("-");

  const m = CORE_RE.exec(core ?? "");
  if (!m) return null;

  const major = Number(m[1]);
  const minor = m[2] === undefined ? 0 : Number(m[2]);
  const patch = m[3] === undefined ? 0 : Number(m[3]);
  if (
    !Number.isFinite(major) ||
    !Number.isFinite(minor) ||
    !Number.isFinite(patch)
  ) {
    return null;
  }

  const prerelease =
    prereleaseRaw === ""
      ? []
      : prereleaseRaw.split(".").filter((s) => s !== "");
  // A trailing/empty pre-release marker (e.g. "1.0.0-") is malformed.
  if (preParts.length > 0 && prerelease.length === 0) return null;

  return { major, minor, patch, prerelease };
}

/** True when a string is a parseable semver. */
export function isValidSemver(input: unknown): boolean {
  return parseSemver(input) !== null;
}

function comparePrerelease(a: string[], b: string[]): -1 | 0 | 1 {
  // A release (no prerelease) has HIGHER precedence than a prerelease.
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;

  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai === undefined) return -1; // shorter set has lower precedence
    if (bi === undefined) return 1;
    const aNum = /^\d+$/.test(ai);
    const bNum = /^\d+$/.test(bi);
    if (aNum && bNum) {
      const d = Number(ai) - Number(bi);
      if (d !== 0) return d < 0 ? -1 : 1;
    } else if (aNum !== bNum) {
      // Numeric identifiers have lower precedence than alphanumeric.
      return aNum ? -1 : 1;
    } else if (ai !== bi) {
      return ai < bi ? -1 : 1;
    }
  }
  return 0;
}

/**
 * Compare two semver strings. Returns `-1` (a < b), `0` (equal), or `1` (a > b).
 * Malformed input on either side returns `0` (fail-safe: treated as "equal", so
 * `isVersionBelow` reports "not below").
 */
export function compareSemver(a: unknown, b: unknown): -1 | 0 | 1 {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;

  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  return comparePrerelease(pa.prerelease, pb.prerelease);
}

/**
 * True when `current` is strictly below `target`. Fail-safe: if either value is
 * malformed, returns `false` so the update gate never blocks on bad data.
 */
export function isVersionBelow(current: unknown, target: unknown): boolean {
  if (!isValidSemver(current) || !isValidSemver(target)) return false;
  return compareSemver(current, target) < 0;
}
