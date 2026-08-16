# Mobile safe area (edge-to-edge)

Applies to all work under `mobile/`. Mirrored in `.cursor/rules/mobile-safe-area.mdc` —
keep both copies in sync (see root `CLAUDE.md`). Origin: bugfix 0027.

Android runs **edge-to-edge** (`mobile/app.config.ts` → `edgeToEdgeEnabled: true`,
targetSdk 36): the app draws behind the system status **and** navigation bars.
iOS masks this class of bug — a screen that looks correct in the simulator can be
clipped by the Android nav bar.

## Rules

- **Any bottom-anchored UI** — tab bars, sticky footers, bottom sheets, modals,
  the last rows of a scroll view — must derive its bottom padding from
  `useSafeAreaInsets().bottom`.
- **Never hardcode** bottom padding on such a view (a bare `paddingBottom: 24` is
  the smell). Top insets keep following the existing `useHeaderHeight()` /
  `useSafeAreaInsets().top` rules in `mobile-navigation-toolbar`.
- **Tab bars:** every `(tabs)/_layout.tsx` — root **and** nested — must build its
  options with **`useTabChromeScreenOptions`** from
  `@/components/navigation/NavigationChrome`, never the raw
  `tabChromeScreenOptions`, whose `bottomInset` defaults to `0` and then overrides
  React Navigation's own inset on **both** platforms. Bugfix 0029: 0027 migrated
  only the root layout and silently clipped the tab labels on the five nested
  ones. `components/navigation/tabChromeCallSites.test.ts` enforces this.
- **Tab content is the exception:** bottom padding is
  `useBottomTabBarHeight() + gap`, **without** `insets.bottom`.
  `useBottomTabBarHeight()` already includes the inset, so adding it again
  double-counts the nav bar.
- **Apply the inset exactly once.** Never stack `insets.bottom` on top of an inset
  a parent or React Navigation already applied — that shows up as a dead gap on
  iOS. Note that a custom `tabBarStyle` is merged **last** and silently overrides
  React Navigation's own inset handling, so a bar with a custom style must
  reserve the inset itself.
- **Auth screens:** use `AuthScreen` from `@/components/auth/AuthScreen`, not
  `AuthScreenContainer` from `wyscan-react-native` directly — the design-system
  container hardcodes its padding and drops the bottom inset.
- The root `SafeAreaProvider` in `mobile/app/_layout.tsx` must stay. Without it,
  navigators fall back to React Navigation's `SafeAreaProviderCompat`, which seeds
  insets from an `initialWindowMetrics` snapshot that reports `bottom: 0` on
  Android under edge-to-edge.
- Every new bottom-anchored surface needs a unit test asserting a mocked
  **non-zero** `insets.bottom` reaches its style, plus a **zero-inset** case so
  devices without a nav bar gain no extra gap (mirror
  `components/navigation/NavigationChrome.test.ts`).

## How to check a diff

Grep the diff for `paddingBottom:` on bottom-anchored views: each must reference
`insets.bottom` — **or** be a `useBottomTabBarHeight()`-based tab-content value,
which must *not*. Anything else is a bug.

## Reference

- `.docs/knowledge/error-android-bottom-safe-area.md` — post-mortem
- `docs/bugsfixes/0027-android-system-nav-bar-overlaps-bottom-ui/bugfix.md` — full analysis
- `mobile/CLAUDE.md` §C — the same rule in the mobile architecture guide
