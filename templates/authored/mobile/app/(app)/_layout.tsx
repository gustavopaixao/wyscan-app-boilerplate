/**
 * Authenticated route group.
 *
 * A Stack that hosts the tab navigator plus any screen pushed above it. The
 * gate lives here rather than on each screen, so a screen added under `(app)/`
 * is protected by default — the safe direction for a mistake.
 */
import { Redirect, Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { useAuth } from "@/lib/auth/AuthContext";
import { resolveScheme, screenChromeOptions } from "@/lib/theme";

export default function AppLayout() {
	const { user, ready } = useAuth();
	const scheme = resolveScheme(useColorScheme());

	if (!ready) return <AuthLoadingScreen />;
	if (!user) return <Redirect href="/(auth)/login" />;

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				...screenChromeOptions(scheme),
			}}
		>
			{/* The tab navigator. Pushed screens are declared alongside it. */}
			<Stack.Screen name="(tabs)" />
		</Stack>
	);
}
