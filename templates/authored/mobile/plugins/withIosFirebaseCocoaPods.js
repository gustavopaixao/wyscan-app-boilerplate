const {
  withPodfile,
} = require("@expo/config-plugins");
const {
  mergeContents,
  removeContents,
} = require("@expo/config-plugins/build/utils/generateCode");

/**
 * Force `@react-native-firebase/*` to resolve firebase-ios-sdk through
 * CocoaPods instead of Swift Package Manager.
 *
 * WHY THIS EXISTS
 *
 * react-native-firebase >= 22 declares firebase-ios-sdk as a Swift Package.
 * Those products are plain `.library(...)` (automatic linkage), so every RNFB
 * pod embeds its own copy — and this app builds with
 * `useFrameworks: "static"` (react-native-google-mobile-ads needs it), which
 * collides those copies as duplicate symbols. RNFB refuses to install rather
 * than emit a link error:
 *
 *   [react-native-firebase] SPM + static linkage is not supported
 *
 * `pod install` then exits 1, but `expo run:ios` carries on to xcodebuild,
 * which fails much later with the far less obvious
 * "The sandbox is not in sync with the Podfile.lock" (error 65).
 *
 * The flag has to be set before any `target` block, so it cannot live in a
 * `post_install` hook — hence a Podfile merge rather than a build-setting mod.
 *
 * This runs whether or not Firebase is enabled: the RNFB pods are autolinked
 * from `node_modules`, and packages can arrive there as transitive peer
 * dependencies (pnpm auto-installs peers) long before anyone adds
 * GoogleService-Info.plist. Setting the global is a no-op when no RNFB pod is
 * installed.
 */
const PODFILE_TAG = "__PROJECT_SLUG__-ios-firebase-cocoapods";

const NEW_SRC = "$RNFirebaseDisableSPM = true";

function addPodfileFirebaseCocoaPods(src) {
  if (/^\s*\$RNFirebaseDisableSPM\s*=/m.test(src)) {
    return { contents: src, didMerge: false, didClear: false };
  }
  return mergeContents({
    tag: PODFILE_TAG,
    src,
    newSrc: NEW_SRC,
    // Anchored on the last statement Expo's Podfile template emits before the
    // app target, so the global is assigned before any `target ... do` block —
    // which is what RNFB's podspec checks.
    anchor: /^prepare_react_native_project!/m,
    offset: 0,
    comment: "#",
  });
}

function removePodfileFirebaseCocoaPods(src) {
  return removeContents({ tag: PODFILE_TAG, src });
}

/** @type {import('@expo/config-plugins').ConfigPlugin} */
function withIosFirebaseCocoaPods(config) {
  return withPodfile(config, (config) => {
    const result = addPodfileFirebaseCocoaPods(config.modResults.contents);
    if (result.didMerge || result.didClear) {
      config.modResults.contents = result.contents;
    }
    return config;
  });
}

module.exports = withIosFirebaseCocoaPods;
module.exports.addPodfileFirebaseCocoaPods = addPodfileFirebaseCocoaPods;
module.exports.removePodfileFirebaseCocoaPods = removePodfileFirebaseCocoaPods;
