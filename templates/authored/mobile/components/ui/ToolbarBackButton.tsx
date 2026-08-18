/** Back chevron for a stack toolbar. Sized to the minimum touch target. */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, useColorScheme } from "react-native";
import { MIN_TOUCH_TARGET, appColors, resolveScheme } from "@/lib/theme";

type Props = {
	onPress: () => void;
	accessibilityLabel: string;
};

export function ToolbarBackButton({ onPress, accessibilityLabel }: Props) {
	const c = appColors(resolveScheme(useColorScheme()));

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			hitSlop={8}
			style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}
		>
			<Ionicons name="chevron-back" size={26} color={c.foreground} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		minWidth: MIN_TOUCH_TARGET,
		minHeight: MIN_TOUCH_TARGET,
		alignItems: "center",
		justifyContent: "center",
	},
});
