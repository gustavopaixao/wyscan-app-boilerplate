/**
 * Filled action button — the single most important action on a screen.
 *
 * App-local by design. The shared design-system package these primitives mirror
 * is dropped entirely in `registry` and `standalone` shared-package modes, so
 * anything importing it would work on one machine and break on every other.
 */
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	useColorScheme,
} from "react-native";
import { MIN_TOUCH_TARGET, appColors, radii, resolveScheme, typography } from "@/lib/theme";

type Props = {
	title: string;
	onPress: () => void;
	loading?: boolean;
	disabled?: boolean;
	testID?: string;
};

export function PrimaryButton({ title, onPress, loading, disabled, testID }: Props) {
	const c = appColors(resolveScheme(useColorScheme()));
	// Disabled while loading so a double-tap cannot submit twice — on register
	// that means two accounts, on resend two codes.
	const inactive = Boolean(loading || disabled);

	return (
		<Pressable
			testID={testID}
			onPress={onPress}
			disabled={inactive}
			accessibilityRole="button"
			accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
			style={({ pressed }) => [
				styles.button,
				{
					backgroundColor: c.accent,
					opacity: inactive ? 0.55 : pressed ? 0.9 : 1,
				},
			]}
		>
			{loading ? (
				<ActivityIndicator color={c.onAccent} />
			) : (
				<Text style={[typography.body, styles.label, { color: c.onAccent }]}>{title}</Text>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		minHeight: MIN_TOUCH_TARGET,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: radii.control,
		alignItems: "center",
		justifyContent: "center",
	},
	label: { fontWeight: "600" },
});
