/**
 * Options spread into every navigator in the app.
 *
 * Two jobs:
 *
 * - Paint the scene background from the palette. Without it a navigator shows
 *   React Navigation's own default (white) for a frame during transitions,
 *   which flashes badly in dark mode.
 * - `freezeOnBlur` — stop rendering screens that are not visible. This is also
 *   load-bearing beyond performance: it keeps blurred screens from re-rendering
 *   against a navigator that is being torn down.
 */
import type { ColorSchemeName } from "./colors";
import { appColors } from "./appColors";

export function screenChromeOptions(scheme: ColorSchemeName) {
	const background = appColors(scheme).background;
	return {
		contentStyle: { backgroundColor: background },
		sceneStyle: { backgroundColor: background },
		freezeOnBlur: true,
	} as const;
}
