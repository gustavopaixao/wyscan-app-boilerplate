import { StyleSheet, Text, View } from "react-native";

/**
 * `accessibilityLiveRegion` / `accessibilityRole="alert"` so the failure is
 * announced — an inline error that only changes colour is invisible to anyone
 * not looking at that exact spot.
 */
export function AuthFormError({ message }: { message?: string | null }) {
	if (!message) return null;

	return (
		<View style={styles.container} accessibilityLiveRegion="polite" accessibilityRole="alert">
			<Text style={styles.text}>{message}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: "rgba(239, 68, 68, 0.12)",
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	text: { color: "#dc2626", fontSize: 14 },
});
