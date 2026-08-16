import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const plugin = require("./withAndroidEdgeToEdgeTheme.js");
const { AndroidConfig } = require("@expo/config-plugins");

const { applyEdgeToEdgeThemeItems, buildNightStyles } = plugin;

/** Mirrors the styles.xml expo prebuild generates today. */
const dayStylesFixture = () => ({
	resources: {
		$: { "xmlns:tools": "http://schemas.android.com/tools" },
		style: [
			{
				$: { name: "AppTheme", parent: "Theme.AppCompat.DayNight.NoActionBar" },
				item: [
					{
						$: {
							name: "android:enforceNavigationBarContrast",
							"tools:targetApi": "29",
						},
						_: "true",
					},
					{
						$: { name: "android:editTextBackground" },
						_: "@drawable/rn_edit_text_material",
					},
					{ $: { name: "colorPrimary" }, _: "@color/colorPrimary" },
					{ $: { name: "android:statusBarColor" }, _: "#02132B" },
				],
			},
			{
				$: { name: "Theme.App.SplashScreen", parent: "Theme.SplashScreen" },
				item: [
					{
						$: { name: "windowSplashScreenBackground" },
						_: "@color/splashscreen_background",
					},
				],
			},
		],
	},
});

const appTheme = (xml: any) =>
	AndroidConfig.Styles.getStylesGroupAsObject(
		xml,
		AndroidConfig.Styles.getAppThemeGroup(),
	);

describe("withAndroidEdgeToEdgeTheme", () => {
	describe("applyEdgeToEdgeThemeItems", () => {
		it("drops the deprecated android:statusBarColor written by expo-splash-screen", () => {
			const result = applyEdgeToEdgeThemeItems(dayStylesFixture(), {
				light: true,
			});

			expect(appTheme(result)).not.toHaveProperty("android:statusBarColor");
		});

		it("asks for dark system bar icons on the light canvas", () => {
			const result = applyEdgeToEdgeThemeItems(dayStylesFixture(), {
				light: true,
			});

			expect(appTheme(result)["android:windowLightStatusBar"]).toBe("true");
			expect(appTheme(result)["android:windowLightNavigationBar"]).toBe("true");
		});

		it("asks for light system bar icons on the dark canvas", () => {
			const result = applyEdgeToEdgeThemeItems(dayStylesFixture(), {
				light: false,
			});

			expect(appTheme(result)["android:windowLightStatusBar"]).toBe("false");
			expect(appTheme(result)["android:windowLightNavigationBar"]).toBe("false");
		});

		it("keeps the rest of AppTheme untouched", () => {
			const result = applyEdgeToEdgeThemeItems(dayStylesFixture(), {
				light: true,
			});

			expect(appTheme(result)["colorPrimary"]).toBe("@color/colorPrimary");
			expect(appTheme(result)["android:editTextBackground"]).toBe(
				"@drawable/rn_edit_text_material",
			);
			expect(appTheme(result)["android:enforceNavigationBarContrast"]).toBe(
				"true",
			);
		});

		it("guards windowLightNavigationBar with tools:targetApi for lintVitalRelease", () => {
			const result = applyEdgeToEdgeThemeItems(dayStylesFixture(), {
				light: true,
			});
			const theme = AndroidConfig.Styles.getStyleParent(
				result,
				AndroidConfig.Styles.getAppThemeGroup(),
			);
			const navBarItem = theme.item.find(
				(item: any) => item.$.name === "android:windowLightNavigationBar",
			);

			expect(navBarItem.$["tools:targetApi"]).toBe("27");
		});

		it("is idempotent across repeated prebuilds", () => {
			const once = applyEdgeToEdgeThemeItems(dayStylesFixture(), { light: true });
			const twice = applyEdgeToEdgeThemeItems(once, { light: true });

			expect(twice).toEqual(once);
		});
	});

	describe("buildNightStyles", () => {
		it("clones every day item so the night theme does not lose AppTheme values", () => {
			// Android replaces a style wholesale per qualifier — it never merges item
			// bodies — so values-night must carry the full theme, not just overrides.
			const day = applyEdgeToEdgeThemeItems(dayStylesFixture(), { light: true });

			const night = buildNightStyles(day);

			expect(appTheme(night)["colorPrimary"]).toBe("@color/colorPrimary");
			expect(appTheme(night)["android:editTextBackground"]).toBe(
				"@drawable/rn_edit_text_material",
			);
			expect(appTheme(night)["android:enforceNavigationBarContrast"]).toBe(
				"true",
			);
		});

		it("flips only the light-bar booleans", () => {
			const day = applyEdgeToEdgeThemeItems(dayStylesFixture(), { light: true });

			const night = buildNightStyles(day);

			expect(appTheme(night)["android:windowLightStatusBar"]).toBe("false");
			expect(appTheme(night)["android:windowLightNavigationBar"]).toBe("false");
			expect(appTheme(night)).not.toHaveProperty("android:statusBarColor");
		});

		it("carries the tools namespace so tools:targetApi stays valid", () => {
			const day = applyEdgeToEdgeThemeItems(dayStylesFixture(), { light: true });

			const night = buildNightStyles(day);

			expect(night.resources.$["xmlns:tools"]).toBe(
				"http://schemas.android.com/tools",
			);
		});

		it("emits only AppTheme, not the splash theme", () => {
			const day = applyEdgeToEdgeThemeItems(dayStylesFixture(), { light: true });

			const night = buildNightStyles(day);

			expect(night.resources.style).toHaveLength(1);
			expect(night.resources.style[0].$.name).toBe("AppTheme");
		});

		it("does not mutate the day styles", () => {
			const day = applyEdgeToEdgeThemeItems(dayStylesFixture(), { light: true });

			buildNightStyles(day);

			expect(appTheme(day)["android:windowLightStatusBar"]).toBe("true");
		});

		it("returns null when AppTheme is missing", () => {
			expect(buildNightStyles({ resources: { style: [] } })).toBeNull();
		});
	});
});
