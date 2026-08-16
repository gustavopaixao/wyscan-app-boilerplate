const fs = require("node:fs");
const path = require("node:path");

const { withDangerousMod } = require("@expo/config-plugins");

const BUNDLE_URL_MARKER = "// @generated __PROJECT_SLUG__-metro-host";

/** @type {import('@expo/config-plugins').ConfigPlugin<{ devHost?: string }>} */
function withIosMetroHost(config, { devHost = "__DEV_HOST__" } = {}) {
  const host = String(devHost).replace(/:\d+$/, "").trim() || "__DEV_HOST__";

  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectName =
        config.modRequest.projectName ??
        config.ios?.bundleIdentifier?.split(".").pop() ??
        "__PROJECT_NAME__";
      const appDelegatePath = path.join(
        config.modRequest.platformProjectRoot,
        projectName,
        "AppDelegate.swift",
      );

      if (!fs.existsSync(appDelegatePath)) {
        return config;
      }

      let contents = fs.readFileSync(appDelegatePath, "utf8");
      const injection = `${BUNDLE_URL_MARKER}
    RCTBundleURLProvider.sharedSettings().jsLocation = "${host}"`;

      if (contents.includes(BUNDLE_URL_MARKER)) {
        contents = contents.replace(
          /\/\/ @generated __PROJECT_SLUG__-metro-host\n\s*RCTBundleURLProvider\.sharedSettings\(\)\.jsLocation = "[^"]*"/,
          injection,
        );
      } else {
        contents = contents.replace(
          /override func bundleURL\(\) -> URL\? \{\n#if DEBUG\n/,
          `override func bundleURL() -> URL? {\n#if DEBUG\n${injection}\n`,
        );
      }

      fs.writeFileSync(appDelegatePath, contents, "utf8");
      return config;
    },
  ]);
}

module.exports = withIosMetroHost;
