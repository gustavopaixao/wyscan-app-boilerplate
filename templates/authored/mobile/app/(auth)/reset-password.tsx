import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthFormError } from "@/components/auth/AuthFormError";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AuthTextField } from "@/components/auth/AuthTextField";
import { useAuth } from "@/lib/auth/AuthContext";
import { authErrorMessage } from "@/lib/auth/authErrors";
import { useStrings } from "@/lib/i18n";
import { semanticColors } from "@/lib/theme";

export default function ResetPasswordScreen() {
	const { t } = useStrings();
	const router = useRouter();
	const { resetPassword } = useAuth();
	const colors = semanticColors(useColorScheme() === "dark" ? "dark" : "light");

	const params = useLocalSearchParams<{ email?: string }>();
	// Prefilled by the forgot-password push, but editable so a user who opened
	// the mail on another device can type it in.
	const [email, setEmail] = useState(params.email ?? "");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSubmit() {
		setError(null);
		setPending(true);
		try {
			await resetPassword(email.trim(), code, password);
			// The API revoked every session on reset, so there is nothing to adopt.
			router.replace("/(auth)/login");
		} catch (cause) {
			setError(authErrorMessage(cause, t));
		} finally {
			setPending(false);
		}
	}

	return (
		<AuthScreen
			title={t("auth_reset_title")}
			subtitle={t("auth_reset_subtitle")}
			footer={
				<Link href="/(auth)/login" style={[styles.link, { color: colors.accent }]}>
					{t("auth_back_to_sign_in")}
				</Link>
			}
		>
			<AuthFormError message={error} />

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
				style={styles.code}
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
			/>

			<AuthButton label={t("auth_reset_submit")} onPress={handleSubmit} pending={pending} />
		</AuthScreen>
	);
}

const styles = StyleSheet.create({
	link: { fontWeight: "600" },
	code: { letterSpacing: 6, fontSize: 20 },
});
