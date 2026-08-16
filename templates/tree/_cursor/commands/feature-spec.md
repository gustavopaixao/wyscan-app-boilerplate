# Feature spec

Start with: **Feature Spec Agent activated...**

Follow the full process in [.cursor/agents/feature-spec.mdc](../agents/feature-spec.mdc) (source of truth). Do not commit or push. Do not create `implementation-plan.md` unless the user asks in their message.

## Input

The user's message after this command is the feature **context**. Optional override:

- `/feature-spec {CONTEXT}`
- `/feature-spec {FEATURE_ID} {SLUG} {CONTEXT}` — e.g. `0035 explore-trending-pools …`

## What to do

1. **Read** `feature-spec.mdc` and execute Phase 1 (research `docs/features/` and `docs/features/archive/`, PRD/MVP, relevant code; propose next `NNNN-<slug>` — max ID across both locations + 1).
2. **Pause** with numbered pending questions if anything is ambiguous; do not write files yet.
3. After answers or "proceed" / "use defaults", run Phase 2 and write `docs/features/NNNN-<slug>/spec.md` only.
4. Report the path and suggest: add `implementation-plan.md`, then `/implement-feature <ID>`.

## Examples

```
/feature-spec Trending public pools on Explore with sport filter; reuse 0030 leaderboard preview patterns
/feature-spec 0035 explore-trending-pools Mobile and API only; max 20 results; no web v1
```
