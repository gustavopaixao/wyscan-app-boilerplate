# Mobile release & deploy checklist

How to ship __PROJECT_NAME__ (`__BUNDLE_ID__`) to TestFlight and Google Play.

Releases run from a developer machine, not CI — signing needs Xcode and the real
keystore. Fastlane **uploads binaries only**; store listing copy, screenshots and
submitting for review stay manual in App Store Connect / Play Console.

## Recurring release (once set up)

```bash
make mobile-release-check        # credentials + env, no build
make mobile-beta                 # bump build, ship iOS + Android betas
```

`mobile-beta` bumps `buildNumber` in `mobile/package.json`, commits it, then ships
both platforms **at that same build number**, sequentially. Sequential matters:
both platforms prebuild into the shared `mobile/ios` + `mobile/android` directories,
so a parallel run corrupts the native projects.

One platform only, or retrying a half-shipped release:

```bash
make mobile-beta-select PLATFORMS="ios"
SKIP_BUILD_BUMP=1 make mobile-android-beta   # ship the other at the SAME build
```

| Variable | Effect |
|---|---|
| `SKIP_BUILD_BUMP=1` | Reuse the current `buildNumber` instead of bumping |
| `SKIP_BUILD_COMMIT=1` | Bump but don't commit |
| `BUILD_NUMBER=N` | Set an explicit build instead of bumping |
| `PLATFORMS="ios android"` | Which platforms `mobile-beta-select` ships |

Production:

```bash
make mobile-ios-release       # -> App Store Connect, not submitted for review
make mobile-android-release   # -> Play production track, as a draft
```

Both stop short of publishing on purpose. Finish in the consoles.

## All targets

| Target | What it does |
|---|---|
| `mobile-release-check` | Report missing credentials / env without building |
| `mobile-android-preflight` | Android toolchain, keystore, Play key, OAuth SHA-1 |
| `mobile-prebuild` | Regenerate `mobile/ios` + `mobile/android` only |
| `mobile-set-build BUILD=42` | Set `buildNumber` explicitly |
| `mobile-verify-build-sync` | Check native build numbers match `package.json` |
| `mobile-beta` / `mobile-beta-select` | Ship betas (bumps build) |
| `mobile-ios-beta` / `mobile-android-beta` | One platform, no bump |
| `mobile-ios-upload-beta` / `mobile-android-upload-beta` | Re-upload the existing binary, no rebuild |
| `mobile-ios-release` / `mobile-android-release` | Production upload |

## First-time setup

### 1. Toolchain

- **Xcode** + command line tools, and an Apple Developer Program membership.
- **JDK 17+** and the Android SDK (Android Studio is the easy path).
- **Ruby 3.3.x** matching `mobile/.ruby-version` — `rbenv` recommended, because
  `scripts/prebuild-release.sh` pins the Ruby that runs `pod install`.
- **CocoaPods** (`brew install cocoapods`).

```bash
cd mobile && bundle install
```

No `Gemfile.lock` is committed: a lock resolved on one machine pins platform-specific
gems and breaks `bundle install` elsewhere. `Gemfile` pins fastlane to `~> 2.227`.

### 2. Credentials

```bash
cp mobile/fastlane/.env.example mobile/fastlane/.env
```

Fill it in. `mobile/fastlane/.env` and every credential file below are gitignored —
keep them that way.

**Apple.** Team ID from [developer.apple.com](https://developer.apple.com/account) →
Membership. Then App Store Connect → Users and Access → Integrations → App Store
Connect API → generate a key. The `.p8` downloads **once**; save it as
`mobile/fastlane/AuthKey_<KEY_ID>.p8` and set `APP_STORE_CONNECT_API_KEY_ID`,
`APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_PATH`.

There is no `match` and no committed provisioning profile — Xcode manages signing
automatically from `APPLE_TEAM_ID`.

**Android upload keystore.** Create once:

```bash
keytool -genkey -v -keystore mobile/fastlane/__PROJECT_SLUG__-upload.keystore \
  -alias __PROJECT_SLUG__ -keyalg RSA -keysize 2048 -validity 10000
```

**Back this file up somewhere durable.** With Play App Signing enabled it is only
your *upload* key (recoverable via Google support), but losing it still blocks
releases until that is sorted.

**Play service account.** Play Console → Setup → API access → link a Cloud project →
create a service account → grant it release permissions → download the JSON to
`mobile/fastlane/play-store-key.json` and set `SUPPLY_JSON_KEY_PATH`.

### 3. Register the app in each store

`make mobile-android-preflight` verifies the local half and prints the Play Console
checklist plus the SHA-1 fingerprints Google Sign-In needs.

- **App Store Connect** — create the app with bundle id `__BUNDLE_ID__`.
- **Play Console** — create the app with package `__BUNDLE_ID__`, enable Play App
  Signing, complete content rating / data safety / privacy policy.
- **Google Sign-In** — register the debug **and** upload SHA-1 on the Android OAuth
  client (`mobile/scripts/android-google-oauth-sha1.sh`). After the first Play
  install also add Play's own App signing SHA-1, or sign-in works locally and fails
  from the store.

### 4. Prove the native build before trusting automation

```bash
make mobile-prebuild
open mobile/ios/*.xcworkspace   # Product -> Archive once, by hand
```

A first archive from Xcode surfaces signing and capability problems with far better
errors than `xcodebuild` inside a lane.

### 5. First beta

```bash
make mobile-release-check
make mobile-android-preflight
make mobile-beta
```

## How versioning works

`mobile/package.json` is the single source of truth: `version` (marketing, `x.y.z`)
and `buildNumber` (store build, integer).

Everything else is derived. `prebuild-release.sh` exports `APP_VERSION` /
`APP_BUILD_NUMBER` / `APP_VERSION_CODE` for `app.config.ts`;
`sync-ios-build-number.mjs` fixes `CURRENT_PROJECT_VERSION` in the pbxproj (Expo sets
`CFBundleVersion` but leaves it at `1`, which App Store Connect rejects); the Fastfile
patches Android `versionCode`; and `verify-build-number-sync.mjs` fails the build if
any of them disagree.

Bump the marketing `version` by hand in `mobile/package.json` when you want a new
user-visible version. Build numbers are automatic.

## Guards worth knowing

Every store path funnels through `scripts/prebuild-release.sh`, which runs:

- **`verify-build-number-sync.mjs`** — native build numbers match `package.json`.
- **`verify-release-env.mjs`** — refuses to build if a dev-only affordance is set.
  Everything in `fastlane/.env` reaches the environment, and Metro inlines every
  `EXPO_PUBLIC_*` var into the JS bundle. So a stray line in that file ships inside
  your app; this guard is what stops it.

`EXPO_PUBLIC_API_URL` must be HTTPS — enforced in the Fastfile and again in the
prebuild script.

## Troubleshooting

**`Expected .../ios/<Name>.xcworkspace`** — the Fastfile derives the Xcode project
name from the app's display name exactly the way `expo prebuild` does (strip every
non-alphanumeric character). The error lists what was actually generated. Make
`app.config.ts`'s `name` and the expected name agree.

**TestFlight upload "failed" but the build appears anyway** — Apple's delivery
service returns HTTP 500 while polling upload state *after* a successful transfer.
The lane retries transient 500s and treats a duplicate `CFBundleVersion` as success.
If altool logged `UPLOAD SUCCEEDED`, check TestFlight before re-uploading.

**Broken xcframeworks / missing `Info.plist` during archive** — `pod install` ran
under the wrong Ruby. `prebuild-release.sh` pins it to `mobile/.ruby-version`; make
sure that Ruby is installed.

**Google Sign-In works locally, fails from a store install** — Play re-signs your
upload. Add the Play App signing SHA-1 to the Android OAuth client.
