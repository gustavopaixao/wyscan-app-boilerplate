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

export default function VerifyScreen() {
	const { t } = useStrings();
	const router = useRouter();
	const c = appColors(resolveScheme(useColorScheme()));
	const { verifyEmail, resendCode } = useAuth();

	// Both sign-in and register push here with these.
	const params = useLocalSearchParams<{ email?: string; userId?: string }>();
	const email = params.email ?? "";
	const userId = params.userId ?? "";

	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [resending, setResending] = useState(false);

	async function onVerify() {
		setError(null);
		setNotice(null);
		setBusy(true);
		try {
			await verifyEmail(email, code);
			// Verification returns a full session, so go straight in.
			router.replace("/(app)/(tabs)");
		} catch (cause) {
			setError(authErrorMessage(cause, t));
		} finally {
			setBusy(false);
		}
	}

	async function onResend() {
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
		<AuthScreen>
			<AuthBrandLogo />

			<Text style={[typography.titleLarge, styles.title, { color: c.foreground }]}>
				{t("auth_verify_title")}
			</Text>
			<Text style={[typography.bodySmall, styles.hint, { color: c.muted }]}>
				{t("auth_verify_subtitle", { email })}
			</Text>

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
				inputStyle={styles.code}
			/>

			{notice ? (
				<Text style={[typography.caption, styles.notice, { color: c.success }]}>{notice}</Text>
			) : null}
			{error ? (
				<Text
					accessibilityRole="alert"
					style={[typography.caption, styles.error, { color: c.error }]}
				>
					{error}
				</Text>
			) : null}

			<PrimaryButton title={t("auth_verify_submit")} onPress={() => void onVerify()} loading={busy} />

			{userId ? (
				<>
					<View style={styles.gap} />
					<SecondaryButton
						title={t("auth_resend_code")}
						onPress={() => void onResend()}
						disabled={resending}
					/>
				</>
			) : null}

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
	notice: { marginBottom: 12 },
	error: { marginBottom: 12 },
	gap: { height: BUTTON_STACK_GAP },
});
