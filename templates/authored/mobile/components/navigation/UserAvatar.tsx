/**
 * Circular avatar with an initials fallback.
 *
 * Initials rather than a generic person glyph: with several accounts on one
 * device the glyph is indistinguishable, and the initial is a free identity cue.
 */
import { Image, StyleSheet, Text, useColorScheme, View } from "react-native";
import { appColors, resolveScheme } from "@/lib/theme";

type Props = {
	displayName: string;
	photoUrl?: string | null;
	size?: number;
	accessibilityLabel?: string;
};

/** First letter of the first two words: "Ada Lovelace" -> "AL". */
function initialsFor(displayName: string): string {
	return displayName
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? "")
		.join("");
}

export function UserAvatar({ displayName, photoUrl, size = 32, accessibilityLabel }: Props) {
	const c = appColors(resolveScheme(useColorScheme()));
	const radius = size / 2;

	if (photoUrl) {
		return (
			<Image
				source={{ uri: photoUrl }}
				accessibilityLabel={accessibilityLabel}
				style={{ width: size, height: size, borderRadius: radius }}
			/>
		);
	}

	return (
		<View
			accessible
			accessibilityLabel={accessibilityLabel}
			style={[
				styles.fallback,
				{
					width: size,
					height: size,
					borderRadius: radius,
					backgroundColor: c.accentMuted,
				},
			]}
		>
			<Text style={[styles.initials, { color: c.accent, fontSize: size * 0.4 }]}>
				{initialsFor(displayName) || "?"}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	fallback: { alignItems: "center", justifyContent: "center" },
	initials: { fontWeight: "700" },
});
