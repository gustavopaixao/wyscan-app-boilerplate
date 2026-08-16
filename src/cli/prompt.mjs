/**
 * Zero-dependency prompts on node:readline/promises.
 *
 * Numbered input rather than arrow-key raw mode: it is a fraction of the code,
 * works over pipes and in terminals that mishandle raw mode, and is trivially
 * scriptable. Any dependency here would turn the `npx` install step from a
 * no-op into a network round-trip, which is the whole point of shipping with
 * no dependencies.
 *
 * Non-TTY input falls back to defaults and throws on a required field with no
 * default, so an unattended run can never hang waiting on stdin.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const isTTY = Boolean(stdin.isTTY);
const color = stdout.isTTY && !process.env.NO_COLOR;

const c = {
  dim: (s) => (color ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s) => (color ? `\x1b[1m${s}\x1b[0m` : s),
  cyan: (s) => (color ? `\x1b[36m${s}\x1b[0m` : s),
  red: (s) => (color ? `\x1b[31m${s}\x1b[0m` : s),
  green: (s) => (color ? `\x1b[32m${s}\x1b[0m` : s),
};

export { c as colors };

let rl = null;
function io() {
  if (!rl) rl = createInterface({ input: stdin, output: stdout });
  return rl;
}

export function closePrompts() {
  rl?.close();
  rl = null;
}

function required(label, fallback) {
  if (fallback !== undefined) return fallback;
  throw new Error(`--yes/non-interactive run needs a value for "${label}"`);
}

/**
 * Free-text question.
 * @param {{message: string, default?: string, validate?: (v: string) => string | null}} opts
 */
export async function text({ message, default: def, validate }) {
  if (!isTTY) return required(message, def);

  for (;;) {
    const hint = def ? c.dim(` (${def})`) : "";
    const answer = (await io().question(`${c.cyan("?")} ${c.bold(message)}${hint} `)).trim();
    const value = answer || def || "";

    if (!value) {
      stdout.write(`  ${c.red("A value is required.")}\n`);
      continue;
    }
    const problem = validate?.(value);
    if (problem) {
      stdout.write(`  ${c.red(problem)}\n`);
      continue;
    }
    return value;
  }
}

/** Yes/no question. */
export async function confirm({ message, default: def = true }) {
  if (!isTTY) return def;
  const hint = def ? "Y/n" : "y/N";
  for (;;) {
    const a = (await io().question(`${c.cyan("?")} ${c.bold(message)} ${c.dim(`(${hint})`)} `))
      .trim()
      .toLowerCase();
    if (!a) return def;
    if (["y", "yes"].includes(a)) return true;
    if (["n", "no"].includes(a)) return false;
    stdout.write(`  ${c.red("Please answer y or n.")}\n`);
  }
}

/**
 * Pick exactly one.
 * @param {{message: string, choices: Array<{value: string, label: string, hint?: string}>, default?: string}} opts
 */
export async function select({ message, choices, default: def }) {
  if (!isTTY) return def ?? choices[0].value;

  stdout.write(`${c.cyan("?")} ${c.bold(message)}\n`);
  choices.forEach((ch, i) => {
    const mark = ch.value === def ? c.green("*") : " ";
    stdout.write(`  ${mark} ${i + 1}) ${ch.label}${ch.hint ? c.dim(` — ${ch.hint}`) : ""}\n`);
  });

  for (;;) {
    const a = (await io().question(c.dim(`  choose 1-${choices.length}: `))).trim();
    if (!a && def) return def;
    const n = Number(a);
    if (Number.isInteger(n) && n >= 1 && n <= choices.length) return choices[n - 1].value;
    stdout.write(`  ${c.red(`Enter a number between 1 and ${choices.length}.`)}\n`);
  }
}

/**
 * Pick any number. Accepts comma/space separated indices, "all", or "none".
 * @param {{message: string, choices: Array<{value: string, label: string, hint?: string}>, default?: string[], min?: number}} opts
 */
export async function multiselect({ message, choices, default: def = [], min = 0 }) {
  if (!isTTY) return def;

  stdout.write(`${c.cyan("?")} ${c.bold(message)}\n`);
  choices.forEach((ch, i) => {
    const mark = def.includes(ch.value) ? c.green("*") : " ";
    stdout.write(`  ${mark} ${i + 1}) ${ch.label}${ch.hint ? c.dim(` — ${ch.hint}`) : ""}\n`);
  });
  stdout.write(c.dim(`  * = selected by default\n`));

  for (;;) {
    const a = (await io().question(c.dim("  numbers, 'all', or 'none' (enter = default): "))).trim();
    if (!a) {
      if (def.length >= min) return def;
      stdout.write(`  ${c.red(`Select at least ${min}.`)}\n`);
      continue;
    }
    if (a.toLowerCase() === "all") return choices.map((ch) => ch.value);
    if (a.toLowerCase() === "none") {
      if (min === 0) return [];
      stdout.write(`  ${c.red(`Select at least ${min}.`)}\n`);
      continue;
    }

    const parts = a.split(/[,\s]+/).filter(Boolean).map(Number);
    if (parts.some((n) => !Number.isInteger(n) || n < 1 || n > choices.length)) {
      stdout.write(`  ${c.red(`Use numbers between 1 and ${choices.length}.`)}\n`);
      continue;
    }
    const picked = [...new Set(parts)].map((n) => choices[n - 1].value);
    if (picked.length < min) {
      stdout.write(`  ${c.red(`Select at least ${min}.`)}\n`);
      continue;
    }
    return picked;
  }
}

export const interactive = isTTY;
