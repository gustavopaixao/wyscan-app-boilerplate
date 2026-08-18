/**
 * Native Google and Apple sign-in.
 *
 * Renders NOTHING when neither provider is configured, so a freshly generated
 * app shows a clean email/password form instead of buttons that fail on tap.
 */
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useAuth } from "@/lib/auth/AuthContext";
import { authErrorMessage } from "@/lib/auth/authErrors";
import {
	googleAndroidClientId,
	googleIosClientId,
	googleNativeRedirectUri,
	googlePlatformClientId,
	googleWebClientId,
	isGoogleEnabled,
} from "@/lib/auth/googleOAuthConfig";
import { useStrings } from "@/lib/i18n";
import { semanticColors } from "@/lib/theme";
import { AuthButton } from "./AuthButton";
import { AuthFormError } from "./AuthFormError";

export function OAuthButtons({ onSignedIn }: { onSignedIn: () => void }) {
	const { t } = useStrings();
	const { signInWithGoogle, signInWithApple } = useAuth();
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const colors = semanticColors(scheme);

	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState<"google" | "apple" | null>(null);
	// Apple Sign In is iOS-only and unavailable on older devices/simulators.
	const [appleAvailable, setAppleAvailable] = useState(false);

	useEffect(() => {
		if (Platform.OS !== "ios") return;
		void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
	}, []);

	// The ID-token flow: we need Google's `id_token`, which the API verifies
	// against Google's JWKS. An access token would not be verifiable.
	const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
		clientId: googleWebClientId,
		iosClientId: googleIosClientId,
		androidClientId: googleAndroidClientId,
		// Must match the reversed-client-id scheme registered in app.config.ts,
		// or the OS has nowhere to deliver the result.
		redirectUri: googleNativeRedirectUri(googlePlatformClientId()),
	});

	useEffect(() => {
		if (googleResponse?.type !== "success") {
			// `dismiss`/`cancel` are the user backing out — not an error to report.
			if (googleResponse?.type === "error") setError(t("auth_error_generic"));
			if (googleResponse) setPending(null);
			return;
		}

		const idToken = googleResponse.params?.id_token;
		if (!idToken) {
			setError(t("auth_error_generic"));
			setPending(null);
			return;
		}

		void (async () => {
			try {
				await signInWithGoogle(idToken);
				onSignedIn();
			} catch (cause) {
				setError(authErrorMessage(cause, t));
			} finally {
				setPending(null);
			}
		})();
	}, [googleResponse, signInWithGoogle, onSignedIn, t]);

	async function handleApple() {
		setError(null);
		setPending("apple");
		try {
			const credential = await AppleAuthentication.signInAsync({
				requestedScopes: [
					AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
					AppleAuthentication.AppleAuthenticationScope.EMAIL,
				],
			});
			if (!credential.identityToken) throw new Error("no identity token");

			// Apple returns the name ONLY on the first authorization, so forward it
			// now or it is lost for good.
			const displayName = [credential.fullName?.givenName, credential.fullName?.familyName]
				.filter(Boolean)
				.join(" ");

			await signInWithApple(credential.identityToken, displayName || undefined);
			onSignedIn();
		} catch (cause) {
			// The user cancelling the native sheet is not a failure to report.
			if ((cause as { code?: string })?.code !== "ERR_REQUEST_CANCELED") {
				setError(authErrorMessage(cause, t));
			}
		} finally {
			setPending(null);
		}
	}

	const showApple = Platform.OS === "ios" && appleAvailable;
	if (!isGoogleEnabled && !showApple) return null;

	return (
		<View style={styles.container}>
			<View style={styles.dividerRow}>
				<View style={[styles.rule, { backgroundColor: colors.border }]} />
				<Text style={[styles.dividerLabel, { color: colors.muted }]}>
					{t("auth_or_continue_with")}
				</Text>
				<View style={[styles.rule, { backgroundColor: colors.border }]} />
			</View>

			<AuthFormError message={error} />

			{isGoogleEnabled ? (
				<AuthButton
					variant="secondary"
					label={t("auth_continue_with_google")}
					pending={pending === "google"}
					disabled={pending !== null}
					onPress={() => {
						setError(null);
						setPending("google");
						void promptGoogle();
					}}
				/>
			) : null}

			{showApple ? (
				<AuthButton
					variant="secondary"
					label={t("auth_continue_with_apple")}
					pending={pending === "apple"}
					disabled={pending !== null}
					onPress={handleApple}
				/>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { gap: 12 },
	dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
	rule: { flex: 1, height: StyleSheet.hairlineWidth },
	dividerLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
});
