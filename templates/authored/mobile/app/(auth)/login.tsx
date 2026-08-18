import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, useColorScheme } from "react-native";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthFormError } from "@/components/auth/AuthFormError";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AuthTextField } from "@/components/auth/AuthTextField";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { useAuth } from "@/lib/auth/AuthContext";
import { authErrorMessage } from "@/lib/auth/authErrors";
import { useStrings } from "@/lib/i18n";
import { semanticColors } from "@/lib/theme";

export default function LoginScreen() {
	const { t } = useStrings();
	const router = useRouter();
	const { signIn } = useAuth();
	const colors = semanticColors(useColorScheme() === "dark" ? "dark" : "light");

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSubmit() {
		setError(null);
		setPending(true);
		try {
			const result = await signIn(email.trim(), password);
			// An unverified account gets a 200 with no session — finish signup
			// rather than reporting a failure the user cannot act on.
			if (result.requiresVerification) {
				router.push({
					pathname: "/(auth)/verify",
					params: { email: result.email, userId: result.userId },
				});
				return;
			}
			router.replace("/(app)");
		} catch (cause) {
			setError(authErrorMessage(cause, t));
		} finally {
			setPending(false);
		}
	}

	return (
		<AuthScreen
			title={t("auth_sign_in_title")}
			subtitle={t("auth_sign_in_subtitle")}
			footer={
				<Text style={{ color: colors.muted }}>
					{t("auth_no_account")}{" "}
					<Link href="/(auth)/register" style={[styles.link, { color: colors.accent }]}>
						{t("auth_register_link")}
					</Link>
				</Text>
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
				label={t("auth_password_label")}
				value={password}
				onChangeText={setPassword}
				secureTextEntry
				autoCapitalize="none"
				autoComplete="current-password"
				textContentType="password"
				onSubmitEditing={handleSubmit}
				returnKeyType="go"
			/>

			<Link href="/(auth)/forgot-password" style={[styles.forgot, { color: colors.accent }]}>
				{t("auth_forgot_link")}
			</Link>

			<AuthButton label={t("auth_sign_in_submit")} onPress={handleSubmit} pending={pending} />

			<OAuthButtons onSignedIn={() => router.replace("/(app)")} />

			<Text style={[styles.legal, { color: colors.muted }]}>{t("auth_legal_notice")}</Text>
		</AuthScreen>
	);
}

const styles = StyleSheet.create({
	link: { fontWeight: "600" },
	forgot: { alignSelf: "flex-end", fontSize: 14 },
	legal: { fontSize: 12, textAlign: "center" },
});
