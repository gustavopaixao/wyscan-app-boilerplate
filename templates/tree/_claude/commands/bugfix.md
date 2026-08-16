---
description: Create a bugfix doc under docs/bugsfixes/NNNN-<slug>/bugfix.md from context. Two-phase (diagnose + questions, then write); no commit/push; does not apply the fix unless asked.
argument-hint: [BUG_ID] [SLUG] {CONTEXT}
model: inherit
---

Begin the response with: "🐛 Bugfix Agent activated..."

Use the **bugfix** subagent (it is the source of truth for the full process). Do not commit or push. Do not edit source files to apply the fix unless the user asks in their message.

## Input

The user's message after this command is the bug **context** (symptoms, steps, environment, errors/logs). Optional override:

- `/bugfix {CONTEXT}`
- `/bugfix {BUG_ID} {SLUG} {CONTEXT}` — e.g. `0007 pool-leaderboard-crash …`

Arguments: `$ARGUMENTS`

## What to do

1. **Run Phase 1** (reproduce/trace the issue; research code, prior bugfixes, `.docs/knowledge/`; propose next `NNNN-<slug>`).
2. **Pause** with numbered pending questions if repro, environment, or expected behavior is ambiguous; do not write files yet.
3. After answers or "proceed" / "use defaults", run Phase 2 and write `docs/bugsfixes/NNNN-<slug>/bugfix.md` only.
4. Report the path and suggest: apply the fix (or ask the agent to), then add the regression tests listed in the doc.

## Examples

```
/bugfix Pool leaderboard crashes on mobile when a member has no avatar; iOS prod build 1.0.3
/bugfix 0007 pool-leaderboard-crash API returns 500 from /pools/:id/leaderboard when scores tie; API only
```
