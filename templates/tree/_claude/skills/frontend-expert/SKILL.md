---
name: frontend-expert
description: Creating or modifying UI in `web/__PROJECT_SLUG__-admin/**`, `web/__PROJECT_SLUG__-site/**`, or `mobile/**`; user mentions React, React Native, Expo, Next.js, screen, component, or hook; building or extending frontend features
---

# Frontend Expert Skill
**When to apply:** Creating or modifying UI in `web/__PROJECT_SLUG__-admin/**`, `web/__PROJECT_SLUG__-site/**`, or `mobile/**`; user mentions React, React Native, Expo, Next.js, screen, component, or hook; building or extending frontend features.

**Purpose:** Implement React (Next.js) and React Native (Expo) UI with feature-first layout, component reuse, and architecture compliance. **Implements** UI — does not replace `/ui-review` or `/ux-review`.

### Architecture references (read before coding)

| Target | Rule |
|--------|------|
| Web admin / site | `.cursor/rules/web-react-architecture.mdc` |
| Mobile (Expo) | `.cursor/rules/mobile-react-architecture.mdc`, `.cursor/rules/mobile-navigation-toolbar.mdc` |
| Cross-cutting | `.cursor/rules/requirements.mdc` |

### Principles

- **Feature-first:** colocate by feature; shared folders only when 2+ features need the same piece
- **Reuse before create:** search `components/` and feature folders before adding files
- **Layer boundaries (web):** presentation → hooks → domain types → infrastructure/API edge
- **Web:** arrow-function components; Server Components default; `"use client"` only where needed; PascalCase component folders + colocated `__tests__/` (admin)
- **Mobile:** thin Expo Router routes; UI in `mobile/components/{feature}/`; `wyscan-react-native` for chrome; toolbar/refresh per mobile-navigation-toolbar
- **i18n, theming, icons:** per `requirements.mdc` — no hard-coded user-facing strings

### Conflict gate (mandatory)

When two or more valid approaches conflict with each other or existing patterns, **stop and ask the user**:

```markdown
## Implementation conflict — need your choice

**Context:** [feature / file area]

**Option A:** [approach + tradeoffs + files affected]
**Option B:** [approach + tradeoffs + files affected]
**Recommendation:** [which fits existing architecture better and why]

Which option should I implement?
```

Do not pick silently (e.g. route vs component folder, server vs client boundary, shared vs feature hook).

### Validation after changes

| Package | Commands |
|---------|----------|
| `web/__PROJECT_SLUG__-admin` | `pnpm lint`, `pnpm type-check`, `pnpm test` |
| `web/__PROJECT_SLUG__-site` | `pnpm lint`, `pnpm type-check` |
| `mobile` | `pnpm exec tsc --noEmit` |

### Agent invocation

For dedicated frontend implementation: `/frontend-dev {web-admin|web-site|mobile} [context]` — see `.cursor/agents/frontend-expert.mdc`.
