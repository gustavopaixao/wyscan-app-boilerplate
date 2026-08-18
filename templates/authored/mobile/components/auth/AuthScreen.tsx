/**
 * Shared frame for the auth screens.
 *
 * Bottom padding derives from `useSafeAreaInsets().bottom` and is applied
 * exactly once here (edge-to-edge rule; see .claude/rules/mobile-safe-area.md).
 * Screens must not add their own bottom inset on top of this.
 */
import type { ReactNode } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { semanticColors } from "@/lib/theme";

type Props = {
	title: string;
	subtitle?: string;
	children: ReactNode;
	footer?: ReactNode;
};

export function AuthScreen({ title, subtitle, children, footer }: Props) {
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const colors = semanticColors(scheme);
	const insets = useSafeAreaInsets();

	return (
		<KeyboardAvoidingView
			style={[styles.flex, { backgroundColor: colors.background }]}
			// Only iOS needs this; Android's windowSoftInputMode already resizes.
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
				]}
				keyboardShouldPersistTaps="handled"
			>
				<Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
				{subtitle ? (
					<Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
				) : null}

				<View style={styles.body}>{children}</View>

				{footer ? <View style={styles.footer}>{footer}</View> : null}
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 },
	title: { fontSize: 28, fontWeight: "600", letterSpacing: -0.5 },
	subtitle: { marginTop: 6, fontSize: 15 },
	body: { marginTop: 24, gap: 16 },
	footer: { marginTop: 24, alignItems: "center", gap: 8 },
});
