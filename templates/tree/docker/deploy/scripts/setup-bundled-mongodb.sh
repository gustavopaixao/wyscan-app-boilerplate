#!/usr/bin/env sh
# Start dedicated __PROJECT_NAME__ MongoDB (port 127.0.0.1:27019) and create __PROJECT_SLUG___user.
#
# Usage:
#   cd docker/deploy
#   export __PROJECT_CONST___MONGO_PASSWORD='optional-strong-password'
#   ./scripts/setup-bundled-mongodb.sh
#
# Then copy MONGODB_URL into .env and start the full stack:
#   docker compose -f docker-compose.yml -f docker-compose.mongodb-bundled.yml up -d

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.mongodb-bundled.yml"
MONGO_USER="${__PROJECT_CONST___MONGO_USER:-__PROJECT_SLUG___user}"
MONGO_DB="${__PROJECT_CONST___MONGO_DB:-__PROJECT_SLUG__}"
MONGO_CONTAINER="${MONGO_CONTAINER:-__PROJECT_SLUG__-mongodb}"
MONGODB_HOST_PORT="${MONGODB_HOST_PORT:-27019}"

if [ -z "${__PROJECT_CONST___MONGO_PASSWORD:-}" ]; then
  __PROJECT_CONST___MONGO_PASSWORD="$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)"
  echo "Generated __PROJECT_CONST___MONGO_PASSWORD (save this): $__PROJECT_CONST___MONGO_PASSWORD"
  echo ""
fi

export __PROJECT_CONST___MONGO_PASSWORD
export MONGO_CONTAINER
export MONGODB_URL_HOST="mongodb:27017"
export MONGODB_URL_QUERY="authSource=${MONGO_DB}"

echo "Starting __PROJECT_NAME__ MongoDB on 127.0.0.1:${MONGODB_HOST_PORT} ..."
$COMPOSE up -d mongodb

echo "Waiting for MongoDB to become healthy (up to ~2 min) ..."
TRIES=0
until $COMPOSE ps mongodb 2>/dev/null | grep -q "(healthy)"; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge 24 ]; then
    echo "MongoDB did not become healthy in time." >&2
    $COMPOSE logs mongodb --tail 30 >&2
    exit 1
  fi
  sleep 5
done
echo "MongoDB is healthy."

./scripts/setup-mongodb-user.sh

MONGODB_URL="mongodb://${MONGO_USER}:${__PROJECT_CONST___MONGO_PASSWORD}@mongodb:27017/${MONGO_DB}?authSource=${MONGO_DB}"

echo ""
echo "=== Add to .env ==="
echo "MONGODB_URL=${MONGODB_URL}"
echo ""
echo "=== Host admin access (optional) ==="
echo "mongosh \"mongodb://127.0.0.1:${MONGODB_HOST_PORT}/${MONGO_DB}\" --eval \"db.runCommand({ ping: 1 })\""
echo ""
echo "=== Start API + worker + redis ==="
echo "$COMPOSE up -d"
echo ""
echo "=== Verify ==="
echo "curl -s http://127.0.0.1:3000/api/health"
