/**
 * Shown while the stored session is being checked, so the entry route does not
 * flash the sign-in screen at users who are in fact signed in.
 */
import { ActivityIndicator, StyleSheet, useColorScheme, View } from "react-native";
import { semanticColors } from "@/lib/theme";

export function AuthLoadingScreen() {
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const colors = semanticColors(scheme);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ActivityIndicator color={colors.accent} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
