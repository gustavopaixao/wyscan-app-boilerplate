/**
 * Labelled text field with an optional show/hide toggle for passwords.
 *
 * The toggle is absolutely positioned over the input rather than laid out beside
 * it, so the input keeps the full width and the label stays aligned with every
 * other field on the screen. The input reserves right padding for it.
 */
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	type TextInputProps,
	useColorScheme,
	View,
} from "react-native";
import { MIN_TOUCH_TARGET, appColors, radii, resolveScheme, typography } from "@/lib/theme";

type Props = Omit<TextInputProps, "style"> & {
	label: string;
	/** Helper text under the field — password rules, format hints. */
	hint?: string;
	error?: string | null;
	/** Provide both labels to enable the toggle on a secure field. */
	showPasswordLabel?: string;
	hidePasswordLabel?: string;
	inputStyle?: TextInputProps["style"];
};

const TOGGLE_WIDTH = MIN_TOUCH_TARGET;
const INPUT_PADDING = 12;

export function AuthTextField({
	label,
	hint,
	error,
	secureTextEntry,
	showPasswordLabel,
	hidePasswordLabel,
	inputStyle,
	...props
}: Props) {
	const c = appColors(resolveScheme(useColorScheme()));
	const [visible, setVisible] = useState(false);

	// Only offer the toggle when the caller supplied both accessibility labels —
	// an unlabelled icon button is worse than no button.
	const showToggle = Boolean(secureTextEntry && showPasswordLabel && hidePasswordLabel);

	return (
		<View style={styles.wrapper}>
			<Text style={[typography.caption, styles.label, { color: c.muted }]}>{label}</Text>

			<View
				style={[
					styles.field,
					{
						borderColor: error ? c.error : c.border,
						backgroundColor: c.cardBackground,
						borderRadius: radii.control,
					},
				]}
			>
				<TextInput
					accessibilityLabel={label}
					secureTextEntry={Boolean(secureTextEntry && !visible)}
					placeholderTextColor={c.muted}
					style={[
						styles.input,
						{
							color: c.foreground,
							paddingRight: showToggle ? INPUT_PADDING + TOGGLE_WIDTH : INPUT_PADDING,
						},
						inputStyle,
					]}
					{...props}
				/>

				{showToggle ? (
					<Pressable
						onPress={() => setVisible((v) => !v)}
						accessibilityRole="button"
						accessibilityLabel={visible ? hidePasswordLabel : showPasswordLabel}
						style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.7 : 1 }]}
					>
						<Ionicons name={visible ? "eye-off" : "eye"} size={22} color={c.muted} />
					</Pressable>
				) : null}
			</View>

			{/* The error replaces the hint rather than stacking: two lines of
			    small text under one field is noise, and the error is the one that
			    needs reading. */}
			{error ? (
				<Text
					accessibilityRole="alert"
					style={[typography.caption, styles.error, { color: c.error }]}
				>
					{error}
				</Text>
			) : hint ? (
				<Text style={[typography.caption, styles.error, { color: c.muted }]}>{hint}</Text>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: { marginBottom: 14 },
	label: { marginBottom: 6 },
	field: { position: "relative", borderWidth: 1 },
	input: {
		paddingLeft: INPUT_PADDING,
		paddingVertical: 10,
		// Explicit height rather than padding alone: Android centres text
		// differently and the fields would not line up with each other.
		minHeight: MIN_TOUCH_TARGET,
		backgroundColor: "transparent",
		fontSize: 16,
	},
	toggle: {
		position: "absolute",
		right: 0,
		top: 0,
		bottom: 0,
		width: TOGGLE_WIDTH,
		alignItems: "center",
		justifyContent: "center",
	},
	error: { marginTop: 4 },
});
