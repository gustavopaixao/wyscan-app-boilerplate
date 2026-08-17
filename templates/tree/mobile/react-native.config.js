const { existsSync } = require("node:fs");
const { join } = require("node:path");

// The Crashlytics pod's autolinked build phase runs FirebaseCrashlytics/run,
// which hard-fails without a GoogleService-Info.plist. Firebase config is
// optional here (see app.config.ts), so drop the phase when the files are
// missing — mirroring the config-plugin gating.
const hasFirebaseConfig =
	existsSync(join(__dirname, "google-services.json")) &&
	existsSync(join(__dirname, "GoogleService-Info.plist"));

module.exports = {
	dependencies: {
		...(hasFirebaseConfig
			? {}
			: {
					"@react-native-firebase/crashlytics": {
						platforms: {
							ios: {
								scriptPhases: [],
							},
						},
					},
				}),
	},
};
