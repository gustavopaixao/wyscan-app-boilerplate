/** A horizontal rule with a centred label — "or" between auth methods. */
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { appColors, resolveScheme, typography } from "@/lib/theme";

export function DividerWithLabel({ label }: { label: string }) {
	const c = appColors(resolveScheme(useColorScheme()));

	return (
		<View style={styles.row}>
			<View style={[styles.rule, { backgroundColor: c.border }]} />
			<Text style={[typography.caption, styles.label, { color: c.muted }]}>{label}</Text>
			<View style={[styles.rule, { backgroundColor: c.border }]} />
		</View>
	);
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
	rule: { flex: 1, height: 1 },
	label: { marginHorizontal: 12 },
});
