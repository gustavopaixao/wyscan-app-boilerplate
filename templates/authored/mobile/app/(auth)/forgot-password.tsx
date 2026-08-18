import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { AuthBrandLogo } from "@/components/auth/AuthBrandLogo";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AuthTextField } from "@/components/ui/AuthTextField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { useAuth } from "@/lib/auth/AuthContext";
import { authErrorMessage } from "@/lib/auth/authErrors";
import { useStrings } from "@/lib/i18n";
import { BUTTON_STACK_GAP, appColors, resolveScheme, typography } from "@/lib/theme";

export default function ForgotPasswordScreen() {
	const { t } = useStrings();
	const router = useRouter();
	const c = appColors(resolveScheme(useColorScheme()));
	const { forgotPassword } = useAuth();

	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function onSubmit() {
		setError(null);
		setBusy(true);
		try {
			await forgotPassword(email.trim());
			// The API answers identically for known and unknown addresses, so we
			// always advance. Branching here would reintroduce the account oracle
			// the API is careful to avoid.
			router.push({ pathname: "/(auth)/reset-password", params: { email: email.trim() } });
		} catch (cause) {
			setError(authErrorMessage(cause, t));
		} finally {
			setBusy(false);
		}
	}

	return (
		<AuthScreen>
			<AuthBrandLogo />

			<Text style={[typography.titleLarge, styles.title, { color: c.foreground }]}>
				{t("auth_forgot_title")}
			</Text>
			<Text style={[typography.bodySmall, styles.hint, { color: c.muted }]}>
				{t("auth_forgot_subtitle")}
			</Text>

			<AuthTextField
				label={t("auth_email_label")}
				value={email}
				onChangeText={setEmail}
				keyboardType="email-address"
				autoCapitalize="none"
				autoComplete="email"
				textContentType="emailAddress"
				onSubmitEditing={() => void onSubmit()}
				returnKeyType="go"
			/>

			{error ? (
				<Text
					accessibilityRole="alert"
					style={[typography.caption, styles.error, { color: c.error }]}
				>
					{error}
				</Text>
			) : null}

			<PrimaryButton title={t("auth_forgot_submit")} onPress={() => void onSubmit()} loading={busy} />
			<View style={styles.gap} />
			<SecondaryButton
				title={t("auth_back_to_sign_in")}
				onPress={() => router.replace("/(auth)/login")}
			/>
		</AuthScreen>
	);
}

const styles = StyleSheet.create({
	title: { marginBottom: 8 },
	hint: { marginBottom: 16 },
	error: { marginBottom: 12 },
	gap: { height: BUTTON_STACK_GAP },
});
