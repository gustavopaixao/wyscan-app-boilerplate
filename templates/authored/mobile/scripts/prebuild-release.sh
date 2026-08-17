#!/bin/sh
# Regenerate the native projects for a store build.
#
# ios/ and android/ are gitignored build output, not source. This script deletes
# and re-creates them from app.config.ts on every run, so a stale native dir can
# never silently ship. Called by the Fastlane lanes and by `make mobile-prebuild`.
#
# Usage: sh scripts/prebuild-release.sh [ios|android|all]
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${VERSION:-}" ]; then
  VERSION="$(node -p "JSON.parse(require('fs').readFileSync('package.json','utf8')).version")"
fi
if [ -z "${BUILD:-}" ]; then
  BUILD="$(node -p "JSON.parse(require('fs').readFileSync('package.json','utf8')).buildNumber || 1")"
fi

node -e "
  const v = process.argv[1];
  const b = process.argv[2];
  if (!/^\d+\.\d+\.\d+\$/.test(v)) {
    console.error('Invalid mobile/package.json version:', v);
    process.exit(1);
  }
  if (!/^\d+\$/.test(b) || Number(b) < 1) {
    console.error('Invalid mobile/package.json buildNumber:', b);
    process.exit(1);
  }
" "$VERSION" "$BUILD"

# app.config.ts reads these to set the native version / build number.
export APP_VERSION="$VERSION"
export APP_BUILD_NUMBER="$BUILD"
export APP_VERSION_CODE="$BUILD"

if [ -z "${EXPO_PUBLIC_API_URL:-}" ]; then
  echo "EXPO_PUBLIC_API_URL is required (must be HTTPS for store builds)" >&2
  exit 1
fi

case "$EXPO_PUBLIC_API_URL" in
  http://*)
    echo "EXPO_PUBLIC_API_URL must use HTTPS for store builds: $EXPO_PUBLIC_API_URL" >&2
    exit 1
    ;;
esac

# Run `pod install` under the Ruby pinned by mobile/.ruby-version rather than
# whatever `pod` happens to be first on PATH. Some Homebrew Ruby + CocoaPods
# combinations write incomplete prebuilt xcframeworks (a missing
# <framework>.xcframework/Info.plist for hermes-engine, Firebase, ...), which
# fails the archive with an unrelated-looking error.
resolve_pod_bin() {
  if [ -x "$HOME/.rbenv/shims/pod" ]; then
    printf '%s\n' "$HOME/.rbenv/shims/pod"
  elif [ -x /opt/homebrew/bin/pod ]; then
    printf '%s\n' /opt/homebrew/bin/pod
  elif [ -x /usr/local/bin/pod ]; then
    printf '%s\n' /usr/local/bin/pod
  elif command -v pod >/dev/null 2>&1; then
    command -v pod
  else
    echo "CocoaPods (pod) not found. Install with: brew install cocoapods" >&2
    return 1
  fi
}

install_ios_pods() {
  [ -f ios/Podfile ] || {
    echo "ios/Podfile not found after prebuild" >&2
    exit 1
  }
  POD_BIN="$(resolve_pod_bin)" || exit 1
  POD_RUBY_VERSION="$(cat "$ROOT/.ruby-version" 2>/dev/null || true)"
  echo "Running pod install (pod: $POD_BIN, RBENV_VERSION=${POD_RUBY_VERSION:-unset})..."
  (
    cd ios
    if [ -n "$POD_RUBY_VERSION" ]; then
      export RBENV_VERSION="$POD_RUBY_VERSION"
    fi
    # Strip bundler's env so the rbenv `pod` shim does not try to load
    # mobile/Gemfile, which pins fastlane and not cocoapods.
    env -u BUNDLE_GEMFILE -u GEMFILE -u RUBYOPT -u BUNDLER_SETUP -u BUNDLER_VERSION -u BUNDLE_BIN_PATH \
      "$POD_BIN" install
  )
}

PLATFORM="${1:-all}"
case "$PLATFORM" in
  ios)
    rm -rf ios
    pnpm exec expo prebuild --platform ios --no-install
    install_ios_pods
    ;;
  android)
    rm -rf android
    pnpm exec expo prebuild --platform android --no-install
    ;;
  all)
    rm -rf ios android
    pnpm exec expo prebuild --no-install
    install_ios_pods
    ;;
  *)
    echo "Usage: $0 [ios|android|all]" >&2
    exit 1
    ;;
esac

# Expo sets CFBundleVersion but leaves CURRENT_PROJECT_VERSION at 1 in the
# pbxproj, which App Store Connect rejects. Reconcile, then prove they agree.
if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "all" ]; then
  BUILD="$BUILD" node scripts/sync-ios-build-number.mjs
fi

node scripts/verify-build-number-sync.mjs --platform="$PLATFORM"

# Refuse to hand a store build a dev affordance out of fastlane/.env, which the
# Fastfile's load_dotenv feeds wholesale into the environment Metro inlines from.
node scripts/verify-release-env.mjs

echo "Prebuild complete (APP_VERSION=$APP_VERSION BUILD=$BUILD)"
