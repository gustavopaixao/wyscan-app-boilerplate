import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const plugin = require("./withAndroidLargeScreenOptOut.js");

const { addRestrictedResizabilityOptOut, PROPERTY_NAME } = plugin;

const findProperty = (application: Record<string, any>) =>
	(application.property ?? []).find(
		(item: any) => item?.$?.["android:name"] === PROPERTY_NAME,
	);

describe("withAndroidLargeScreenOptOut", () => {
	it("uses the manifest property name Android 16 actually reads", () => {
		expect(PROPERTY_NAME).toBe(
			"android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY",
		);
	});

	it("adds the opt-out property to an application with no properties", () => {
		const application: Record<string, any> = { $: { "android:name": ".MainApplication" } };

		addRestrictedResizabilityOptOut(application);

		expect(findProperty(application)?.$["android:value"]).toBe("true");
	});

	it("is idempotent across repeated prebuilds", () => {
		const application: Record<string, any> = {};

		addRestrictedResizabilityOptOut(application);
		addRestrictedResizabilityOptOut(application);

		expect(application.property).toHaveLength(1);
		expect(findProperty(application)?.$["android:value"]).toBe("true");
	});

	it("re-enables an existing property that was turned off", () => {
		const application: Record<string, any> = {
			property: [
				{ $: { "android:name": PROPERTY_NAME, "android:value": "false" } },
			],
		};

		addRestrictedResizabilityOptOut(application);

		expect(application.property).toHaveLength(1);
		expect(findProperty(application)?.$["android:value"]).toBe("true");
	});

	it("leaves unrelated properties alone", () => {
		const application: Record<string, any> = {
			property: [
				{ $: { "android:name": "com.example.OTHER", "android:value": "1" } },
			],
		};

		addRestrictedResizabilityOptOut(application);

		expect(application.property).toHaveLength(2);
		expect(application.property[0].$["android:name"]).toBe("com.example.OTHER");
	});
});
