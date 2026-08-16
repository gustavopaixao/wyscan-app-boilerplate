---
description: Business/product explorer — expand an idea into options, edge cases, business & marketing impact, and positioning ("how to sell it"). Writes an exploration doc under docs/explorations/. No spec, no code, no commit.
argument-hint: [SLUG] {IDEA_OR_CONTEXT}
model: inherit
---

Begin the response with: "🧭 Business Explorer activated..."

Use the **explorer** subagent (it is the source of truth for the full process). This is a *thinking* agent: it explores possibilities and evaluates business/marketing impact — it does **not** write feature specs or code, and it does **not** commit or push. When a direction is worth building, hand off to `/feature-spec`.

## Input

The user's message after this command is the **idea or context** to explore. Optional override:

- `/explorer {IDEA_OR_CONTEXT}`
- `/explorer {SLUG} {IDEA_OR_CONTEXT}` — e.g. `weekly-recap A shareable "pool wrapped" summary`

Arguments: `$ARGUMENTS`

## What to do

1. **Ground** in __PROJECT_NAME__: skim PRD/MVP (`docs/definitions/`), overlapping specs (`docs/features/*` and `docs/features/archive/*`), prior explorations, and the surfaces the idea touches.
2. **Diverge:** generate 3–5 distinct options/variants (include at least one thin/cheap and one ambitious).
3. **Stress-test:** edge cases & failure modes; **evaluate** business impact and marketing/positioning ("how to sell it"); **score** options (ICE/RICE).
4. **Converge:** recommend one direction, name the riskiest assumption, and the cheapest way to test it.
5. **Write** `docs/explorations/NNNN-<slug>/exploration.md` (auto-assign the next ID) and report the TL;DR.

Prefer stating assumptions inline over pausing; ask at most 2–3 questions only when a wrong assumption would waste the whole exploration.

## Examples

```
/explorer Add prediction streaks to boost daily retention
/explorer We keep losing users after their first pool ends — what could keep them coming back?
/explorer entry-fees Let organizers charge an entry fee for pools — explore upside vs integrity/store risk
```
