#!/usr/bin/env bash
# Verify push notification API wiring locally (Tier 1 / Tier 3).
# Usage:
#   ACCESS_TOKEN=eyJ... ./scripts/verify-push-local.sh
#   ACCESS_TOKEN=eyJ... API_BASE=http://__DEV_HOST__:8080 ./scripts/verify-push-local.sh --send-test
set -euo pipefail

API_BASE="${API_BASE:-http://__DEV_HOST__:8080}"
SEND_TEST=0

for arg in "$@"; do
  case "$arg" in
    --send-test) SEND_TEST=1 ;;
    -h|--help)
      echo "Usage: ACCESS_TOKEN=... [API_BASE=...] $0 [--send-test]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${ACCESS_TOKEN:-}" ]]; then
  echo "Set ACCESS_TOKEN to a logged-in user JWT." >&2
  exit 1
fi

auth_header=(-H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "== GET /api/v1/me/notification-preferences"
curl -sS "${auth_header[@]}" "${API_BASE}/api/v1/me/notification-preferences"
echo

echo "== POST /api/v1/device-tokens (sample payload)"
curl -sS "${auth_header[@]}" \
  -H "Content-Type: application/json" \
  -d '{"token":"local-verify-token","platform":"ios","deviceInfo":{"appVersion":"1.0.0"}}' \
  "${API_BASE}/api/v1/device-tokens"
echo

echo "== DELETE /api/v1/device-tokens (cleanup sample token)"
curl -sS "${auth_header[@]}" \
  -H "Content-Type: application/json" \
  -X DELETE \
  -d '{"token":"local-verify-token"}' \
  "${API_BASE}/api/v1/device-tokens"
echo

if [[ "$SEND_TEST" -eq 1 ]]; then
  echo "== POST /api/v1/me/test-push (dev only; requires FIREBASE_SERVICE_ACCOUNT_JSON)"
  curl -sS "${auth_header[@]}" \
    -H "Content-Type: application/json" \
    -d '{"title":"Local test","body":"Push API send path","action_url":"__PROJECT_SLUG__://profile"}' \
    "${API_BASE}/api/v1/me/test-push"
  echo
fi

echo "Done. For device registration, use a native build on a physical device (not Expo Go)."
