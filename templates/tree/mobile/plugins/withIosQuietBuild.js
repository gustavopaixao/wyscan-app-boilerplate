const fs = require("node:fs");
const path = require("node:path");

const { withDangerousMod, withPodfile } = require("@expo/config-plugins");
const {
  mergeContents,
  removeContents,
} = require("@expo/config-plugins/build/utils/generateCode");

const PODFILE_TAG = "__PROJECT_SLUG__-ios-quiet-build";
const PODFILE_LINK_TAG = "__PROJECT_SLUG__-ios-cocoapods-link";
const XCODE_ENV_TAG = "__PROJECT_SLUG__-hermes-quiet";

const HERMES_WRAPPER = `#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -n "\${PODS_ROOT:-}" && -x "\${PODS_ROOT}/hermes-engine/destroot/bin/hermesc" ]]; then
  HERMESC="\${PODS_ROOT}/hermes-engine/destroot/bin/hermesc"
elif [[ -x "\${SCRIPT_DIR}/../Pods/hermes-engine/destroot/bin/hermesc" ]]; then
  HERMESC="\${SCRIPT_DIR}/../Pods/hermes-engine/destroot/bin/hermesc"
else
  echo "hermesc-quiet: hermesc not found (PODS_ROOT=\${PODS_ROOT:-unset})" >&2
  exit 1
fi
exec "\${HERMESC}" -w "$@"
`;

function addPodfileCocoapodsLinkFix(src) {
  if (src.includes("install! 'cocoapods', :deterministic_uuids => false")) {
    return { contents: src, didMerge: false, didClear: false };
  }
  return mergeContents({
    tag: PODFILE_LINK_TAG,
    src,
    newSrc: "install! 'cocoapods', :deterministic_uuids => false",
    anchor: /^prepare_react_native_project!/m,
    offset: 0,
    comment: "#",
  });
}

function removePodfileCocoapodsLinkFix(src) {
  return removeContents({ tag: PODFILE_LINK_TAG, src });
}

function addPodfileQuietPostInstall(src) {
  return mergeContents({
    tag: PODFILE_TAG,
    src,
    newSrc: `    def append_build_flag(settings, key, flag)
      value = settings[key]
      if value.is_a?(Array)
        settings[key] << flag unless value.include?(flag)
      elsif value.nil? || value.to_s.strip.empty?
        settings[key] = ['$(inherited)', flag]
      elsif value.to_s.include?(flag)
        return
      else
        settings[key] = "#{value} #{flag}"
      end
    end

    def apply_nullability_warning_suppression(config)
      config.build_settings['CLANG_WARN_NULLABILITY_COMPLETENESS'] = 'NO'
      append_build_flag(config.build_settings, 'WARNING_CFLAGS', '-Wno-nullability-completeness')
      append_build_flag(config.build_settings, 'OTHER_CFLAGS', '-Wno-nullability-completeness')
      append_build_flag(config.build_settings, 'OTHER_SWIFT_FLAGS', '-Xcc')
      append_build_flag(config.build_settings, 'OTHER_SWIFT_FLAGS', '-Wno-nullability-completeness')
    end

    # fmt 11.0.2's base.h has no #ifndef guard around FMT_USE_CONSTEVAL, so a -D
    # override is silently overwritten and Xcode 26's clang forces the consteval
    # path on (which it then miscompiles: "call to consteval function ... is not a
    # constant expression"). Patch the source to force consteval off (idempotent).
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      original = File.read(fmt_base)
      patched = original.gsub('#  define FMT_USE_CONSTEVAL 1', '#  define FMT_USE_CONSTEVAL 0')
      if patched != original
        File.chmod(0o644, fmt_base) # pods are downloaded read-only
        File.write(fmt_base, patched)
      end
    end

    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['GCC_WARN_INHIBIT_ALL_WARNINGS'] = 'YES'
        config.build_settings['SWIFT_SUPPRESS_WARNINGS'] = 'YES'
        # Xcode 26: Firebase deps (PromisesObjC/Swift 9.0, leveldb 11.0, SDWebImage 9.0)
        # build below the app target and implicitly link the private SwiftUICore
        # framework, which the linker rejects. Normalize every pod to the app minimum.
        current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || current.to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
        # fmt 11.0.2 (vendored by RCT-Folly) auto-enables consteval format-string
        # checking for modern Apple clang, but Xcode 26's clang rejects fmt's own
        # consteval calls ("not a constant expression"). Disable it consistently on
        # every target (ODR-safe) so React Native builds from source.
        append_build_flag(config.build_settings, 'GCC_PREPROCESSOR_DEFINITIONS', 'FMT_USE_CONSTEVAL=0')
        # react-native-firebase + use_frameworks! :linkage => :static builds each
        # pod as a Clang module; modules don't export C macros, so RCT_EXPORT_METHOD
        # (from <React/RCTBridgeModule.h>) fails to expand inside RNFB targets. Allow
        # the non-modular React include so the header is textual and the macro expands.
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        # The RNFB ObjC targets (no @import usage) still resolve React types through
        # module imports, hitting "must be imported from module before it is required"
        # under Xcode's explicit modules. Disable modules for RNFB so all React/RNFB
        # headers are included textually and RCT_EXPORT_METHOD expands.
        if target.name.start_with?('RNFB')
          config.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
        end
        apply_nullability_warning_suppression(config)
      end
    end
    installer.aggregate_targets.each do |aggregate_target|
      aggregate_target.user_project.build_configurations.each do |config|
        apply_nullability_warning_suppression(config)
      end
      aggregate_target.user_project.native_targets.each do |target|
        target.build_configurations.each do |config|
          config.build_settings['GCC_WARN_UNUSED_VARIABLE'] = 'NO'
          append_build_flag(config.build_settings, 'GCC_PREPROCESSOR_DEFINITIONS', 'FMT_USE_CONSTEVAL=0')
          apply_nullability_warning_suppression(config)
        end
      end
      aggregate_target.user_project.save
    end`,
    anchor: /:ccache_enabled => ccache_enabled\?\(podfile_properties\)/,
    offset: 2,
    comment: "#",
  });
}

function removePodfileQuietPostInstall(src) {
  return removeContents({ tag: PODFILE_TAG, src });
}

function addXcodeEnvHermesWrapper(src) {
  return mergeContents({
    tag: XCODE_ENV_TAG,
    src,
    newSrc: `_XCODE_ENV_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]:-\$0}")" && pwd)"
export HERMES_CLI_PATH="\$_XCODE_ENV_DIR/scripts/hermesc-quiet.sh"`,
    anchor: /export NODE_BINARY/,
    offset: 1,
    comment: "#",
  });
}

function removeXcodeEnvHermesWrapper(src) {
  return removeContents({ tag: XCODE_ENV_TAG, src });
}

/** @type {import('@expo/config-plugins').ConfigPlugin} */
function withIosQuietBuild(config) {
  config = withPodfile(config, (config) => {
    let contents = config.modResults.contents;
    const linkResult = addPodfileCocoapodsLinkFix(contents);
    if (linkResult.didMerge || linkResult.didClear) {
      contents = linkResult.contents;
    }
    const result = addPodfileQuietPostInstall(contents);
    if (result.didMerge || result.didClear) {
      config.modResults.contents = result.contents;
    } else if (linkResult.didMerge || linkResult.didClear) {
      config.modResults.contents = contents;
    }
    return config;
  });

  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const scriptsDir = path.join(iosRoot, "scripts");
      fs.mkdirSync(scriptsDir, { recursive: true });
      const wrapperPath = path.join(scriptsDir, "hermesc-quiet.sh");
      fs.writeFileSync(wrapperPath, HERMES_WRAPPER, { encoding: "utf8", mode: 0o755 });

      const xcodeEnvPath = path.join(iosRoot, ".xcode.env");
      const xcodeEnv = fs.existsSync(xcodeEnvPath)
        ? fs.readFileSync(xcodeEnvPath, "utf8")
        : "";
      const merged = addXcodeEnvHermesWrapper(xcodeEnv);
      fs.writeFileSync(xcodeEnvPath, merged.contents, "utf8");

      const devHost =
        process.env.EXPO_PUBLIC_DEV_HOST?.trim() ||
        process.env.__PROJECT_CONST___DEV_HOST?.trim() ||
        "__DEV_HOST__";
      const packagerHost = devHost.replace(/:\d+$/, "");
      const xcodeEnvLocalPath = path.join(iosRoot, ".xcode.env.local");
      fs.writeFileSync(
        xcodeEnvLocalPath,
        `# __PROJECT_NAME__: Metro host for physical devices (not localhost)\nexport REACT_NATIVE_PACKAGER_HOSTNAME=${packagerHost}\n`,
        "utf8",
      );

      return config;
    },
  ]);

  return config;
}

module.exports = withIosQuietBuild;
module.exports.addPodfileQuietPostInstall = addPodfileQuietPostInstall;
module.exports.removePodfileQuietPostInstall = removePodfileQuietPostInstall;
module.exports.addXcodeEnvHermesWrapper = addXcodeEnvHermesWrapper;
module.exports.removeXcodeEnvHermesWrapper = removeXcodeEnvHermesWrapper;
