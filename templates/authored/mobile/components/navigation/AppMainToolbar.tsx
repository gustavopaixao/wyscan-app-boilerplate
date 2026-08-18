/**
 * The shared header for the root tabs.
 *
 * Wordmark on the left, account avatar on the right. Rendered as the tab
 * navigator's `header`, so it sits above every tab and does not re-mount as the
 * user switches between them.
 */
import { useState } from "react";
import { StyleSheet, useColorScheme, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth/AuthContext";
import { useStrings } from "@/lib/i18n";
import { MIN_TOUCH_TARGET, resolveScheme } from "@/lib/theme";
import { BrandWordmark } from "@/components/ui/BrandWordmark";
import { AccountMenu } from "./AccountMenu";
import { ToolbarChromeShell } from "./NavigationChrome";
import { UserAvatar } from "./UserAvatar";

export function AppMainToolbar() {
	const { t } = useStrings();
	const insets = useSafeAreaInsets();
	const scheme = resolveScheme(useColorScheme());
	const { user } = useAuth();
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<>
			<ToolbarChromeShell scheme={scheme}>
				{/* The toolbar owns the TOP inset; the tab bar owns the bottom one. */}
				<View style={{ paddingTop: insets.top }}>
					<View style={styles.row}>
						<BrandWordmark variant="inline" />
						<View style={styles.spacer} />

						<Pressable
							testID="toolbar-open-menu"
							hitSlop={8}
							onPress={() => setMenuOpen(true)}
							accessibilityRole="button"
							accessibilityLabel={t("nav_menu_open")}
							style={styles.avatarButton}
						>
							<UserAvatar displayName={user?.displayName ?? "?"} photoUrl={user?.photoUrl} size={32} />
						</Pressable>
					</View>
				</View>
			</ToolbarChromeShell>

			<AccountMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
		</>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingBottom: 8,
		minHeight: MIN_TOUCH_TARGET,
	},
	spacer: { flex: 1 },
	avatarButton: {
		minWidth: MIN_TOUCH_TARGET,
		minHeight: MIN_TOUCH_TARGET,
		alignItems: "center",
		justifyContent: "center",
	},
});
