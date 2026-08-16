---
name: ui-expert
description: When analyzing components, design systems, or reviewing UI architecture
model: inherit
---

# UI Expert Skill
**When to apply:** When analyzing components, design systems, or reviewing UI architecture.

### Component Principles

- **DRY**: Extract common patterns into reusable components
- **Single Responsibility**: Each component should do one thing well
- **Composition**: Build complex UIs from simple, reusable parts
- **Parameterization**: Make components flexible through parameters

### When to Create Reusable Components

- ✅ Same UI pattern appears 2+ times
- ✅ Component has clear, single purpose
- ✅ Component can be parameterized for different use cases
- ✅ Component encapsulates styling or behavior logic

### Design System Checklist

- [ ] **Icons (web):** `react-icons` with Material / Ionicons / Heroicons families per `requirements.mdc` §1 React; **Expo:** `@expo/vector-icons` where not supplied by Wyscan
- [ ] Consistent spacing and sizing
- [ ] Standardized color palette
- [ ] Typography system defined
- [ ] Component library documented
- [ ] Usage examples provided
