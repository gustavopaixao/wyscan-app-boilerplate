/**
 * Sign in and register on one screen.
 *
 * Not tabs and not a segmented control: a full-width button whose label states
 * the destination ("Need an account? Register"). The two forms crossfade rather
 * than cutting, so the change of context is legible — swapping instantly reads
 * as a glitch when the two forms share most of their fields.
 */
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AuthBrandLogo } from "@/components/auth/AuthBrandLogo";
import { AuthLegalNotice } from "@/components/auth/AuthLegalNotice";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AuthTextField } from "@/components/ui/AuthTextField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { useAuth } from "@/lib/auth/AuthContext";
import { authErrorMessage } from "@/lib/auth/authErrors";
import { useStrings } from "@/lib/i18n";
import { BUTTON_STACK_GAP, appColors, resolveScheme, typography } from "@/lib/theme";
import { useColorScheme } from "react-native";

type AuthMode = "login" | "register";

const FADE_MS = 180;

export function LoginView({ initialMode = "login" }: { initialMode?: AuthMode }) {
	const { t } = useStrings();
	const router = useRouter();
	const c = appColors(resolveScheme(useColorScheme()));
	const { signIn, register } = useAuth();

	const [mode, setMode] = useState<AuthMode>(initialMode);
	const [displayName, setDisplayName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [transitioning, setTransitioning] = useState(false);

	const opacity = useRef(new Animated.Value(1)).current;
	// Inputs are disabled during the fade as well as during a request — tapping
	// a field that is halfway through disappearing is how you submit the form
	// you were not looking at.
	const formDisabled = busy || transitioning;

	function transitionTo(next: AuthMode) {
		if (transitioning || next === mode) return;
		setTransitioning(true);
		setError(null);

		const fade = (toValue: number) =>
			Animated.timing(opacity, {
				toValue,
				duration: FADE_MS,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			});

		fade(0).start(({ finished }) => {
			if (!finished) return;
			setMode(next);
			fade(1).start(({ finished: done }) => {
				if (done) setTransitioning(false);
			});
		});
	}

	async function onSubmit() {
		setError(null);
		setBusy(true);
		try {
			if (mode === "login") {
				const result = await signIn(email.trim(), password);
				if (result.requiresVerification) {
					router.push({
						pathname: "/(auth)/verify",
						params: { email: result.email, userId: result.userId },
					});
					return;
				}
				router.replace("/(app)/(tabs)");
				return;
			}

			const result = await register(email.trim(), password, displayName.trim());
			router.push({
				pathname: "/(auth)/verify",
				params: { email: result.email, userId: result.userId },
			});
		} catch (cause) {
			setError(authErrorMessage(cause, t));
		} finally {
			setBusy(false);
		}
	}

	const isLogin = mode === "login";

	return (
		<AuthScreen>
			<ScrollView
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scroll}
			>
				<AuthBrandLogo />

				<Animated.View
					style={{ opacity }}
					pointerEvents={formDisabled ? "none" : "auto"}
					importantForAccessibility={formDisabled ? "no-hide-descendants" : "yes"}
				>
					<Text style={[typography.titleLarge, styles.title, { color: c.foreground }]}>
						{isLogin ? t("auth_sign_in_title") : t("auth_register_title")}
					</Text>

					{isLogin ? null : (
						<AuthTextField
							label={t("auth_display_name_label")}
							value={displayName}
							onChangeText={setDisplayName}
							autoCapitalize="words"
							autoComplete="name"
							textContentType="name"
						/>
					)}

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
						hint={isLogin ? undefined : t("auth_password_hint")}
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						autoCapitalize="none"
						autoComplete={isLogin ? "current-password" : "new-password"}
						textContentType={isLogin ? "password" : "newPassword"}
						showPasswordLabel={t("auth_show_password")}
						hidePasswordLabel={t("auth_hide_password")}
					/>

					{isLogin ? (
						<Text
							accessibilityRole="link"
							onPress={() => router.push("/(auth)/forgot-password")}
							style={[typography.bodySmall, styles.forgot, { color: c.accent }]}
						>
							{t("auth_forgot_link")}
						</Text>
					) : null}

					{error ? (
						<Text
							accessibilityRole="alert"
							style={[typography.caption, styles.error, { color: c.error }]}
						>
							{error}
						</Text>
					) : null}

					<PrimaryButton
						testID="auth-submit"
						title={isLogin ? t("auth_sign_in_submit") : t("auth_register_submit")}
						onPress={() => void onSubmit()}
						loading={busy}
						disabled={formDisabled}
					/>
				</Animated.View>

				<View style={styles.gap} />

				<SecondaryButton
					testID="auth-toggle-mode"
					title={isLogin ? t("auth_go_register") : t("auth_go_login")}
					onPress={() => transitionTo(isLogin ? "register" : "login")}
					disabled={formDisabled}
				/>

				<OAuthButtons
					disabled={formDisabled}
					onSignedIn={() => router.replace("/(app)/(tabs)")}
				/>

				<AuthLegalNotice mode={mode} />
			</ScrollView>
		</AuthScreen>
	);
}

const styles = StyleSheet.create({
	scroll: { flexGrow: 1, paddingBottom: 24 },
	title: { marginBottom: 24 },
	forgot: { alignSelf: "flex-end", marginTop: 4, marginBottom: 12 },
	error: { marginBottom: 12 },
	gap: { height: BUTTON_STACK_GAP },
});
