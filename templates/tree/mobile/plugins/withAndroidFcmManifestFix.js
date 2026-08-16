const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

// expo-notifications and @react-native-firebase/messaging both declare the same FCM
// default-notification meta-data with different values, so the Android manifest merger
// fails at :app:processReleaseMainManifest ("also present at [:react-native-firebase_messaging]").
// Mark our app-level declarations as the winner with tools:replace so they override the
// library defaults instead of conflicting. Maps each meta-data name to the value attribute
// the merger reports as duplicated.
const META_DATA_REPLACE = {
  "com.google.firebase.messaging.default_notification_channel_id": "android:value",
  "com.google.firebase.messaging.default_notification_color": "android:resource",
};

const TOOLS_NAMESPACE = "http://schemas.android.com/tools";

function ensureToolsNamespace(androidManifest) {
  androidManifest.manifest.$ = androidManifest.manifest.$ || {};
  if (!androidManifest.manifest.$["xmlns:tools"]) {
    androidManifest.manifest.$["xmlns:tools"] = TOOLS_NAMESPACE;
  }
}

function addToolsReplace(metaDataItem, attribute) {
  metaDataItem.$ = metaDataItem.$ || {};
  const existing = metaDataItem.$["tools:replace"];
  const parts = existing
    ? existing.split(",").map((part) => part.trim()).filter(Boolean)
    : [];
  if (!parts.includes(attribute)) {
    parts.push(attribute);
  }
  metaDataItem.$["tools:replace"] = parts.join(",");
}

/** @type {import('@expo/config-plugins').ConfigPlugin} */
function withAndroidFcmManifestFix(config) {
  return withAndroidManifest(config, (config) => {
    ensureToolsNamespace(config.modResults);
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    for (const item of application["meta-data"] ?? []) {
      const name = item.$?.["android:name"];
      const attribute = name ? META_DATA_REPLACE[name] : undefined;
      if (attribute) {
        addToolsReplace(item, attribute);
      }
    }
    return config;
  });
}

module.exports = withAndroidFcmManifestFix;
module.exports.addToolsReplace = addToolsReplace;
