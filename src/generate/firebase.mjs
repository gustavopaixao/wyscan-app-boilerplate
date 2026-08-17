/**
 * Firebase is opt-in (`--firebase`), and off by default.
 *
 * WHY THIS EXISTS
 *
 * A default project could not build iOS at all. `app.config.ts` already gates the
 * `@react-native-firebase/*` **config plugins** on both google-services files
 * existing, but the build failure comes from somewhere that gating cannot reach:
 * `@react-native-firebase/crashlytics/react-native.config.js` declares an
 * autolinked `scriptPhases` entry, so CocoaPods injects `[RNFB] Crashlytics
 * Configuration` into the app target purely because the package is in
 * node_modules. That phase runs Google's compiled `upload-symbols`, which reads
 * GOOGLE_APP_ID from the bundled GoogleService-Info.plist and exits non-zero when
 * it is absent — with no flag, env var or firebase.json key to soften it.
 *
 * Both google-services files are gitignored and never shipped, so every fresh
 * project hit this. Removing the dependency removes the phase.
 *
 * Nothing is lost by default: no template source imports `@react-native-firebase/*`
 * (there is not even a test mock for it), and `analytics`, `database` and
 * `remote-config` were never registered as plugins at all — they only ever
 * autolinked. The dependencies are inherited from the reference project's own
 * predecessor, which does use Firebase; the reference does not.
 *
 * The `hasFirebaseConfig` block in `app.config.ts` is deliberately left in place,
 * so turning Firebase on later is "add the packages + the two files" with no code
 * edit. See docs/runbooks/integrations/push-notifications-fcm-expo.md in the
 * generated project.
 */

/**
 * Every `@react-native-firebase/*` package the reference ships. `crashlytics` is
 * the one that breaks the build, but the rest are equally unused, and leaving a
 * subset behind would keep paying their pod/AAR compile cost for nothing.
 */
export const FIREBASE_DEPS = [
  "@react-native-firebase/analytics",
  "@react-native-firebase/app",
  "@react-native-firebase/crashlytics",
  "@react-native-firebase/database",
  "@react-native-firebase/messaging",
  "@react-native-firebase/remote-config",
];

/**
 * Drop the Firebase dependencies from mobile/package.json unless opted in.
 * @returns {string} serialized package.json
 */
export function pruneFirebaseDeps(text, cfg) {
  if (cfg.firebase) return text;

  const pkg = JSON.parse(text);
  let removed = 0;
  for (const name of FIREBASE_DEPS) {
    if (pkg.dependencies?.[name] !== undefined) {
      delete pkg.dependencies[name];
      removed += 1;
    }
    // The reference pins nothing here today, but a future pnpm.overrides entry
    // would reinstate the pod through the back door.
    if (pkg.pnpm?.overrides?.[name] !== undefined) delete pkg.pnpm.overrides[name];
  }
  if (removed === 0) return text;

  return `${JSON.stringify(pkg, null, 2)}\n`;
}

const RN_FROM_SOURCE = ', buildReactNativeFromSource: true';
const FIREBASE_FRAMEWORKS_COMMENT =
  "// React Native Firebase needs static frameworks on iOS for FCM token support.";
// Static frameworks stay either way — other Google pods link against them — so the
// comment has to stop crediting a setting that is no longer there.
const PLAIN_FRAMEWORKS_COMMENT =
  "// Static frameworks for the Google pods (AdMob, and Firebase when enabled).";

/**
 * `buildReactNativeFromSource: true` compiles React Native from source on every
 * clean build, which is expensive and exists only to satisfy Firebase. Drop it
 * when Firebase is off; keep `useFrameworks: "static"`, which is not Firebase's
 * alone.
 * @returns {string} app.config.ts source
 */
export function dropReactNativeFromSource(text, cfg) {
  if (cfg.firebase) return text;
  if (!text.includes(RN_FROM_SOURCE)) return text;

  return text
    .replaceAll(RN_FROM_SOURCE, "")
    .replace(FIREBASE_FRAMEWORKS_COMMENT, PLAIN_FRAMEWORKS_COMMENT);
}
