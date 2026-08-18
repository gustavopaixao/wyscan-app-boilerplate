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

export default function RegisterScreen() {
	const { t } = useStrings();
	const router = useRouter();
	const { register } = useAuth();
	const colors = semanticColors(useColorScheme() === "dark" ? "dark" : "light");

	const [displayName, setDisplayName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSubmit() {
		setError(null);
		setPending(true);
		try {
			const result = await register(email.trim(), password, displayName.trim());
			// Registration never returns a session — the account is PENDING until
			// the emailed code is confirmed.
			router.push({
				pathname: "/(auth)/verify",
				params: { email: result.email, userId: result.userId },
			});
		} catch (cause) {
			setError(authErrorMessage(cause, t));
		} finally {
			setPending(false);
		}
	}

	return (
		<AuthScreen
			title={t("auth_register_title")}
			subtitle={t("auth_register_subtitle")}
			footer={
				<Text style={{ color: colors.muted }}>
					{t("auth_have_account")}{" "}
					<Link href="/(auth)/login" style={[styles.link, { color: colors.accent }]}>
						{t("auth_sign_in_link")}
					</Link>
				</Text>
			}
		>
			<AuthFormError message={error} />

			<AuthTextField
				label={t("auth_display_name_label")}
				value={displayName}
				onChangeText={setDisplayName}
				autoCapitalize="words"
				autoComplete="name"
				textContentType="name"
			/>

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
				hint={t("auth_password_hint")}
				value={password}
				onChangeText={setPassword}
				secureTextEntry
				autoCapitalize="none"
				autoComplete="new-password"
				textContentType="newPassword"
			/>

			<AuthButton
				label={t("auth_register_submit")}
				onPress={handleSubmit}
				pending={pending}
			/>

			<OAuthButtons onSignedIn={() => router.replace("/(app)")} />

			<Text style={[styles.legal, { color: colors.muted }]}>{t("auth_legal_notice")}</Text>
		</AuthScreen>
	);
}

const styles = StyleSheet.create({
	link: { fontWeight: "600" },
	legal: { fontSize: 12, textAlign: "center" },
});
