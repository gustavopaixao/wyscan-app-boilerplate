/**
 * Pure style helpers for the welcome screen (feature 0001).
 *
 * Bottom-anchored surfaces must derive their bottom padding from
 * `useSafeAreaInsets().bottom` (edge-to-edge rule; see
 * .claude/rules/mobile-safe-area.md). The inset is applied exactly once here.
 */
export const FOOTER_BASE_PADDING = 16;

export type FooterStyle = {
	paddingBottom: number;
	paddingHorizontal: number;
	alignItems: "center";
};

export function welcomeFooterStyle(bottomInset: number): FooterStyle {
	return {
		// Devices without a system nav bar report a zero inset and must gain no
		// extra gap beyond the base padding.
		paddingBottom: FOOTER_BASE_PADDING + bottomInset,
		paddingHorizontal: 24,
		alignItems: "center",
	};
}
