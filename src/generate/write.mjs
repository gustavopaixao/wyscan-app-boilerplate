/**
 * Execute a FileOp[] against the filesystem.
 *
 * Two details are load-bearing:
 *  - modes: tokenized files are written with writeFile, which does NOT carry
 *    the source's exec bit. 21 reference files are 0755 (every Claude hook and
 *    every dev script). Restoring the mode from the manifest is what keeps the
 *    generated project runnable.
 *  - raw: lockfiles are copied byte-for-byte, never substituted.
 */

import { mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";

import { render, residualSentinels } from "../tokens/apply.mjs";
import { transform } from "./transforms.mjs";

export function writeProject(ops, { templatesDir, targetDir, values, dryRun = false, extras = [] }) {
  const written = [];
  const leftovers = [];

  // Generated files that have no template counterpart.
  for (const { dest, content } of extras) {
    const outPath = join(targetDir, dest);
    if (!dryRun) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, content);
    }
    written.push({ dest, bytes: Buffer.byteLength(content), mode: 644 });
  }

  for (const op of ops) {
    const srcPath = join(templatesDir, op.src);
    const outPath = join(targetDir, op.dest);

    let data;
    if (op.raw) {
      data = readFileSync(srcPath);
    } else {
      const text = transform(op.dest, render(readFileSync(srcPath, "utf8"), values), values);
      const left = residualSentinels(text);
      if (left.length) leftovers.push({ dest: op.dest, sentinels: left });
      data = Buffer.from(text, "utf8");
    }

    if (!dryRun) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, data);
      chmodSync(outPath, op.mode === 755 ? 0o755 : 0o644);
    }

    written.push({ dest: op.dest, bytes: data.length, mode: op.mode });
  }

  return { written, leftovers };
}
