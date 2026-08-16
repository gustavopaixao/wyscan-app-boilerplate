# __PROJECT_SLUG__-mobile

__PROJECT_NAME__ mobile app (Expo / React Native, expo-router). Scaffolded by feature 0001.

- `pnpm start` — Metro dev server (see root `make mobile-dev`)
- `pnpm ios` / `pnpm android` — native debug builds
- `pnpm typecheck` / `pnpm test` / `pnpm check:locales`

## Environment (`.env`)

Create `mobile/.env` (git-ignored) with:

```env
EXPO_PUBLIC_API_URL=http://__DEV_HOST__:8080
EXPO_PUBLIC_SITE_URL=http://__DEV_HOST__:3500
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_ADMOB_IOS_APP_ID=
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=
```

AdMob ids default to Google's public test app ids when unset. Firebase native
config (`google-services.json` / `GoogleService-Info.plist`) is optional — the
config plugin only references the files when they exist.

## Standing rules

- Edge-to-edge safe area: bottom-anchored UI derives padding from
  `useSafeAreaInsets().bottom` (see `.claude/rules/mobile-safe-area.md`).
- Icons via `@expo/vector-icons`; colors via `lib/theme` semantic tokens.
- All copy behind `locales/*.json` keys (8 locales), checked by
  `scripts/check-locales.mjs`.
