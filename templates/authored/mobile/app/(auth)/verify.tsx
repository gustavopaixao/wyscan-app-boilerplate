import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, useColorScheme } from "react-native";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthFormError } from "@/components/auth/AuthFormError";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AuthTextField } from "@/components/auth/AuthTextField";
import { useAuth } from "@/lib/auth/AuthContext";
import { authErrorMessage } from "@/lib/auth/authErrors";
import { useStrings } from "@/lib/i18n";
import { semanticColors } from "@/lib/theme";

export default function VerifyScreen() {
	const { t } = useStrings();
	const router = useRouter();
	const { verifyEmail, resendCode } = useAuth();
	const colors = semanticColors(useColorScheme() === "dark" ? "dark" : "light");

	// Both login and register push here with these params.
	const params = useLocalSearchParams<{ email?: string; userId?: string }>();
	const email = params.email ?? "";
	const userId = params.userId ?? "";

	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [resending, setResending] = useState(false);

	async function handleSubmit() {
		setError(null);
		setNotice(null);
		setPending(true);
		try {
			await verifyEmail(email, code);
			// Verification returns a full session, so go straight into the app.
			router.replace("/(app)");
		} catch (cause) {
			setError(authErrorMessage(cause, t));
		} finally {
			setPending(false);
		}
	}

	async function handleResend() {
		setError(null);
		setNotice(null);
		setResending(true);
		try {
			await resendCode(userId);
			setNotice(t("auth_code_resent"));
		} catch (cause) {
			setError(authErrorMessage(cause, t));
		} finally {
			setResending(false);
		}
	}

	return (
		<AuthScreen
			title={t("auth_verify_title")}
			subtitle={t("auth_verify_subtitle", { email })}
			footer={
				<Link href="/(auth)/login" style={[styles.link, { color: colors.accent }]}>
					{t("auth_back_to_sign_in")}
				</Link>
			}
		>
			<AuthFormError message={error} />
			{notice ? <Text style={{ color: colors.muted }}>{notice}</Text> : null}

			<AuthTextField
				label={t("auth_code_label")}
				value={code}
				// Uppercase as they type so the field matches the emailed code; the
				// client normalizes again before sending.
				onChangeText={(value) => setCode(value.toUpperCase())}
				autoCapitalize="characters"
				autoCorrect={false}
				maxLength={8}
				textContentType="oneTimeCode"
				style={styles.code}
				onSubmitEditing={handleSubmit}
				returnKeyType="go"
			/>

			<AuthButton label={t("auth_verify_submit")} onPress={handleSubmit} pending={pending} />

			{userId ? (
				<AuthButton
					variant="secondary"
					label={t("auth_resend_code")}
					onPress={handleResend}
					pending={resending}
				/>
			) : null}
		</AuthScreen>
	);
}

const styles = StyleSheet.create({
	link: { fontWeight: "600" },
	code: { letterSpacing: 6, fontSize: 20 },
});
