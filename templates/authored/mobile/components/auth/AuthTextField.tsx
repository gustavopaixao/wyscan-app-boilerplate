import {
	StyleSheet,
	Text,
	TextInput,
	type TextInputProps,
	useColorScheme,
	View,
} from "react-native";
import { semanticColors } from "@/lib/theme";

type Props = TextInputProps & {
	label: string;
	hint?: string;
};

export function AuthTextField({ label, hint, style, ...props }: Props) {
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const colors = semanticColors(scheme);

	return (
		<View style={styles.wrapper}>
			<Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
			<TextInput
				accessibilityLabel={label}
				placeholderTextColor={colors.muted}
				style={[
					styles.input,
					{
						color: colors.foreground,
						borderColor: colors.border,
						backgroundColor: colors.cardBackground,
					},
					style,
				]}
				{...props}
			/>
			{hint ? <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text> : null}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: { gap: 6 },
	label: { fontSize: 14, fontWeight: "500" },
	input: {
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 12,
		// Height is set explicitly rather than via vertical padding: Android
		// centres text differently and the two fields would not line up.
		height: 48,
		fontSize: 16,
	},
	hint: { fontSize: 12 },
});
