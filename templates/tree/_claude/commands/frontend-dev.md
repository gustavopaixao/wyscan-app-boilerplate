---
description: Implement React/Next.js (web) or React Native/Expo (mobile) UI — feature-first, reuse components, follow architecture rules; stops on conflicts.
argument-hint: [web-admin|web-site|mobile] [context]
---

Begin the response with: "🎨 Frontend Expert Agent activated..."

Use the **frontend-expert** subagent (it is the source of truth for the full process). Do not commit or push unless the user explicitly asks.

## Input

The user's message after this command is the **context**. Optional target prefix:

- `/frontend-dev {web-admin|web-site|mobile} [context]`

Arguments: `$ARGUMENTS`

## What to do

1. **Read** the architecture guidance for the target (`web/*/CLAUDE.md`, `mobile/CLAUDE.md`, and the always-on requirements).
2. **Search** existing components in the feature area before creating new files.
3. **Stop** with the conflict template if multiple valid approaches exist; wait for the user's choice.
4. **Implement** thin UI with hooks, i18n, and theming per project rules.
5. **Validate** — admin: lint + type-check + test; site: lint + type-check; mobile: `tsc --noEmit`.
6. Report reused vs created files and suggest `/ux-review` or `/ui-review` when appropriate.

## Examples

```
/frontend-dev mobile leagues dashboard stats panel
/frontend-dev web-admin games add scoring status badge
/frontend-dev web-site landing update hero section
```
