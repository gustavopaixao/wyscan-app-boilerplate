/**
 * The bottom tab bar.
 *
 * Options come from `useTabChromeScreenOptions` — never the pure
 * `tabChromeScreenOptions`, whose `bottomInset` defaults to 0 and would then
 * override React Navigation's own inset handling. See
 * `.claude/rules/mobile-safe-area.md`; `tabChromeCallSites.test.ts` enforces it.
 */
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { AppMainToolbar } from "@/components/navigation/AppMainToolbar";
import { useTabChromeScreenOptions } from "@/components/navigation/NavigationChrome";
import { useStrings } from "@/lib/i18n";
import { resolveScheme } from "@/lib/theme";

export default function TabsLayout() {
	const { t } = useStrings();
	const scheme = resolveScheme(useColorScheme());
	const tabChrome = useTabChromeScreenOptions({ scheme });

	return (
		<Tabs
			screenOptions={{
				...tabChrome,
				// One shared header for every tab, so it does not re-mount on switch.
				header: () => <AppMainToolbar />,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: t("nav_tab_home"),
					tabBarButtonTestID: "tab-home",
					tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
				}}
			/>
			<Tabs.Screen
				name="explore"
				options={{
					title: t("nav_tab_explore"),
					tabBarButtonTestID: "tab-explore",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="compass-outline" color={color} size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: t("nav_tab_profile"),
					tabBarButtonTestID: "tab-profile",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="person-outline" color={color} size={size} />
					),
				}}
			/>
		</Tabs>
	);
}
