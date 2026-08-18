# Mobile navigation & chrome

Applies to all work under `mobile/`. Mirrored in
`.cursor/rules/mobile-navigation-toolbar.mdc` — keep both in sync (see root
`CLAUDE.md`). Read alongside `mobile-safe-area.md`, which owns the inset rules.

Everything here is **app-local**, under `components/navigation/` and
`components/ui/`. Do not reach for a shared design-system package: the one this
project declares is stripped out in `registry` and `standalone` shared-package
modes, so an import of it works on one machine and breaks everywhere else.

## Tab screens

The root tabs live in `app/(app)/(tabs)/_layout.tsx` and share one transparent
header, `AppMainToolbar`.

- Build tab options with **`useTabChromeScreenOptions`** from
  `@/components/navigation/NavigationChrome`. Never the raw
  `tabChromeScreenOptions` — its `bottomInset` defaults to `0` and then
  overrides React Navigation's own inset handling on both platforms.
  `tabChromeCallSites.test.ts` enforces this.
- The header is **transparent**, so tab content must clear it with
  **`useHeaderHeight()`** from `@react-navigation/elements`. Do not add
  `insets.top` to a container that already offsets by `headerHeight` — that
  double-counts the status bar.
- Scrollable tab content pads the bottom with
  **`useBottomTabBarHeight() + gap`**, and **not** `insets.bottom`:
  the tab bar sets its own height to `49 + inset`, so the hook already includes
  it. See `tabBarMetrics.ts`.
- `RefreshControl` needs `progressViewOffset={headerHeight}`, or the spinner
  appears underneath the toolbar.

## Stack screens

Any screen pushed above the tabs — settings, detail views, editors — uses
**`StackScreenToolbar`** from `@/components/navigation/StackScreenToolbar`:
back control, centred title, optional trailing action.

- Use it rather than hand-rolling a row. It already handles the top inset, the
  minimum touch target, and the trailing spacer that keeps the title optically
  centred when there is no action.
- Titles come from `useStrings()` / `t("…")`. No hard-coded copy.
- The back affordance is **`ToolbarBackButton`** from `@/components/ui`, not a
  text link and not a bare chevron.

## Chrome

- `NavigationChromeBackground` is blurred on iOS and flat opaque on Android.
  That is deliberate — `expo-blur` does not composite reliably over scrolling
  content on Android — so do not "unify" it.
- Chrome colours come from `appColors(scheme).chrome` and `chromeBorderColor`.
  Never hard-code a hex value in a component; `test/design.test.mjs` in the
  boilerplate asserts this and the same rule applies here.

## Account menu

Sign-out lives in `AccountMenu`, opened from the toolbar avatar — not on a
settings screen. It is the action users look for beside their own avatar.
