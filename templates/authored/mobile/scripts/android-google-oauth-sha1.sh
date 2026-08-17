#!/usr/bin/env bash
# Print the Android SHA-1 fingerprints Google Sign-In needs.
#
# Google matches an Android OAuth client by package name + signing certificate
# SHA-1, so BOTH the debug key (local builds) and the upload key (store builds)
# must be registered — and once Play App Signing is on, Play's own signing key too.
#
# Usage: scripts/android-google-oauth-sha1.sh [--open]
set -euo pipefail

MOBILE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FASTLANE_ENV="${MOBILE_ROOT}/fastlane/.env"
PACKAGE_NAME="__BUNDLE_ID__"

read_env() {
  [[ -f "$FASTLANE_ENV" ]] || return 0
  grep -m1 "^$1=" "$FASTLANE_ENV" 2>/dev/null | cut -d= -f2- || true
}

ANDROID_CLIENT_ID="${EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:-$(read_env EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID)}"

echo "Package: ${PACKAGE_NAME}"
if [[ -n "$ANDROID_CLIENT_ID" ]]; then
  echo "Android OAuth client: $ANDROID_CLIENT_ID"
else
  echo "Android OAuth client: (not set — add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID to fastlane/.env)"
fi
echo ""

echo "=== Debug key (local builds / emulator) ==="
if [[ -f "${HOME}/.android/debug.keystore" ]]; then
  keytool -list -v \
    -keystore "${HOME}/.android/debug.keystore" \
    -alias androiddebugkey \
    -storepass android -keypass android 2>/dev/null | grep SHA1 || true
else
  echo "(No ~/.android/debug.keystore yet — it appears after your first Android build.)"
fi

echo ""
echo "=== Upload key (store builds) ==="
KEYSTORE_PATH="$(read_env ANDROID_KEYSTORE_PATH)"
UPLOAD_KS="${MOBILE_ROOT}/${KEYSTORE_PATH#./}"
if [[ -n "$KEYSTORE_PATH" && -f "$UPLOAD_KS" ]]; then
  KS_PASS="$(read_env ANDROID_KEYSTORE_PASSWORD)"
  KS_ALIAS="$(read_env ANDROID_KEY_ALIAS)"
  if [[ -n "$KS_PASS" && -n "$KS_ALIAS" ]]; then
    keytool -list -v \
      -keystore "$UPLOAD_KS" \
      -alias "$KS_ALIAS" \
      -storepass "$KS_PASS" 2>/dev/null | grep SHA1 || true
  else
    echo "(Set ANDROID_KEYSTORE_PASSWORD and ANDROID_KEY_ALIAS in fastlane/.env.)"
  fi
else
  echo "(No upload keystore yet — see \`make mobile-android-preflight\`.)"
fi

echo ""
echo "Register every fingerprint above in Google Cloud -> APIs & Services ->"
echo "Credentials -> your Android OAuth client -> SHA-1 certificate fingerprints."
if [[ -n "$ANDROID_CLIENT_ID" ]]; then
  PROJECT_NUM="${ANDROID_CLIENT_ID%%-*}"
  CONSOLE_URL="https://console.cloud.google.com/apis/credentials/oauthclient/${ANDROID_CLIENT_ID}?project=${PROJECT_NUM}"
  echo "Console: $CONSOLE_URL"
  if [[ "${1:-}" == "--open" ]]; then
    open "$CONSOLE_URL" 2>/dev/null || xdg-open "$CONSOLE_URL" 2>/dev/null || true
  fi
fi
