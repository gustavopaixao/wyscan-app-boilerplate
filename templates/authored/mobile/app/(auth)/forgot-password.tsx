import { Link, useRouter } from "expo-router";
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

export default function ForgotPasswordScreen() {
	const { t } = useStrings();
	const router = useRouter();
	const { forgotPassword } = useAuth();
	const colors = semanticColors(useColorScheme() === "dark" ? "dark" : "light");

	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSubmit() {
		setError(null);
		setPending(true);
		try {
			await forgotPassword(email.trim());
			// The API answers identically for known and unknown addresses, so we
			// always advance. Branching on the response would reintroduce the
			// account oracle the API is careful to avoid.
			router.push({ pathname: "/(auth)/reset-password", params: { email: email.trim() } });
		} catch (cause) {
			setError(authErrorMessage(cause, t));
		} finally {
			setPending(false);
		}
	}

	return (
		<AuthScreen
			title={t("auth_forgot_title")}
			subtitle={t("auth_forgot_subtitle")}
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
				onSubmitEditing={handleSubmit}
				returnKeyType="go"
			/>

			<AuthButton label={t("auth_forgot_submit")} onPress={handleSubmit} pending={pending} />
		</AuthScreen>
	);
}

const styles = StyleSheet.create({
	link: { fontWeight: "600" },
});
