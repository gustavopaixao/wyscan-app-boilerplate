const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

// Google Play recommended action — "Remove resizability and orientation
// restrictions in your app to support large screen devices".
//
// The app targets SDK 36 (inherited from React Native 0.81's version catalog),
// so Android 16 ALREADY ignores `android:screenOrientation="portrait"` on
// displays of at least sw600dp — tablets, the inner display of foldables and
// desktop windowing. The app rotates there today into layouts that were never
// designed or tested for landscape.
//
// This property opts back out of that behaviour so the portrait lock keeps
// working while the adaptive-layout work is scheduled separately.
//
// ⚠️ DATED STOPGAP. The opt-out is honoured only through targetSdk 36. For apps
// targeting SDK 37 the restrictions are always ignored on sw600dp+ displays and
// this property becomes inert. Real landscape / large-screen support must land
// before the app moves to targetSdk 37.
//
// Docs: https://developer.android.com/about/versions/16/behavior-changes-16
const PROPERTY_NAME =
	"android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY";

/**
 * Adds (or refreshes) the opt-out `<property>` on the `<application>` node.
 * Idempotent — re-running never duplicates the entry.
 */
function addRestrictedResizabilityOptOut(application) {
	if (!Array.isArray(application.property)) {
		application.property = [];
	}
	const existing = application.property.find(
		(item) => item?.$?.["android:name"] === PROPERTY_NAME,
	);
	if (existing) {
		existing.$["android:value"] = "true";
		return application;
	}
	application.property.push({
		$: { "android:name": PROPERTY_NAME, "android:value": "true" },
	});
	return application;
}

/** @type {import('@expo/config-plugins').ConfigPlugin} */
function withAndroidLargeScreenOptOut(config) {
	return withAndroidManifest(config, (config) => {
		const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
			config.modResults,
		);
		addRestrictedResizabilityOptOut(application);
		return config;
	});
}

module.exports = withAndroidLargeScreenOptOut;
module.exports.addRestrictedResizabilityOptOut = addRestrictedResizabilityOptOut;
module.exports.PROPERTY_NAME = PROPERTY_NAME;
