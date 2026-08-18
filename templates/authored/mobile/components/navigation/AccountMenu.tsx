/**
 * The account menu, anchored under the toolbar avatar.
 *
 * This is where sign-out lives on mobile — not on a settings screen. It is the
 * action users look for next to their own avatar, and burying it costs support
 * tickets.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth/AuthContext";
import { useStrings } from "@/lib/i18n";
import { appColors, radii, resolveScheme, typography } from "@/lib/theme";

type Props = {
	visible: boolean;
	onClose: () => void;
};

export function AccountMenu({ visible, onClose }: Props) {
	const { t } = useStrings();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const scheme = resolveScheme(useColorScheme());
	const c = appColors(scheme);
	const { signOut } = useAuth();

	function go(path: string) {
		onClose();
		router.push(path);
	}

	async function onSignOut() {
		onClose();
		await signOut();
		// `replace`, not `push`: the app must not be reachable via Back once the
		// session is gone.
		router.replace("/(auth)/login");
	}

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			{/* Full-screen dismiss target behind the panel. */}
			<Pressable
				style={[StyleSheet.absoluteFill, styles.backdrop]}
				accessibilityRole="button"
				accessibilityLabel={t("nav_menu_close")}
				onPress={onClose}
			/>

			<View
				style={[
					styles.panel,
					{
						top: insets.top + 48,
						backgroundColor: c.elevatedSurface,
						borderColor: c.border,
						borderRadius: radii.menu,
					},
				]}
			>
				<MenuRow icon="person-outline" label={t("nav_menu_profile")} onPress={() => go("/(app)/(tabs)/profile")} />
				<MenuRow icon="settings-outline" label={t("nav_menu_settings")} onPress={() => go("/(app)/(tabs)/profile")} />

				<View style={[styles.divider, { backgroundColor: c.border }]} />

				<MenuRow
					icon="log-out-outline"
					label={t("auth_sign_out")}
					color={c.error}
					onPress={() => void onSignOut()}
					testID="account-menu-sign-out"
				/>
			</View>
		</Modal>
	);
}

function MenuRow({
	icon,
	label,
	onPress,
	color,
	testID,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	onPress: () => void;
	color?: string;
	testID?: string;
}) {
	const c = appColors(resolveScheme(useColorScheme()));
	const tint = color ?? c.foreground;

	return (
		<Pressable
			testID={testID}
			onPress={onPress}
			accessibilityRole="menuitem"
			style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
		>
			<Ionicons name={icon} size={22} color={tint} />
			<Text style={[typography.body, styles.rowLabel, { color: tint }]}>{label}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	backdrop: { backgroundColor: "rgba(0, 0, 0, 0.38)" },
	panel: {
		position: "absolute",
		right: 12,
		minWidth: 232,
		overflow: "hidden",
		borderWidth: StyleSheet.hairlineWidth,
		paddingVertical: 6,
		...Platform.select({
			ios: {
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.22,
				shadowRadius: 16,
			},
			android: { elevation: 12 },
			default: {},
		}),
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 11,
		paddingHorizontal: 14,
	},
	rowPressed: { opacity: 0.82 },
	rowLabel: { flex: 1 },
	divider: { height: StyleSheet.hairlineWidth, marginVertical: 4, marginHorizontal: 12 },
});
