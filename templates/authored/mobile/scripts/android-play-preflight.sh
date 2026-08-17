#!/usr/bin/env bash
# Preflight for `make mobile-android-beta` — check the toolchain, credentials and
# fastlane/.env before a build that takes minutes to fail.
# See docs/runbooks/release-deploy-checklist.md
set -euo pipefail

MOBILE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FASTLANE_ENV="${MOBILE_ROOT}/fastlane/.env"
ANDROID_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
PACKAGE_NAME="__BUNDLE_ID__"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNS=0

pass() { echo -e "${GREEN}OK${NC}    $*"; }
fail() { echo -e "${RED}FAIL${NC}  $*"; ERRORS=$((ERRORS + 1)); }
warn() { echo -e "${YELLOW}WARN${NC}  $*"; WARNS=$((WARNS + 1)); }

echo "=== __PROJECT_NAME__ — Android Play preflight ==="
echo "Package: ${PACKAGE_NAME}"
echo ""

# --- Toolchain --------------------------------------------------------------
if command -v java >/dev/null 2>&1; then
  pass "Java: $(java -version 2>&1 | head -1)"
else
  fail "Java not found (install JDK 17+)"
fi

if [[ -d "$ANDROID_SDK" ]]; then
  pass "Android SDK: $ANDROID_SDK"
else
  fail "Android SDK not found (install Android Studio, or set ANDROID_HOME)"
fi

if (cd "$MOBILE_ROOT" && bundle check >/dev/null 2>&1); then
  pass "Ruby gems installed"
else
  fail "Ruby gems missing — run: cd mobile && bundle install"
fi

# --- fastlane/.env ----------------------------------------------------------
if [[ -f "$FASTLANE_ENV" ]]; then
  pass "fastlane/.env exists"
  # shellcheck disable=SC1090
  set -a && source "$FASTLANE_ENV" && set +a

  if [[ -n "${EXPO_PUBLIC_API_URL:-}" && "$EXPO_PUBLIC_API_URL" == https://* ]]; then
    pass "EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL"
  else
    fail "EXPO_PUBLIC_API_URL must be set and HTTPS in fastlane/.env"
  fi

  for var in ANDROID_KEYSTORE_PATH ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD; do
    if [[ -n "${!var:-}" ]]; then
      pass "$var set"
    else
      fail "$var missing in fastlane/.env"
    fi
  done

  if [[ -n "${EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:-}" ]]; then
    pass "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID set"
  else
    warn "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID not set (Google Sign-In will fail)"
  fi

  # --- Keystore -------------------------------------------------------------
  if [[ -n "${ANDROID_KEYSTORE_PATH:-}" ]]; then
    resolved_ks="${MOBILE_ROOT}/${ANDROID_KEYSTORE_PATH#./}"
    if [[ -f "$resolved_ks" ]]; then
      pass "Upload keystore: $resolved_ks"
    else
      fail "Upload keystore missing at $resolved_ks"
      echo "        keytool -genkey -v -keystore \"$resolved_ks\" \\"
      echo "          -alias \"${ANDROID_KEY_ALIAS:-__PROJECT_SLUG__}\" -keyalg RSA -keysize 2048 -validity 10000"
      echo "        Back it up — losing it can cost you the ability to update the app."
    fi
  fi

  # --- Play service account -------------------------------------------------
  if [[ -n "${SUPPLY_JSON_KEY_PATH:-}" ]]; then
    resolved_key="${MOBILE_ROOT}/${SUPPLY_JSON_KEY_PATH#./}"
    if [[ -f "$resolved_key" ]]; then
      pass "Play service account JSON: $resolved_key"
    else
      fail "SUPPLY_JSON_KEY_PATH set but the file is missing: $resolved_key"
      echo "        Play Console -> Setup -> API access -> service account -> download JSON"
    fi
  else
    fail "SUPPLY_JSON_KEY_PATH not set in fastlane/.env"
    echo "        Add: SUPPLY_JSON_KEY_PATH=./fastlane/play-store-key.json"
  fi
else
  fail "fastlane/.env missing — copy it from fastlane/.env.example"
fi

echo ""
echo "=== OAuth SHA-1 (register these in Google Cloud Console) ==="
"${MOBILE_ROOT}/scripts/android-google-oauth-sha1.sh" || true

echo ""
echo "=== Play Console, first release only (manual) ==="
echo "  1. Create the app at https://play.google.com/console — package ${PACKAGE_NAME}"
echo "  2. Setup -> App integrity -> enable Play App Signing"
echo "  3. Setup -> API access -> link a Cloud project -> service account -> download JSON"
echo "  4. Store listing, content rating, target audience, data safety, privacy policy URL"
echo "  5. Testing -> Internal testing -> add testers (after the first upload)"
echo ""
echo "  App icon: ${MOBILE_ROOT}/assets/icon.png"
echo "  Store listing copy lives with your marketing material, not in this repo."
echo ""
echo "  If Google Sign-In works locally but fails from a Play install, add the"
echo "  App signing SHA-1 (Play Console -> Setup -> App integrity) to the Android"
echo "  OAuth client as well — Play re-signs your upload with its own key."
echo ""

if [[ "$ERRORS" -eq 0 ]]; then
  if [[ "$WARNS" -gt 0 ]]; then
    echo -e "${YELLOW}${WARNS} warning(s).${NC}"
  fi
  echo -e "${GREEN}Ready:${NC} make mobile-android-beta"
  exit 0
fi

echo -e "${RED}${ERRORS} check(s) failed.${NC} Fix the items above before running the beta lane."
exit 1
