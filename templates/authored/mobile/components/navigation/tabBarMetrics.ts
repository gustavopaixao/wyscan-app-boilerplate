/**
 * Tab-bar geometry — pure, so the safe-area arithmetic is unit-testable without
 * a navigator, a renderer or any Expo module. `NavigationChrome.tsx` is the only
 * consumer; it exists separately for exactly the same reason
 * `welcomeScreenStyles.ts` does.
 */

/** React Navigation's tab-bar content height, excluding any safe-area inset. */
export const TAB_BAR_CONTENT_HEIGHT = 49;

export type TabBarMetrics = {
	height: number;
	paddingBottom: number;
};

/**
 * Because a custom `tabBarStyle` is merged LAST, these values replace whatever
 * React Navigation would have derived from the safe area. The bar therefore has
 * to reserve the inset itself — and, as a consequence,
 * `useBottomTabBarHeight()` already includes it, so tab content must NOT add
 * `insets.bottom` again.
 *
 * @param bottomInset `useSafeAreaInsets().bottom`; 0 on a device with no gesture bar.
 */
export function tabBarMetrics(bottomInset: number): TabBarMetrics {
	return {
		height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
		paddingBottom: bottomInset,
	};
}
