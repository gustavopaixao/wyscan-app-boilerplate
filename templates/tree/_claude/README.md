# Claude Code assets

This directory mirrors the project's `.cursor/` setup so the same capabilities are
available when working through **Claude Code**. These are **standalone copies** of the
`.cursor/` sources — if you edit a Cursor agent/rule, mirror the change here (or vice-versa).

## Mapping

| Cursor source | Claude Code | How it's used |
|---|---|---|
| `.cursor/agents/*.mdc` | `.claude/agents/*.md` | **Subagents** — auto-dispatched by their `description`, or invoked explicitly (`/agents`, or "use the X subagent"). |
| Registry commands | `.claude/commands/*.md` | **Slash commands** — type `/<name>` (args go to `$ARGUMENTS`). Most delegate to the matching subagent. |
| `.cursor/rules/skills.mdc` sections | `.claude/skills/<name>/SKILL.md` | **Skills** — model-invoked on demand based on each skill's `description`. |
| Glob-scoped `.cursor/rules/*.mdc` | nested `CLAUDE.md` (`api/`, `mobile/`, `web/*`) | Auto-loaded when working in that subtree — the analog of Cursor `globs`. |
| `alwaysApply:true` rules | `.claude/rules/*.md` + `@import` in root `CLAUDE.md` | Always loaded every session. |

**Exception —** `.claude/rules/mobile-safe-area.md` (mirror of `.cursor/rules/mobile-safe-area.mdc`)
is **not** in the root `@import` list: it is mobile-only, so loading it into API/web sessions
would be noise. It reaches Claude via `mobile/CLAUDE.md` §C, which carries the rule and links to
the full text — the nested-`CLAUDE.md` route in row 4 above. Added by bugfix 0027.

## Commands

`/code-review` · `/security-scan` · `/ux-review` · `/architect-review` · `/ui-review` ·
`/frontend-dev` · `/test-agent` · `/loadtest` · `/deploy-check` · `/translator` ·
`/android-docs` · `/feature-parity` · `/feature-spec` · `/bugfix` · `/implement-feature` · `/ship-it` ·
`/packages-pipeline` · `/explorer`

Example: `/code-review api`, `/security-scan all secrets`, `/frontend-dev mobile leagues stats panel`, `/ship-it plan only`.

## Skills

`builder` · `git` · `architect` · `ux-senior` · `security` · `testing` · `deployment` ·
`ci-cd` · `translator` · `ui-expert` · `frontend-expert` · `android-docs` ·
`feature-parity` · `release-manager-tech-writer` · `load-test` · `explorer`

(`code-review` is intentionally **not** a skill — it would shadow Claude Code's built-in
`code-review` skill; the `code-review` agent/command covers it here.)

## Hooks (`.claude/settings.json` + `.claude/hooks/`)

Cursor's autonomous auto-invocation (`.cursor/autonomous/`) is ported as Claude Code hooks:

| Hook | Event / matcher | Script | Behavior |
|---|---|---|---|
| Edit validation | `PostToolUse` · `Edit\|Write\|MultiEdit` | `validate-edit.sh` | Single-file Biome lint of the touched file in `api/` or `web/*`; **exit 2 feeds issues back to Claude** to fix (mobile deferred to the commit gate). |
| Commit gate | `PreToolUse` · `Bash` | `pre-commit-gate.sh` | On `git commit`, runs lint/type-check/tests for the **staged** areas (api: lint+test; site: lint+type-check; admin: lint+type-check+test; mobile: tsc). **Blocks the commit (exit 2)** on failure. Bypass with `git commit --no-verify`. |
| Prompt nudges | `UserPromptSubmit` | `prompt-nudge.sh` | Keyword match injects optional reminders toward `/security-scan`, `/architect-review`, `/ux-review`, `/translator`, `/loadtest`, `/feature-parity`. |
| New-UI suggestion | `PostToolUse` · `Write` | `suggest-ux-review.sh` | When a UI `.tsx` is written, suggests `/ux-review` + `/ui-review` (non-blocking). |

Manage/disable them from the `/hooks` menu. Scripts read tool JSON from stdin via `jq`.

## Notes & differences from Cursor

- **Name overlaps:** `/code-review` and similar names overlap Claude Code built-ins. Project
  commands coexist and are invoked explicitly by name.
- **Tool mapping:** Cursor tools map to Claude tools as `read_file→Read`, `grep→Grep`,
  `codebase_search→Grep`/`Glob`, `list_dir→Glob`, `read_lints→Bash`, `run_terminal_cmd→Bash`,
  `mcp_web_fetch→WebFetch`. Review agents are read-only; implementation agents add `Edit`/`Write`.
