import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrings } from "@/lib/i18n";
import { semanticColors } from "@/lib/theme";
import { welcomeFooterStyle } from "./welcomeScreenStyles";

/**
 * Placeholder welcome screen (feature 0001). Proves the stack boots with
 * safe-area insets, semantic light/dark colors and the 8-locale i18n engine.
 */
export function WelcomeScreen() {
	const { t } = useStrings();
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const colors = semanticColors(scheme);
	const insets = useSafeAreaInsets();

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: colors.background, paddingTop: insets.top },
			]}
		>
			<View style={styles.body}>
				<MaterialIcons
					name="sports-soccer"
					size={48}
					color={colors.accent}
					accessibilityElementsHidden
				/>
				<Text
					accessibilityRole="header"
					style={[styles.title, { color: colors.foreground }]}
				>
					{t("app_welcome_title")}
				</Text>
			</View>
			<View style={welcomeFooterStyle(insets.bottom)}>
				<Text style={[styles.footerText, { color: colors.muted }]}>
					__PROJECT_NAME__
				</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	body: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: "600",
		textAlign: "center",
	},
	footerText: {
		fontSize: 13,
	},
});
