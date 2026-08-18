/** Outlined button: the alternative action, never the primary one. */
import { Pressable, StyleSheet, Text, useColorScheme } from "react-native";
import { MIN_TOUCH_TARGET, appColors, radii, resolveScheme, typography } from "@/lib/theme";

type Props = {
	title: string;
	onPress: () => void;
	disabled?: boolean;
	testID?: string;
};

export function SecondaryButton({ title, onPress, disabled, testID }: Props) {
	const c = appColors(resolveScheme(useColorScheme()));

	return (
		<Pressable
			testID={testID}
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityState={{ disabled: Boolean(disabled) }}
			style={({ pressed }) => [
				styles.button,
				{
					borderColor: c.border,
					opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
				},
			]}
		>
			<Text style={[typography.body, styles.label, { color: c.foreground }]}>{title}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		minHeight: MIN_TOUCH_TARGET,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: radii.control,
		borderWidth: 1,
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center",
	},
	label: { fontWeight: "600" },
});
