/**
 * Toolbar for pushed (non-tab) screens: back, centred title, optional trailing.
 *
 * The trailing slot falls back to an empty spacer of the same width as the back
 * button so the title stays optically centred whether or not there is an action.
 */
import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStrings } from "@/lib/i18n";
import { MIN_TOUCH_TARGET, appColors, resolveScheme, typography } from "@/lib/theme";
import { ToolbarBackButton } from "@/components/ui/ToolbarBackButton";
import { ToolbarChromeShell } from "./NavigationChrome";

type Props = {
	title: string;
	subtitle?: string;
	trailing?: ReactNode;
	onBack?: () => void;
};

export function StackScreenToolbar({ title, subtitle, trailing, onBack }: Props) {
	const { t } = useStrings();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const scheme = resolveScheme(useColorScheme());
	const c = appColors(scheme);

	return (
		<ToolbarChromeShell scheme={scheme}>
			<View style={{ paddingTop: insets.top }}>
				<View style={styles.row}>
					<ToolbarBackButton
						accessibilityLabel={t("nav_toolbar_back")}
						onPress={onBack ?? (() => router.back())}
					/>

					<View style={styles.titleColumn}>
						<Text
							accessibilityRole="header"
							numberOfLines={1}
							style={[typography.body, styles.title, { color: c.foreground }]}
						>
							{title}
						</Text>
						{subtitle ? (
							<Text numberOfLines={1} style={[typography.caption, { color: c.muted }]}>
								{subtitle}
							</Text>
						) : null}
					</View>

					{trailing ?? <View style={styles.trailingSpacer} />}
				</View>
			</View>
		</ToolbarChromeShell>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingBottom: 8,
		minHeight: MIN_TOUCH_TARGET,
	},
	titleColumn: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
	title: { fontWeight: "600" },
	trailingSpacer: { minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET },
});
