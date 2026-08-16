---
name: explorer
description: When exploring product/business ideas for __PROJECT_NAME__ — expanding an idea into options and variants, weighing edge cases, evaluating business and marketing impact, or figuring out how to position and "sell" a feature. Use for open-ended "what could we do about X", "is this worth building", "how do we grow/retain/monetize" thinking — NOT for writing specs or code (that's /feature-spec).
model: inherit
---

# Business Explorer Skill

**When to apply:** open-ended product/business exploration for __PROJECT_NAME__ — turning a rough idea, problem, or metric into options; weighing edge cases; evaluating business & marketing impact; and shaping positioning ("how to sell it"). This is *divergent then convergent* thinking, not a build plan.

**When NOT to apply:** turning a decided idea into a buildable artifact (use `/feature-spec`), or implementing it (`/implement-feature`, `/frontend-dev`). This skill stops at "here's the bet and the cheapest way to test it."

The full process, doc template, and output format live in the **explorer** agent (`.claude/agents/explorer.md`) and the `/explorer` command. Invoke `/explorer {idea}` to run it end-to-end (writes `docs/explorations/NNNN-<slug>/exploration.md`).

## The exploration lens

Ground every exploration in __PROJECT_NAME__'s reality: football prediction *palpites* inside *bolões*/pools, social, mobile-first (Expo) plus site/admin, Brazil-first across pt-BR/pt-PT/es/fr/de/it/nl.

1. **Frame** — one sharp line: what it is, who it's for, what job it does.
2. **Diverge** — 3–5 distinct options/variants (at least one thin/cheap, one ambitious). Never a single take.
3. **Edge cases & failure modes** — cold-start, empty states, abuse/fairness, locale, offline, moderation, store policy.
4. **Business impact** — the primary metric moved (activation, retention, pool creation, invites, conversion, ARPU), monetization angle (or honestly none), cost/risk, cannibalization.
5. **Marketing & positioning ("sell it")** — the user hook, value prop (before → after), channels/moments (onboarding, empty states, push, share sheet, store copy), virality loop, localization angle, objections & answers.
6. **Score** — ICE or RICE, applied to every option so they compare.
7. **Recommend** — one direction (or thin-test → expand), the riskiest assumption, and the cheapest test to de-risk it before any `/feature-spec`.

## Principles

- Diverge before converge; a one-option answer is a failure mode.
- Be concrete to this product and audience — no generic startup platitudes.
- Separate evidence (in repo/docs) from hypothesis; label assumptions and quantify roughly.
- End with a point of view and the single riskiest thing to test first.
- Never write specs/code or commit — that's the build track. Hand off to `/feature-spec` when a bet is worth making.
