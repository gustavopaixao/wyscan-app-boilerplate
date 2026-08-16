import { createElement, type ReactNode } from "react";

type AppStateListener = (state: string) => void;

export const Platform = {
	OS: "ios" as const,
	// Return the platform-matching branch (falls back to `default`) so callers
	// that build styles via `Platform.select({...})` get a defined object.
	select: <T>(specifics: {
		ios?: T;
		android?: T;
		default?: T;
	}): T | undefined => specifics.ios ?? specifics.default,
};

/**
 * Minimal stubs so logic-level component tests (node env) can invoke thin
 * presentational components that delegate to tested helpers. These are NOT a
 * full renderer — they map RN primitives to plain React elements so a
 * component function returns either `null` or an element tree we can inspect.
 */
export const View = (props: { children?: ReactNode }) =>
	createElement("View", props, props.children);
export const Text = (props: { children?: ReactNode }) =>
	createElement("Text", props, props.children);
export const Image = (props: Record<string, unknown>) =>
	createElement("Image", props);
export const useColorScheme = (): "light" | "dark" => "light";

/** Minimal StyleSheet stub (values inspected, never applied to a real view). */
export const StyleSheet = {
	hairlineWidth: 1,
	absoluteFill: {
		position: "absolute" as const,
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
	},
	create: <T extends Record<string, unknown>>(styles: T): T => styles,
	flatten: (style: unknown): unknown => style,
};

// Type-only stubs so `import type { ImageStyle, ViewStyle } from "react-native"`
// resolves in the node test env (erased at runtime).
export type ViewStyle = Record<string, unknown>;
export type ImageStyle = Record<string, unknown>;
export type TextStyle = Record<string, unknown>;

export const AppState = {
	currentState: "active" as string,
	addEventListener: (
		_event: "change",
		_listener: AppStateListener,
	): { remove: () => void } => ({
		remove: () => {},
	}),
};

export const InteractionManager = {
	runAfterInteractions: (task: () => void): { cancel: () => void } => {
		task();
		return { cancel: () => {} };
	},
};
