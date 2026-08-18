import { describe, expect, it } from "vitest";
import { TAB_BAR_CONTENT_HEIGHT, tabBarMetrics } from "./tabBarMetrics";

/**
 * Required by `.claude/rules/mobile-safe-area.md`: every bottom-anchored surface
 * needs a non-zero-inset case AND a zero-inset case, so a device without a
 * navigation bar gains no dead space.
 */
describe("tabBarMetrics (edge-to-edge safe area)", () => {
	it("reserves a mocked non-zero bottom inset", () => {
		const metrics = tabBarMetrics(34);
		expect(metrics.height).toBe(TAB_BAR_CONTENT_HEIGHT + 34);
		expect(metrics.paddingBottom).toBe(34);
	});

	it("adds no extra gap on devices without a nav bar (zero inset)", () => {
		const metrics = tabBarMetrics(0);
		expect(metrics.height).toBe(TAB_BAR_CONTENT_HEIGHT);
		expect(metrics.paddingBottom).toBe(0);
	});

	// The inset must be counted exactly once. If height stopped including it the
	// bar would sit under the gesture bar; if padding stopped matching it, the
	// icons would.
	it("keeps height and padding consistent so the inset is applied once", () => {
		for (const inset of [0, 20, 34, 48]) {
			const metrics = tabBarMetrics(inset);
			expect(metrics.height - metrics.paddingBottom).toBe(TAB_BAR_CONTENT_HEIGHT);
		}
	});
});
