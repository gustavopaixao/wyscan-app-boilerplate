const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const wyscanRNRoot = path.resolve(projectRoot, "../../__ECOSYSTEM_DIR__/DesignSystem/WyscanReactNative");
// 0207 — file-linked raw-TSX Wyscan capability surfaces (consumed via Metro).
const coreRNRoot = path.resolve(
  projectRoot,
  "../../__ECOSYSTEM_DIR__/Packages/packages/wyscan-core/mobile/react-native",
);
const analyticsRNRoot = path.resolve(
  projectRoot,
  "../../__ECOSYSTEM_DIR__/Packages/packages/wyscan-analytics/mobile/react-native",
);

const config = getDefaultConfig(projectRoot);
config.watchFolders = [...config.watchFolders, wyscanRNRoot, coreRNRoot, analyticsRNRoot];

// Always bundle live sources (pnpm file: can leave a stale copy under node_modules).
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "wyscan-react-native": wyscanRNRoot,
  "__NPM_SCOPE__/core-react-native": coreRNRoot,
  "__NPM_SCOPE__/analytics-react-native": analyticsRNRoot,
};

module.exports = config;
