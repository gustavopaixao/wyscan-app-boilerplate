/**
 * Authenticated route group.
 *
 * The gate is here rather than on each screen so a new screen added under
 * `(app)/` is protected by default — the safe direction for a mistake.
 */
import { Redirect, Stack } from "expo-router";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { useAuth } from "@/lib/auth/AuthContext";

export default function AppLayout() {
	const { user, ready } = useAuth();

	if (!ready) return <AuthLoadingScreen />;
	if (!user) return <Redirect href="/(auth)/login" />;

	return <Stack screenOptions={{ headerShown: false }} />;
}
