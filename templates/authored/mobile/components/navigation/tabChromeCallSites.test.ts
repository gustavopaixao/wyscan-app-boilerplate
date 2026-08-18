import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard required by `.claude/rules/mobile-safe-area.md`.
 *
 * Every tab layout must build its options with `useTabChromeScreenOptions`, not
 * the pure `tabChromeScreenOptions` — the latter defaults `bottomInset` to 0 and
 * then overrides React Navigation's own inset handling on BOTH platforms, which
 * silently clips the tab labels. The mistake is invisible in review and only
 * shows on a device, so it is asserted here instead.
 */
const APP_DIR = join(__dirname, "..", "..", "app");

function tabLayouts(dir: string, found: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			tabLayouts(path, found);
		} else if (entry === "_layout.tsx" && readFileSync(path, "utf8").includes("<Tabs")) {
			found.push(path);
		}
	}
	return found;
}

describe("tab chrome call sites", () => {
	const layouts = tabLayouts(APP_DIR);

	it("finds at least one tab layout to check", () => {
		expect(layouts.length).toBeGreaterThan(0);
	});

	it("every tab layout uses the hook, never the raw options builder", () => {
		const offenders = layouts.filter((path) => {
			const source = readFileSync(path, "utf8");
			const usesHook = source.includes("useTabChromeScreenOptions");
			// Allow the hook's own name to contain the raw name as a substring.
			const usesRaw = /[^e]tabChromeScreenOptions\(/.test(source);
			return !usesHook || usesRaw;
		});

		expect(offenders).toEqual([]);
	});
});
