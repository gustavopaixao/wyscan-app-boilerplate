import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function ResetPasswordScreen() {
	const { t } = useStrings();
	const router = useRouter();
	const c = appColors(resolveScheme(useColorScheme()));
	const { resetPassword } = useAuth();

	const params = useLocalSearchParams<{ email?: string }>();
	// Prefilled by the forgot-password push, but editable so someone who opened
	// the mail on another device can type it in.
	const [email, setEmail] = useState(params.email ?? "");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function onSubmit() {
		setError(null);
		setBusy(true);
		try {
			await resetPassword(email.trim(), code, password);
			// The API revoked every session on reset, so there is nothing to adopt.
			router.replace("/(auth)/login");
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
				{t("auth_reset_title")}
			</Text>
			<Text style={[typography.bodySmall, styles.hint, { color: c.muted }]}>
				{t("auth_reset_subtitle")}
			</Text>

			<AuthTextField
				label={t("auth_email_label")}
				value={email}
				onChangeText={setEmail}
				keyboardType="email-address"
				autoCapitalize="none"
				autoComplete="email"
				textContentType="emailAddress"
			/>

			<AuthTextField
				label={t("auth_code_label")}
				value={code}
				onChangeText={(value) => setCode(value.toUpperCase())}
				autoCapitalize="characters"
				autoCorrect={false}
				maxLength={8}
				textContentType="oneTimeCode"
				inputStyle={styles.code}
			/>

			<AuthTextField
				label={t("auth_new_password_label")}
				hint={t("auth_password_hint")}
				value={password}
				onChangeText={setPassword}
				secureTextEntry
				autoCapitalize="none"
				autoComplete="new-password"
				textContentType="newPassword"
				showPasswordLabel={t("auth_show_password")}
				hidePasswordLabel={t("auth_hide_password")}
			/>

			{error ? (
				<Text
					accessibilityRole="alert"
					style={[typography.caption, styles.error, { color: c.error }]}
				>
					{error}
				</Text>
			) : null}

			<PrimaryButton title={t("auth_reset_submit")} onPress={() => void onSubmit()} loading={busy} />
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
	code: { letterSpacing: 6, fontSize: 20 },
	error: { marginBottom: 12 },
	gap: { height: BUTTON_STACK_GAP },
});
