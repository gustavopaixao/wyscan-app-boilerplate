/**
 * Unauthenticated route group.
 *
 * Redirects anyone who already has a session — otherwise a signed-in user could
 * reach sign-in via Back and end up in an inconsistent state.
 */
import { Redirect, Stack } from "expo-router";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { useAuth } from "@/lib/auth/AuthContext";

export default function AuthLayout() {
	const { user, ready } = useAuth();

	if (!ready) return <AuthLoadingScreen />;
	if (user) return <Redirect href="/(app)" />;

	return <Stack screenOptions={{ headerShown: false }} />;
}
