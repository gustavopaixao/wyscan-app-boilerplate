---
name: feature-parity
description: New feature requests, cross-platform work, before release, when asked for parity check or "implement on the other platform"
---

# Feature Parity Skill
**When to apply:** New feature requests, cross-platform work, before release, when asked for parity check or "implement on the other platform".

### OpenAPI (Per Package)

- Every package that serves mobile must have OpenAPI in `contracts/` (e.g. `contracts/openapi.yaml`)
- Mobile clients must align DTOs and endpoints with that spec

### UI/UX

- Both platforms must exhibit the same behavior for the same feature
- Validate with UX Senior (`/ux-review`) and UI Expert (`/ui-review`) when adding or changing features

### New Feature on One Platform Only

- Produce an implementation plan for the missing platform: steps, files, API/OpenAPI alignment, UI screens/components, tests

### Checklist

- [ ] OpenAPI present per package that serves mobile
- [ ] iOS/Android SDK parity per package (where applicable)
- [ ] App-level feature matrix (mobile Expo vs web admin/site when both exist)
- [ ] Behavior match for same feature on both platforms
- [ ] Implementation plan for any gaps
