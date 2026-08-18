/**
 * The app's colour palette.
 *
 * Extends the extracted `semanticColors` rather than replacing it, so the
 * screens that already resolve through `@/lib/theme` keep working and a re-sync
 * of `lib/theme/colors.ts` cannot conflict with this file. Same layering the
 * reference implementation uses: a base palette wrapped by an app-local one that
 * adds what the product needs.
 *
 * Resolve colours through this — never hard-code a hex value in a component.
 */
import {
	type ColorSchemeName,
	type SemanticColors,
	semanticColors,
} from "./colors";

export type AppColors = SemanticColors & {
	/**
	 * Text and icons drawn ON TOP of `accent`.
	 *
	 * Not simply white: the dark accent is a light blue, and white on it lands
	 * around 2.2:1 — well under the 4.5:1 AA minimum. Flipping to near-black in
	 * dark mode restores roughly 9:1.
	 */
	onAccent: string;
	/** Low-opacity accent wash: hover states, skeletons, icon chips. */
	accentMuted: string;
	/** Destructive and failure states. */
	error: string;
	/** Confirmation and success states. */
	success: string;
	/**
	 * Fill for navigation chrome — the tab bar and the toolbars.
	 *
	 * A separate token rather than reusing `background`: in dark mode the bar
	 * reads as a distinct plane only if it is a shade darker than the canvas it
	 * floats over. In light mode it matches the canvas, which is why the value
	 * looks redundant there.
	 */
	chrome: string;
	/** Surface for floating elements — menus, popovers — above `cardBackground`. */
	elevatedSurface: string;
};

const extra: Record<ColorSchemeName, Omit<AppColors, keyof SemanticColors>> = {
	light: {
		onAccent: "#ffffff",
		accentMuted: "rgba(37, 99, 235, 0.12)",
		error: "#dc2626",
		success: "#15803d",
		chrome: "#fafafa",
		elevatedSurface: "#ffffff",
	},
	dark: {
		onAccent: "#0b1220",
		accentMuted: "rgba(96, 165, 250, 0.18)",
		error: "#f87171",
		success: "#22c55e",
		chrome: "#0a1622",
		elevatedSurface: "#1b2536",
	},
};

export function appColors(scheme: ColorSchemeName): AppColors {
	return { ...semanticColors(scheme), ...extra[scheme] };
}

/** Narrow React Native's `useColorScheme()` (which can return null) to a scheme. */
export function resolveScheme(scheme: string | null | undefined): ColorSchemeName {
	return scheme === "dark" ? "dark" : "light";
}
