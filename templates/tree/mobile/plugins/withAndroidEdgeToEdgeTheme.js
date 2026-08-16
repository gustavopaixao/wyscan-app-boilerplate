const { withAndroidStyles, AndroidConfig, XML } = require("@expo/config-plugins");

// Google Play recommended action — "Your app uses deprecated APIs or parameters
// for edge-to-edge".
//
// Every call site Google listed lives in third-party bytecode (React Native's
// StatusBarModule / WindowUtilKt, react-native-screens' ScreenWindowTraits,
// Material's BottomSheetDialog / EdgeToEdgeUtils, expo-image-picker's
// ExpoCropImageUtils, AdMob). No app code touches the status or navigation bar.
// What IS ours is the generated theme:
//
//   1. `android:statusBarColor` is written into AppTheme by the expo-splash-screen
//      plugin (#02132B). The attribute is deprecated in API 35 and inert under
//      edge-to-edge, so we strip it.
//   2. `android:windowLightStatusBar` was never set, so the system bar icons were
//      always LIGHT. Every surface in the app renders on `colors(scheme).background`
//      (#f6f6f7 light / #0b0f14 dark), so in light mode white icons sat on a white
//      canvas — a real contrast defect, not just deprecation hygiene.
//
// Dark mode needs its own copy of the theme: Android does not merge `<style>`
// bodies across resource qualifiers, a style redefined in `values-night` REPLACES
// the `values` one. So the night file is cloned from the final day theme with only
// the light-bar booleans flipped, which keeps colorPrimary, editTextBackground and
// enforceNavigationBarContrast intact.
//
// Registered FIRST in app.config.ts so this mod runs LAST (Expo runs mods
// last-registered-first) — otherwise expo-splash-screen re-adds statusBarColor
// after us.
const STATUS_BAR_COLOR_ITEM = "android:statusBarColor";

// windowLightStatusBar is API 23+ and minSdk is 24, so it needs no guard.
// windowLightNavigationBar is API 27+ — tag it so :app:lintVitalRelease stays quiet.
const LIGHT_BAR_ITEMS = [
	{ name: "android:windowLightStatusBar" },
	{ name: "android:windowLightNavigationBar", targetApi: "27" },
];

/**
 * Drops the deprecated status-bar colour and points the system bar icons at the
 * canvas they actually sit on. `light: true` = dark icons for the light canvas.
 */
function applyEdgeToEdgeThemeItems(xml, { light }) {
	const parent = AndroidConfig.Styles.getAppThemeGroup();
	let next = AndroidConfig.Styles.assignStylesValue(xml, {
		add: false,
		value: "",
		name: STATUS_BAR_COLOR_ITEM,
		parent,
	});
	for (const item of LIGHT_BAR_ITEMS) {
		next = AndroidConfig.Styles.assignStylesValue(next, {
			add: true,
			value: light ? "true" : "false",
			name: item.name,
			targetApi: item.targetApi,
			parent,
		});
	}
	return next;
}

/**
 * Builds `values-night/styles.xml` from the finished day theme so dark mode keeps
 * every AppTheme item and only flips the light-bar booleans. Returns null when
 * AppTheme is missing (nothing sensible to clone).
 */
function buildNightStyles(dayXml) {
	const dayTheme = AndroidConfig.Styles.getStyleParent(
		dayXml,
		AndroidConfig.Styles.getAppThemeGroup(),
	);
	if (!dayTheme) {
		return null;
	}
	const nightXml = {
		resources: {
			...(dayXml.resources?.$
				? { $: JSON.parse(JSON.stringify(dayXml.resources.$)) }
				: {}),
			style: [JSON.parse(JSON.stringify(dayTheme))],
		},
	};
	return applyEdgeToEdgeThemeItems(nightXml, { light: false });
}

/** @type {import('@expo/config-plugins').ConfigPlugin} */
function withAndroidEdgeToEdgeTheme(config) {
	return withAndroidStyles(config, async (config) => {
		config.modResults = applyEdgeToEdgeThemeItems(config.modResults, {
			light: true,
		});

		const nightXml = buildNightStyles(config.modResults);
		if (nightXml) {
			const nightPath =
				await AndroidConfig.Styles.getProjectStylesXMLPathAsync(
					config.modRequest.projectRoot,
					{ kind: "values-night" },
				);
			await XML.writeXMLAsync({ path: nightPath, xml: nightXml });
		}

		return config;
	});
}

module.exports = withAndroidEdgeToEdgeTheme;
module.exports.applyEdgeToEdgeThemeItems = applyEdgeToEdgeThemeItems;
module.exports.buildNightStyles = buildNightStyles;
module.exports.STATUS_BAR_COLOR_ITEM = STATUS_BAR_COLOR_ITEM;
