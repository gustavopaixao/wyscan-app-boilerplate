import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LocaleProvider } from "@/lib/i18n";
import { semanticColors } from "@/lib/theme";

function RootNavigation() {
	const scheme = useColorScheme() === "dark" ? "dark" : "light";
	const colors = semanticColors(scheme);

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				contentStyle: { backgroundColor: colors.background },
			}}
		/>
	);
}

export default function RootLayout() {
	return (
		// Own the safe-area provider at the root (bugfix 0027 pattern). Without it
		// every navigator falls back to React Navigation's SafeAreaProviderCompat,
		// which seeds insets from an initialWindowMetrics snapshot that reports
		// bottom: 0 on Android under edge-to-edge.
		<SafeAreaProvider>
			<LocaleProvider>
				<RootNavigation />
			</LocaleProvider>
		</SafeAreaProvider>
	);
}
