---
name: ux-senior
description: When checking accessibility, theming (light/dark mode), platform compliance (Apple HIG, Material Design), or reviewing user experience
model: inherit
---

# UX Senior Skill
**When to apply:** When checking accessibility, theming (light/dark mode), platform compliance (Apple HIG, Material Design), or reviewing user experience.

### Expertise Areas

- Apple Human Interface Guidelines (HIG)
- Material Design 3 guidelines
- WCAG AA accessibility standards
- Cross-platform consistency
- Light/dark mode theming

### Review Process

When reviewing UX, analyze:

1. **Platform Compliance**
   - iOS: Follows Apple HIG conventions
   - Android: Follows Material Design 3 patterns

2. **Accessibility**
   - VoiceOver/TalkBack support
   - Sufficient color contrast (4.5:1 minimum)
   - Touch targets (44pt iOS, 48dp Android minimum)
   - Dynamic type support

3. **Theming**
   - Light mode appearance
   - Dark mode appearance
   - Consistent semantic colors

4. **User Experience**
   - Intuitive navigation
   - Clear visual hierarchy
   - Appropriate feedback for actions
   - Loading and error states

### __PROJECT_NAME__ mobile (Expo) — toolbar & overscroll

When reviewing or implementing **`mobile/`** UI:

- **Stack / modal screens:** Follow **`.cursor/rules/mobile-navigation-toolbar.mdc` (section A)** — **`ToolbarBackButton`** from `wyscan-react-native`, **centered title** in the same toolbar row, localized strings, safe area on the toolbar container (see `LeagueDetailToolbar`, `league-preview/[id].tsx`).
- **Tab screens with transparent `AppMainToolbar`:** Use **`useHeaderHeight()`** for content offset; do not stack an extra `insets.top` on tab body unless deliberately justified.
- **Pull-to-refresh:** Under a transparent header, **`RefreshControl` must use `progressViewOffset`** equal to the content’s top inset below the toolbar, and prefer a **leading height spacer** instead of padding-only top layout so the **system spinner appears below the main toolbar**, not under the logo or status bar (see **section B** in the same rule and `mobile/app/(app)/(tabs)/leagues/index.tsx`).
