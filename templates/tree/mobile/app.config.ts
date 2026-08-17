import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExpoConfig } from "expo/config";

import { getDevHostFromEnv } from "./config/devHostConfig.js";
import { googleUrlSchemesFromClientIds } from "./config/googleOAuthConfig.js";

const pkg = JSON.parse(
	readFileSync(join(__dirname, "package.json"), "utf8"),
) as { version?: string; buildNumber?: number };

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://__DEV_HOST__:8080";
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const googleAndroidClientId =
	process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
const googleUrlSchemes = googleUrlSchemesFromClientIds(
	googleIosClientId,
	googleAndroidClientId,
);
const siteUrlRaw = process.env.EXPO_PUBLIC_SITE_URL?.trim();
const siteUrl = siteUrlRaw
	? siteUrlRaw.replace(/\/$/, "")
	: "http://__DEV_HOST__:3500";
const appScheme = "__PROJECT_SLUG__";
const googleIntentFilters =
	googleUrlSchemes.length > 0
		? googleUrlSchemes.map((scheme) => ({
				action: "VIEW" as const,
				data: [{ scheme, pathPrefix: "/oauthredirect" }],
				category: ["BROWSABLE", "DEFAULT"],
			}))
		: [];
const appSchemeFilter = {
	action: "VIEW" as const,
	data: [{ scheme: appScheme, pathPrefix: "/" }],
	category: ["BROWSABLE", "DEFAULT"],
};
const appVersion = process.env.APP_VERSION ?? pkg.version ?? "1.0.0";
const admobIosAppId =
	process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ??
	"ca-app-pub-3940256099942544~1458002511";
const admobAndroidAppId =
	process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ??
	"ca-app-pub-3940256099942544~3347511713";
const iosBuildNumber =
	process.env.APP_BUILD_NUMBER ?? String(pkg.buildNumber ?? 1);
const androidVersionCode = Number.parseInt(
	process.env.APP_VERSION_CODE ??
		process.env.APP_BUILD_NUMBER ??
		String(pkg.buildNumber ?? 1),
	10,
);

/** Keep app deep links when Google OAuth URL schemes are also registered. */
const iosUrlSchemes = [...new Set([appScheme, ...googleUrlSchemes])];

const userTrackingUsageDescription =
	"__PROJECT_NAME__ uses this identifier to show personalized ads through Google AdMob. You can change this anytime in Settings.";

const pushNotificationsUsageDescription =
	"__PROJECT_NAME__ sends optional notifications when you turn them on in Settings.";

const googleServicesJsonPath = join(__dirname, "google-services.json");
const googleServiceInfoPlistPath = join(__dirname, "GoogleService-Info.plist");
const hasAndroidFirebaseConfig = existsSync(googleServicesJsonPath);
const hasIosFirebaseConfig = existsSync(googleServiceInfoPlistPath);
// The @react-native-firebase config plugins hard-fail prebuild when their
// platform's google services file is missing, so only register them once both
// files exist (the real, gitignored files live in mobile/).
const hasFirebaseConfig = hasAndroidFirebaseConfig && hasIosFirebaseConfig;
if (!hasFirebaseConfig) {
	console.warn(
		"[app.config] Firebase disabled: add GoogleService-Info.plist and google-services.json to mobile/ to enable @react-native-firebase plugins.",
	);
}

const config: ExpoConfig = {
	name: "__PROJECT_NAME__",
	slug: "__PROJECT_SLUG__",
	version: appVersion,
	scheme: appScheme,
	orientation: "portrait",
	userInterfaceStyle: "automatic",
	newArchEnabled: true,
	ios: {
		supportsTablet: false,
		bundleIdentifier: "__BUNDLE_ID__",
		buildNumber: iosBuildNumber,
		...(process.env.APPLE_TEAM_ID
			? { appleTeamId: process.env.APPLE_TEAM_ID }
			: {}),
		usesAppleSignIn: true,
		...(hasIosFirebaseConfig
			? { googleServicesFile: "./GoogleService-Info.plist" }
			: {}),
		infoPlist: {
			ITSAppUsesNonExemptEncryption: false,
			NSUserNotificationUsageDescription: pushNotificationsUsageDescription,
			CFBundleURLTypes: [
				{
					CFBundleURLSchemes: iosUrlSchemes,
				},
			],
		},
	},
	android: {
		edgeToEdgeEnabled: true,
		predictiveBackGestureEnabled: false,
		package: "__BUNDLE_ID__",
		...(hasAndroidFirebaseConfig
			? { googleServicesFile: "./google-services.json" }
			: {}),
		versionCode: androidVersionCode,
		...({ usesCleartextTraffic: false } as Record<string, unknown>),
		intentFilters: [appSchemeFilter, ...googleIntentFilters],
	},
	web: {},
	plugins: [
		// Registered first so its withAndroidStyles mod executes LAST (Expo mods run
		// last-registered-first) — expo-splash-screen writes the deprecated
		// android:statusBarColor into AppTheme and would otherwise re-add it after us.
		// Also emits values-night/styles.xml so system bar icons follow the canvas.
		"./plugins/withAndroidEdgeToEdgeTheme.js",
		// Registered ahead of every other manifest plugin so its mod executes LAST.
		// expo-notifications + @react-native-firebase/messaging both re-add the FCM
		// default-notification meta-data; running last lets us stamp them with
		// tools:replace to resolve the manifest merge conflict.
		"./plugins/withAndroidFcmManifestFix.js",
		// Keeps the portrait lock working on sw600dp+ displays under Android 16.
		"./plugins/withAndroidLargeScreenOptOut.js",
		"./plugins/withIosQuietBuild.js",
		["./plugins/withIosMetroHost.js", { devHost: getDevHostFromEnv() }],
		// React Native Firebase needs static frameworks on iOS for FCM token support.
		[
			"expo-build-properties",
			{
				ios: { useFrameworks: "static", buildReactNativeFromSource: true },
				android: {
					targetSdkVersion: 36,
					enableMinifyInReleaseBuilds: true,
					enableShrinkResourcesInReleaseBuilds: true,
					extraProguardRules: [
						"# Keep Crashlytics stack traces readable after obfuscation.",
						"-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod",
						"-renamesourcefileattribute SourceFile",
						"",
						"# Expo modules are resolved reflectively by class name.",
						"-keep class expo.modules.** { *; }",
						"-keep @expo.modules.core.interfaces.DoNotStrip class * { *; }",
						"-keepclassmembers class * { @expo.modules.core.interfaces.DoNotStrip *; }",
						"",
						"# React Native native modules, view managers and JNI entry points.",
						"-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip",
						"-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }",
						"-keep class com.facebook.jni.** { *; }",
						"-keep class com.facebook.hermes.unicode.** { *; }",
						"",
						"# App classes referenced by name from the manifest.",
						"-keep class __BUNDLE_ID__.** { *; }",
					].join("\n"),
				},
			},
		],
		...(hasFirebaseConfig
			? [
					"@react-native-firebase/app",
					"@react-native-firebase/messaging",
					"@react-native-firebase/crashlytics",
				]
			: []),
		"expo-router",
		"expo-secure-store",
		"expo-localization",
		"expo-web-browser",
		[
			"expo-image-picker",
			{
				photosPermission:
					"Allow __PROJECT_NAME__ to access your photos to set avatars.",
				cameraPermission:
					"Allow __PROJECT_NAME__ to use the camera to take avatar photos.",
				microphonePermission: false,
			},
		],
		[
			"expo-splash-screen",
			{
				backgroundColor: "#0d1b2a",
			},
		],
		[
			"react-native-google-mobile-ads",
			{
				androidAppId: admobAndroidAppId,
				iosAppId: admobIosAppId,
				delayAppMeasurementInit: true,
				userTrackingUsageDescription,
			},
		],
		[
			"expo-tracking-transparency",
			{
				userTrackingPermission: userTrackingUsageDescription,
			},
		],
		[
			"expo-notifications",
			{
				color: "#0d1b2a",
				defaultChannel: "default",
				enableBackgroundRemoteNotifications: true,
			},
		],
	],
	extra: {
		apiUrl,
		siteUrl,
		googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
		googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
		googleAndroidClientId:
			process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
		admobIosAppId,
		admobAndroidAppId,
		revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "",
		revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "",
	},
};

export default config;
