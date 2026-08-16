#!/usr/bin/env sh
# Create __PROJECT_NAME__ MongoDB user on an existing MongoDB container.
#
# Usage (no auth on MongoDB yet):
#   export __PROJECT_CONST___MONGO_PASSWORD='your-strong-password'
#   ./scripts/setup-mongodb-user.sh
#
# Usage (MongoDB already has admin auth):
#   export __PROJECT_CONST___MONGO_PASSWORD='your-strong-password'
#   export MONGO_ADMIN_USER=admin
#   export MONGO_ADMIN_PASSWORD='admin-password'
#   ./scripts/setup-mongodb-user.sh
#
# Optional: MONGO_CONTAINER (default stiksy-mongodb-staging)

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

MONGO_CONTAINER="${MONGO_CONTAINER:-stiksy-mongodb-staging}"
MONGO_USER="${__PROJECT_CONST___MONGO_USER:-__PROJECT_SLUG___user}"
MONGO_PASSWORD="${__PROJECT_CONST___MONGO_PASSWORD:?Set __PROJECT_CONST___MONGO_PASSWORD}"
MONGO_DB="${__PROJECT_CONST___MONGO_DB:-__PROJECT_SLUG__}"
MONGO_ADMIN_USER="${MONGO_ADMIN_USER:-}"
MONGO_ADMIN_PASSWORD="${MONGO_ADMIN_PASSWORD:-}"
# Host printed in connection string: bundled stack uses mongodb:27017; external host port uses host.docker.internal:PORT
MONGODB_URL_HOST="${MONGODB_URL_HOST:-host.docker.internal:27018}"
MONGODB_URL_QUERY="${MONGODB_URL_QUERY:-authSource=${MONGO_DB}}"

if ! docker ps --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER"; then
  echo "MongoDB container not running: $MONGO_CONTAINER" >&2
  echo "Set MONGO_CONTAINER or start the container, then retry." >&2
  exit 1
fi

MONGOSH_AUTH=""
if [ -n "$MONGO_ADMIN_USER" ]; then
  if [ -z "$MONGO_ADMIN_PASSWORD" ]; then
    echo "MONGO_ADMIN_PASSWORD is required when MONGO_ADMIN_USER is set." >&2
    exit 1
  fi
  MONGOSH_AUTH="-u $MONGO_ADMIN_USER -p $MONGO_ADMIN_PASSWORD --authenticationDatabase admin"
fi

echo "Creating MongoDB user on container: $MONGO_CONTAINER"
docker exec \
  -e __PROJECT_CONST___MONGO_USER="$MONGO_USER" \
  -e __PROJECT_CONST___MONGO_PASSWORD="$MONGO_PASSWORD" \
  -e __PROJECT_CONST___MONGO_DB="$MONGO_DB" \
  -e MONGODB_URL_HOST="$MONGODB_URL_HOST" \
  -e MONGODB_URL_QUERY="$MONGODB_URL_QUERY" \
  -i "$MONGO_CONTAINER" \
  mongosh $MONGOSH_AUTH --quiet \
  < "$SCRIPT_DIR/create-mongodb-user.js"

echo ""
echo "Add to .env:"
echo "MONGODB_URL=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGODB_URL_HOST}/${MONGO_DB}?${MONGODB_URL_QUERY}"
echo ""

if [ "$MONGO_CONTAINER" = "__PROJECT_SLUG__-mongodb" ]; then
  echo "Start full stack:"
  echo "  docker compose -f docker-compose.yml -f docker-compose.mongodb-bundled.yml up -d"
elif docker port "$MONGO_CONTAINER" 27017/tcp 2>/dev/null | grep -q '127.0.0.1:'; then
  echo "# MongoDB is bound to 127.0.0.1 on the host — join its Docker network:"
  NETWORK="$(docker inspect "$MONGO_CONTAINER" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' | awk '{print $1}')"
  echo "MONGODB_DOCKER_NETWORK=${NETWORK}"
  echo ""
  echo "Start with:"
  echo "  docker compose -f docker-compose.yml -f docker-compose.mongodb-external.yml up -d"
else
  echo "Then restart: docker compose up -d"
fi
