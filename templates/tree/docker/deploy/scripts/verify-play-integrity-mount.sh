#!/usr/bin/env sh
# Verify Play Integrity service account mount inside the API container.
# Run from docker/deploy/ after: docker compose up -d
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CONTAINER="${__PROJECT_CONST___API_CONTAINER:-__PROJECT_SLUG__-api}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container $CONTAINER is not running. Start stack first: docker compose up -d" >&2
  exit 1
fi

docker exec "$CONTAINER" test -r /run/secrets/google-play-sa.json
echo "OK  /run/secrets/google-play-sa.json is readable"

docker exec "$CONTAINER" printenv GOOGLE_PLAY_INTEGRITY_PROJECT_NUMBER GOOGLE_PLAY_INTEGRITY_PACKAGE_NAME GOOGLE_PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON

docker exec "$CONTAINER" node -e "
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('/run/secrets/google-play-sa.json', 'utf8'));
console.log('OK  service account:', j.client_email, 'project:', j.project_id);
"
