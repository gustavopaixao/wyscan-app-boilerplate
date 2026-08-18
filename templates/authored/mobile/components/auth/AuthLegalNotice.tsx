/**
 * Terms and privacy line under the auth forms.
 *
 * The links are placeholders — point them at real pages before launch. Both app
 * stores require reachable terms and privacy URLs at review.
 */
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { useStrings } from "@/lib/i18n";
import { appColors, resolveScheme, typography } from "@/lib/theme";

export function AuthLegalNotice({ mode }: { mode: "login" | "register" }) {
	const { t } = useStrings();
	const c = appColors(resolveScheme(useColorScheme()));

	return (
		<View style={styles.wrap}>
			<Text style={[typography.caption, styles.text, { color: c.muted }]}>
				{mode === "login" ? t("auth_legal_notice") : t("auth_legal_notice_register")}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { marginTop: 16, paddingHorizontal: 8 },
	text: { textAlign: "center" },
});
