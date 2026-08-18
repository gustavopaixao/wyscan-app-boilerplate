import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	useColorScheme,
} from "react-native";
import { semanticColors } from "@/lib/theme";

type Props = {
	label: string;
	onPress: () => void;
	pending?: boolean;
	disabled?: boolean;
	variant?: "primary" | "secondary";
};

export function AuthButton({
	label,
	onPress,
	pending,
	disabled,
	variant = "primary",
}: Props) {
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const colors = semanticColors(scheme);
	const isPrimary = variant === "primary";
	// Disabled while pending so a double-tap cannot submit twice — on register
	// that would mean two accounts, on resend two codes.
	const inactive = pending || disabled;

	return (
		<Pressable
			onPress={onPress}
			disabled={inactive}
			accessibilityRole="button"
			accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(pending) }}
			style={({ pressed }) => [
				styles.button,
				{
					backgroundColor: isPrimary ? colors.accent : "transparent",
					borderColor: colors.border,
					borderWidth: isPrimary ? 0 : 1,
					opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
				},
			]}
		>
			{pending ? (
				<ActivityIndicator color={isPrimary ? "#ffffff" : colors.foreground} />
			) : (
				<Text
					style={[styles.label, { color: isPrimary ? "#ffffff" : colors.foreground }]}
				>
					{label}
				</Text>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		height: 48,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	label: { fontSize: 16, fontWeight: "600" },
});
