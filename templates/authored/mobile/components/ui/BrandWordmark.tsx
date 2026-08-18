/**
 * The app's brand lockup.
 *
 * Typographic on purpose: a freshly generated project has no logo, and shipping
 * a placeholder image would be worse than shipping type. Swap the Text for an
 * Image here — this is the only place either the auth screens or the toolbar
 * reference the brand.
 */
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { BRAND_NAME } from "@/lib/brand/brandName";
import { appColors, resolveScheme } from "@/lib/theme";

type Props = {
	/** `hero` for the auth screens, `inline` for the toolbar. */
	variant?: "hero" | "inline";
};

export function BrandWordmark({ variant = "inline" }: Props) {
	const c = appColors(resolveScheme(useColorScheme()));
	const hero = variant === "hero";

	return (
		<View style={hero ? styles.hero : styles.inline}>
			<Text
				accessibilityRole="header"
				numberOfLines={1}
				style={[
					hero ? styles.heroText : styles.inlineText,
					{ color: c.foreground },
				]}
			>
				{BRAND_NAME}
			</Text>
			{hero ? <View style={[styles.rule, { backgroundColor: c.accent }]} /> : null}
		</View>
	);
}

const styles = StyleSheet.create({
	hero: { alignItems: "center", paddingTop: 32, marginBottom: 20, gap: 10 },
	inline: { flexShrink: 1 },
	heroText: { fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
	// A short accent rule under the wordmark, so the brand colour appears on the
	// first screen a user ever sees.
	rule: { width: 40, height: 3, borderRadius: 2 },
	inlineText: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
});
