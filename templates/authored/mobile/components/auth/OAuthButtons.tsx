/**
 * Native Google and Apple sign-in.
 *
 * Renders NOTHING when no provider is configured, so a freshly generated app
 * shows a clean email/password form rather than buttons that fail on tap.
 */
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, useColorScheme, View } from "react-native";
import { DividerWithLabel } from "@/components/ui/DividerWithLabel";
import { OAuthIconButton } from "@/components/ui/OAuthIconButton";
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
import { appColors, resolveScheme, typography } from "@/lib/theme";

type Props = {
	onSignedIn: () => void;
	disabled?: boolean;
};

export function OAuthButtons({ onSignedIn, disabled }: Props) {
	const { t } = useStrings();
	const c = appColors(resolveScheme(useColorScheme()));
	const { signInWithGoogle, signInWithApple } = useAuth();

	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState<"google" | "apple" | null>(null);
	// Apple Sign In is iOS-only and missing on older devices and simulators.
	const [appleAvailable, setAppleAvailable] = useState(false);

	useEffect(() => {
		if (Platform.OS !== "ios") return;
		void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
	}, []);

	// The ID-token flow: the API verifies Google's id_token against its JWKS, so
	// an access token would be unverifiable.
	const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
		clientId: googleWebClientId,
		iosClientId: googleIosClientId,
		androidClientId: googleAndroidClientId,
		// Must match the reversed-client-id scheme registered in app.config.ts,
		// or the OS has nowhere to deliver the result.
		redirectUri: googleNativeRedirectUri(googlePlatformClientId()),
	});

	useEffect(() => {
		if (!googleResponse) return;
		if (googleResponse.type !== "success") {
			// dismiss/cancel is the user backing out, not a failure to report.
			if (googleResponse.type === "error") setError(t("auth_error_generic"));
			setPending(null);
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

	async function onApple() {
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

			// Apple returns the name ONLY on the first authorization — forward it
			// now or it is lost for good.
			const displayName = [credential.fullName?.givenName, credential.fullName?.familyName]
				.filter(Boolean)
				.join(" ");

			await signInWithApple(credential.identityToken, displayName || undefined);
			onSignedIn();
		} catch (cause) {
			if ((cause as { code?: string })?.code !== "ERR_REQUEST_CANCELED") {
				setError(authErrorMessage(cause, t));
			}
		} finally {
			setPending(null);
		}
	}

	const showApple = Platform.OS === "ios" && appleAvailable;
	if (!isGoogleEnabled && !showApple) return null;

	const busy = disabled || pending !== null;

	return (
		<View>
			<DividerWithLabel label={t("auth_or_continue_with")} />

			{error ? (
				<Text
					accessibilityRole="alert"
					style={[typography.caption, styles.error, { color: c.error }]}
				>
					{error}
				</Text>
			) : null}

			<View style={styles.row}>
				{isGoogleEnabled ? (
					<OAuthIconButton
						testID="oauth-google"
						accessibilityLabel={t("auth_continue_with_google")}
						loading={pending === "google"}
						disabled={busy}
						onPress={() => {
							setError(null);
							setPending("google");
							void promptGoogle();
						}}
					>
						<Ionicons name="logo-google" size={22} color={c.foreground} />
					</OAuthIconButton>
				) : null}

				{showApple ? (
					<OAuthIconButton
						testID="oauth-apple"
						accessibilityLabel={t("auth_continue_with_apple")}
						loading={pending === "apple"}
						disabled={busy}
						onPress={() => void onApple()}
					>
						<Ionicons name="logo-apple" size={22} color={c.foreground} />
					</OAuthIconButton>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16 },
	error: { marginBottom: 12, textAlign: "center" },
});
