/**
 * Regenerate the workspace dispatch blocks inside the Claude hooks.
 *
 * The reference hooks hardcode a workspace list that is both wrong and
 * unprunable: `pre-commit-gate.sh` gates api, web-site, web-admin and mobile
 * but silently omits `web/<slug>-app`, so the main web app is committed
 * ungated. Generating these blocks fixes the omission and keeps the hooks
 * consistent with whichever workspaces actually exist.
 */

/** Per-workspace gate commands, mirroring the reference's intent. */
const GATES = {
  api: { label: "api", dir: "api", cmds: ['"pnpm lint"', '"pnpm test"'] },
  "web:site": { label: "web-site", cmds: ['"pnpm lint"', '"pnpm type-check"'] },
  "web:app": { label: "web-app", cmds: ['"pnpm lint"', '"pnpm type-check"', '"pnpm test"'] },
  "web:admin": { label: "web-admin", cmds: ['"pnpm lint"', '"pnpm type-check"', '"pnpm test"'] },
  mobile: { label: "mobile", dir: "mobile", cmds: ['"pnpm exec tsc --noEmit"'] },
};

function dirFor(ws, cfg) {
  const g = GATES[ws];
  if (g.dir) return g.dir;
  return `web/${cfg.slug}-${ws.split(":")[1]}`;
}

/** Replace the contiguous run of dispatch lines with a generated one. */
function replaceBlock(text, matcher, generated) {
  const lines = text.split("\n");
  const first = lines.findIndex(matcher);
  if (first === -1) return text;
  let last = first;
  while (last + 1 < lines.length && matcher(lines[last + 1])) last++;
  return [...lines.slice(0, first), ...generated, ...lines.slice(last + 1)].join("\n");
}

export function rewritePreCommitGate(text, cfg) {
  const rows = cfg.workspaces
    .filter((w) => GATES[w])
    .map((w) => {
      const dir = dirFor(w, cfg);
      const { label, cmds } = GATES[w];
      return `printf '%s\\n' "$staged" | grep -q '^${dir}/' && run "${label}" "$root/${dir}" ${cmds.join(" ")}`;
    });

  return replaceBlock(
    text,
    (l) => l.startsWith("printf '%s\\n' \"$staged\" | grep -q"),
    rows,
  );
}

export function rewriteValidateEdit(text, cfg) {
  const rows = cfg.workspaces
    .filter((w) => GATES[w] && w !== "mobile")
    .map((w) => {
      const dir = dirFor(w, cfg);
      return `  ${dir}/*) pkg="$root/${dir}" ;;`;
    });

  return replaceBlock(text, (l) => /^\s+\S+\/\*\)\s+pkg=/.test(l), rows);
}
