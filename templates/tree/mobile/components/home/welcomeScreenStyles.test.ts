import { describe, expect, it } from "vitest";
import {
	FOOTER_BASE_PADDING,
	welcomeFooterStyle,
} from "./welcomeScreenStyles";

describe("welcomeFooterStyle (edge-to-edge safe area)", () => {
	it("adds a mocked non-zero bottom inset to the footer padding", () => {
		const style = welcomeFooterStyle(24);
		expect(style.paddingBottom).toBe(FOOTER_BASE_PADDING + 24);
	});

	it("adds no extra gap on devices without a nav bar (zero inset)", () => {
		const style = welcomeFooterStyle(0);
		expect(style.paddingBottom).toBe(FOOTER_BASE_PADDING);
	});
});
