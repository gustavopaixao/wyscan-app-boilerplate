# Firebase & push notifications (FCM)

**Firebase is not installed in this project.** It is opt-in, and a fresh scaffold
leaves it out so the app builds before you have any accounts set up. This guide adds
it when you want push notifications or crash reporting.

Scaffolding a new project? `--firebase` includes it from the start.

## What you have without Firebase

- Everything else. iOS and Android both build and run.
- `expo-notifications` is still installed, so notification permissions and **local**
  notifications work.
- **Not available:** remote push over FCM, Crashlytics crash reporting, Firebase
  Analytics, Remote Config, Realtime Database.

## Why it is opt-in rather than installed-and-idle

`@react-native-firebase/crashlytics` declares an **autolinked** iOS build phase
(`[RNFB] Crashlytics Configuration`). CocoaPods injects it whenever the package is
present in `node_modules`, regardless of app config, and it runs Google's
`upload-symbols` binary, which needs `GOOGLE_APP_ID` from a bundled
`GoogleService-Info.plist`. Without that file the build dies with:

```
error: Could not get GOOGLE_APP_ID in Google Services file from build environment
```

There is no flag, environment variable or `firebase.json` key that makes it tolerate a
missing file — so the package cannot simply sit installed and dormant. Hence: install
it when you are ready to configure it.

## Enabling Firebase

### 1. Install the packages

```bash
cd mobile
pnpm add @react-native-firebase/app @react-native-firebase/messaging @react-native-firebase/crashlytics
```

Add `@react-native-firebase/analytics`, `/database`, `/remote-config` only if you
actually use them — each one compiles native code into every build.

### 2. Create the Firebase apps

In the [Firebase console](https://console.firebase.google.com), create (or pick) a
project, then register **both** platforms — the identifiers must match exactly:

| Platform | Identifier | Download to |
|---|---|---|
| iOS | `__BUNDLE_ID__` | `mobile/GoogleService-Info.plist` |
| Android | `__BUNDLE_ID__` | `mobile/google-services.json` |

**Add both files, even if you only care about one platform.** `app.config.ts` computes
`hasFirebaseConfig` as *both present*, and only then registers the
`@react-native-firebase/*` config plugins. With one file, the plugins stay off and
Firebase silently does nothing.

Both paths are already gitignored — keep them that way; they are per-project
credentials.

### 3. Restore the iOS build setting

Scaffolding without Firebase omits `buildReactNativeFromSource` from
`mobile/app.config.ts`, because it exists only to satisfy the Firebase pods and costs
significant build time otherwise. Put it back:

```ts
ios: { useFrameworks: "static", buildReactNativeFromSource: true },
```

Leave `useFrameworks: "static"` alone, and leave
`./plugins/withIosFirebaseCocoaPods.js` in the plugin list. From v22 on,
`@react-native-firebase/*` pulls firebase-ios-sdk in as a Swift Package, and
those products link statically into every pod that uses them — with static
frameworks the copies collide, so the pod aborts the install:

```
[react-native-firebase] SPM + static linkage is not supported (target(s): Pods-<App>).
```

That plugin sets `$RNFirebaseDisableSPM = true` in the Podfile, which pins
Firebase back to CocoaPods. `expo run:ios` does not stop when `pod install`
fails, so removing it surfaces as `error: The sandbox is not in sync with the
Podfile.lock` and `xcodebuild exited with error code 65` — scroll up in the log
for the real cause.

### 4. Regenerate the native projects

`ios/` and `android/` are build output — config changes only land through a prebuild:

```bash
cd mobile && rm -rf ios android && cd -
make mobile-ios          # or: make mobile-android
```

### 5. Confirm it took

```bash
grep -c "RNFB" mobile/ios/*.xcodeproj/project.pbxproj   # > 0: phases are wired
```

The build log should now show `[RNFB] Core Configuration` and `[RNFB] Crashlytics
Configuration` succeeding instead of failing.

## Common mistakes

**Added the two files but not the packages.** `hasFirebaseConfig` flips to true and
`app.config.ts` tries to register plugins that are not installed, so `expo prebuild`
fails on plugin resolution. Install the packages too.

**Only one of the two files.** Silently no Firebase — see step 2.

**Changed config but did not re-prebuild.** `expo run:ios` reuses an existing `ios/`.
Delete it.

**Google Sign-In works in development but not from a store install.** Unrelated to
Firebase: Play re-signs your upload, so the Play App signing SHA-1 also needs to be on
the Android OAuth client. See `make mobile-android-preflight` and
`docs/runbooks/release-deploy-checklist.md`.

## Sending a push

Once messaging is installed and configured, the device registers with FCM and you send
from your backend with the Firebase Admin SDK (or Expo's push service). The API side of
that is not scaffolded here — `api/` owns token storage and delivery.
