import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	define: {
		__DEV__: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
			"react-native": path.resolve(__dirname, "test/mocks/react-native.ts"),
			"expo-constants": path.resolve(__dirname, "test/mocks/expo-constants.ts"),
			// The Wyscan RN surfaces (core/analytics) import these Expo modules;
			// stub them so barrel loads resolve in the node test env.
			"expo-secure-store": path.resolve(
				__dirname,
				"test/mocks/expo-secure-store.ts",
			),
			"expo-localization": path.resolve(
				__dirname,
				"test/mocks/expo-localization.ts",
			),
			"expo-router": path.resolve(__dirname, "test/mocks/expo-router.ts"),
		},
	},
	test: {
		environment: "node",
		include: [
			"lib/**/*.test.ts",
			"components/**/*.test.ts",
			// Expo config plugins are the only way to change the gitignored native
			// Android project, so their pure helpers are unit tested here.
			"plugins/**/*.test.ts",
			// Release guards are plain .mjs so prebuild scripts can run them with
			// bare node, before any bundler exists.
			"scripts/**/*.test.mjs",
		],
	},
});
