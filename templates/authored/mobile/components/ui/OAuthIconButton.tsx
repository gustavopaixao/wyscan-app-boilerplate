/**
 * Square icon button for a social provider.
 *
 * Deliberately icon-only and equally sized for every provider, so no provider
 * gets visual priority and adding one does not reflow the row.
 */
import type { ReactNode } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	useColorScheme,
} from "react-native";
import { MIN_TOUCH_TARGET, appColors, resolveScheme } from "@/lib/theme";

type Props = {
	onPress: () => void;
	accessibilityLabel: string;
	children: ReactNode;
	disabled?: boolean;
	loading?: boolean;
	/** Pass 0 for a provider whose artwork supplies its own edge. */
	borderWidth?: number;
	borderColor?: string;
	testID?: string;
};

export function OAuthIconButton({
	onPress,
	accessibilityLabel,
	children,
	disabled,
	loading,
	borderWidth = 1,
	borderColor,
	testID,
}: Props) {
	const c = appColors(resolveScheme(useColorScheme()));
	const inactive = Boolean(disabled || loading);

	return (
		<Pressable
			testID={testID}
			onPress={onPress}
			disabled={inactive}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
			style={({ pressed }) => [
				styles.button,
				{
					borderWidth,
					borderColor: borderWidth === 0 ? "transparent" : (borderColor ?? c.border),
					opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
				},
			]}
		>
			{loading ? <ActivityIndicator size="small" color={c.foreground} /> : children}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		width: MIN_TOUCH_TARGET,
		height: MIN_TOUCH_TARGET,
		borderRadius: 4,
		backgroundColor: "transparent",
		alignItems: "center",
		justifyContent: "center",
	},
});
