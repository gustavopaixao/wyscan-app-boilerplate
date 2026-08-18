/**
 * Placeholder body for a tab that has no feature yet.
 *
 * Deliberately NOT scrolling. Under a tab bar, scrollable content must pad by
 * `useBottomTabBarHeight() + gap` and must NOT add `insets.bottom` on top —
 * the tab bar already includes it. Keeping these non-scrolling means the rule
 * has nothing to get wrong until real content arrives.
 */
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { SCREEN_EDGE_PADDING, appColors, resolveScheme, typography } from "@/lib/theme";

type Props = {
	icon: keyof typeof Ionicons.glyphMap;
	title: string;
};

export function TabPlaceholder({ icon, title }: Props) {
	const c = appColors(resolveScheme(useColorScheme()));
	// The header is transparent, so content must clear it explicitly.
	const headerHeight = useHeaderHeight();

	return (
		<View style={[styles.container, { backgroundColor: c.background, paddingTop: headerHeight }]}>
			<View style={styles.body}>
				<Ionicons name={icon} size={40} color={c.muted} accessibilityElementsHidden />
				<Text accessibilityRole="header" style={[typography.titleMedium, { color: c.foreground }]}>
					{title}
				</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, paddingHorizontal: SCREEN_EDGE_PADDING },
	body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
});
