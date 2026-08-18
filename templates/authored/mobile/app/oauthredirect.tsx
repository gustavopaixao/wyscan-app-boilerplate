/**
 * Landing route for the Google OAuth redirect.
 *
 * `expo-auth-session` resolves the pending request from the deep link before
 * this ever paints, so in practice it is invisible. It exists because the
 * reversed-client-id scheme registered in `app.config.ts` points at
 * `<scheme>:/oauthredirect`, and expo-router must have a route by that name or
 * the OS deep link lands on a 404 screen.
 *
 * Deliberately at the root, NOT inside `(auth)`: the redirect arrives before a
 * session exists, and the `(auth)` layout would redirect it away mid-flow.
 */
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";

export default function OAuthRedirect() {
	return <AuthLoadingScreen />;
}
