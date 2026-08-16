# Frontend expert

Start with: **Frontend Expert Agent activated...**

Follow the full process in [.cursor/agents/frontend-expert.mdc](../agents/frontend-expert.mdc) (source of truth). Do not commit or push unless the user explicitly asks.

## Input

The user's message after this command is the **context**. Optional target prefix:

- `/frontend-dev {web-admin|web-site|mobile} [context]`

## What to do

1. **Read** `frontend-expert.mdc` and architecture rules for the target (`web-react-architecture.mdc`, `mobile-react-architecture.mdc`, `requirements.mdc`).
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
