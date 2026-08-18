/**
 * Type scale.
 *
 * Deliberately small — five roles, no font family. The platform system font
 * (SF Pro on iOS, Roboto on Android) is what the reference implementation uses,
 * and a boilerplate has no licensed typeface to ship. Load one with `expo-font`
 * and add `fontFamily` here if the product needs it.
 */
import type { TextStyle } from "react-native";

export const typography = {
	titleLarge: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
	titleMedium: { fontSize: 18, fontWeight: "600", lineHeight: 24 },
	body: { fontSize: 16, lineHeight: 22 },
	bodySmall: { fontSize: 14, lineHeight: 20 },
	caption: { fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type TypographyRole = keyof typeof typography;
