/**
 * Shared chrome for the tab bar and the toolbars.
 *
 * `.claude/rules/mobile-safe-area.md` requires every tab layout to build its
 * options with `useTabChromeScreenOptions` from this module. The pure
 * `tabChromeScreenOptions` below exists so the inset arithmetic can be tested
 * without a navigator — it must not be called from a layout, because its
 * `bottomInset` defaults to 0 and would then override React Navigation's own
 * inset handling on both platforms.
 */
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import {
	type ColorSchemeName,
	appColors,
	screenChromeOptions,
} from "@/lib/theme";

/** React Navigation's own tab-bar content height, excluding any safe-area inset. */
export const TAB_BAR_CONTENT_HEIGHT = 49;

/** Hairline separator between the chrome and the content behind it. */
export function chromeBorderColor(scheme: ColorSchemeName): string {
	return scheme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)";
}

/**
 * Opaque chrome fill. Deliberately a touch darker than the canvas in dark mode
 * so the bar reads as a separate plane rather than merging into the content.
 */
export function chromeBackgroundColor(scheme: ColorSchemeName): string {
	return appColors(scheme).chrome;
}

/** Scrim laid over the iOS blur so text stays legible against busy content. */
export function chromeTintOverlay(scheme: ColorSchemeName): string {
	return scheme === "dark" ? "rgba(10, 22, 34, 0.9)" : "rgba(250, 250, 250, 0.94)";
}

/**
 * Translucent blur on iOS, flat opaque on Android.
 *
 * Android is not a cost decision: `expo-blur` is unreliable there — it does not
 * composite correctly over a scrolling surface on many devices — so the platform
 * gets a solid fill that always looks intentional.
 */
export function NavigationChromeBackground({ scheme }: { scheme: ColorSchemeName }) {
	if (Platform.OS === "android") {
		return (
			<View
				style={[StyleSheet.absoluteFill, { backgroundColor: chromeBackgroundColor(scheme) }]}
			/>
		);
	}

	return (
		<>
			<BlurView
				intensity={88}
				tint={scheme === "dark" ? "dark" : "light"}
				style={StyleSheet.absoluteFill}
			/>
			<View
				pointerEvents="none"
				style={[StyleSheet.absoluteFill, { backgroundColor: chromeTintOverlay(scheme) }]}
			/>
		</>
	);
}

/** The top-side twin of the tab bar background: blur plus a bottom hairline. */
export function ToolbarChromeShell({
	scheme,
	children,
}: {
	scheme: ColorSchemeName;
	children: ReactNode;
}) {
	return (
		<View style={styles.toolbarShell}>
			<View pointerEvents="none" style={StyleSheet.absoluteFill}>
				<NavigationChromeBackground scheme={scheme} />
			</View>
			<View
				style={{
					borderBottomWidth: StyleSheet.hairlineWidth,
					borderBottomColor: chromeBorderColor(scheme),
				}}
			>
				{children}
			</View>
		</View>
	);
}

type TabChromeParams = {
	scheme: ColorSchemeName;
	/** Safe-area bottom inset. Supplied by the hook; 0 only in tests. */
	bottomInset?: number;
};

/**
 * Pure options builder — exported for tests only. Layouts must use the hook.
 *
 * The height arithmetic is the part worth understanding: because `tabBarStyle`
 * is merged LAST, the explicit `height` and `paddingBottom` here replace whatever
 * React Navigation would have derived from the safe area. That means
 * `useBottomTabBarHeight()` already includes the inset, and **tab content must
 * not add `insets.bottom` again** or it double-counts the gesture bar.
 */
export function tabChromeScreenOptions({ scheme, bottomInset = 0 }: TabChromeParams) {
	const c = appColors(scheme);

	return {
		...screenChromeOptions(scheme),
		headerShown: true,
		headerTransparent: true,
		headerShadowVisible: false,
		headerStyle: {
			backgroundColor: "transparent",
			...(Platform.OS === "android" && {
				elevation: 0,
				shadowOpacity: 0,
				borderBottomWidth: 0,
			}),
		},
		tabBarActiveTintColor: c.accent,
		tabBarInactiveTintColor: c.muted,
		tabBarItemStyle: { paddingTop: 8 },
		tabBarStyle: {
			position: "absolute" as const,
			left: 0,
			right: 0,
			bottom: 0,
			height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
			paddingBottom: bottomInset,
			borderTopWidth: StyleSheet.hairlineWidth,
			borderTopColor: chromeBorderColor(scheme),
			backgroundColor: "transparent",
			elevation: Platform.OS === "android" ? 8 : 0,
		},
		tabBarBackground: () => <NavigationChromeBackground scheme={scheme} />,
	};
}

/** Use this from every tab layout. It folds in the real safe-area inset. */
export function useTabChromeScreenOptions(params: { scheme: ColorSchemeName }) {
	const insets = useSafeAreaInsets();
	return tabChromeScreenOptions({ ...params, bottomInset: insets.bottom });
}

const styles = StyleSheet.create({
	toolbarShell: { overflow: "hidden" },
});
