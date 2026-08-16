import { TOKENS, allSentinels } from "./catalog.mjs";

/** Escape a literal for use inside a RegExp. */
function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extraction direction: reference literal -> sentinel.
 * Applied in catalog order so specific forms are consumed before general ones.
 */
export function tokenize(text) {
  let out = text;
  for (const { sentinel, literal } of TOKENS) {
    out = out.replaceAll(literal, sentinel);
  }
  return out;
}

/**
 * Install direction: sentinel -> configured value.
 * Order-independent, but we still iterate the catalog so an unmapped sentinel
 * is reported rather than silently left in place.
 */
export function render(text, values) {
  let out = text;
  for (const { sentinel, field } of TOKENS) {
    const value = values[field];
    if (value === undefined || value === null) continue;
    out = out.replaceAll(sentinel, String(value));
  }
  return out;
}

/** Same as render(), for a path. Applied per-segment-safe (plain replace works). */
export function renderPath(p, values) {
  return render(p, values);
}

/**
 * Any of OUR sentinels left over after render() is a bug.
 *
 * Deliberately matches only catalog sentinels rather than the general
 * `__UPPER__` shape: React Native ships `__DEV__`, and Metro/Babel emit other
 * dunder globals, none of which are ours to resolve.
 */
export function residualSentinels(text) {
  return allSentinels().filter((s) => text.includes(s));
}

/**
 * Case-insensitive search for literals that must not survive, ignoring any
 * occurrence that is part of an allowed substring (see DENYLIST usage).
 */
export function findResidue(text, literals, denylist = []) {
  const hits = [];
  for (const lit of literals) {
    const re = new RegExp(esc(lit), "gi");
    let m;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const allowed = denylist.some((d) => {
        const dIdx = text.toLowerCase().indexOf(d.toLowerCase(), Math.max(0, start - d.length));
        return dIdx !== -1 && dIdx <= start && start < dIdx + d.length;
      });
      if (!allowed) hits.push({ literal: lit, index: start });
    }
  }
  return hits;
}
