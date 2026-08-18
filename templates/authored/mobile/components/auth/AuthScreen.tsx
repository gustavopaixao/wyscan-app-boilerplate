/**
 * Shell for the auth screens.
 *
 * Owns the safe-area insets exactly once: top padding for the status bar and
 * bottom padding for the gesture bar. Screens inside must not add either again —
 * see `.claude/rules/mobile-safe-area.md`.
 */
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SCREEN_EDGE_PADDING, appColors, resolveScheme } from "@/lib/theme";

export function AuthScreen({ children }: { children: ReactNode }) {
	const c = appColors(resolveScheme(useColorScheme()));
	const insets = useSafeAreaInsets();

	return (
		<KeyboardAvoidingView
			style={[styles.flex, { backgroundColor: c.background }]}
			// iOS needs this; Android's windowSoftInputMode already resizes, and
			// applying both double-shifts the form.
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<View
				style={[
					styles.body,
					{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 },
				]}
			>
				{children}
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	body: { flex: 1, paddingHorizontal: SCREEN_EDGE_PADDING + 4 },
});
