#!/usr/bin/env sh
# Local Docker dev stack — phased restart and health checks.
# Used by: make restart, make recreate, make health, make rebuild, make fresh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="docker compose -f ${ROOT}/docker/docker-compose.yml"

API_PORT="${API_PORT:-3000}"
REALTIME_PORT="${REALTIME_PORT:-3001}"
NGINX_PORT="${NGINX_PORT:-8080}"

# Fail fast when a container has already given up: a startup crash (e.g. a bad
# env or a missing Wyscan dist) exits the process in <1s, but the HTTP poll would
# otherwise wait the full 60s before reporting. When a container name is passed
# as $3 we check its state each tick and bail immediately once it exits. (bugfix 0001)
wait_for_url() {
  name="$1"
  url="$2"
  container="${3:-}"
  echo "Waiting for ${name} at ${url}..."
  attempt=0
  max=30
  while [ "$attempt" -lt "$max" ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "${name} is healthy."
      return 0
    fi
    if [ -n "$container" ]; then
      status="$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo missing)"
      if [ "$status" = "exited" ] || [ "$status" = "dead" ]; then
        echo "ERROR: ${name} container (${container}) ${status} before becoming healthy — see logs below."
        return 1
      fi
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  echo "ERROR: ${name} health check timed out after $((max * 2))s."
  return 1
}

wait_for_realtime() {
  wait_for_url "realtime" "http://127.0.0.1:${REALTIME_PORT}/health" __PROJECT_SLUG__-realtime || {
    docker logs __PROJECT_SLUG__-realtime --tail 30 2>/dev/null || true
    return 1
  }
}

wait_for_api() {
  wait_for_url "API" "http://127.0.0.1:${API_PORT}/api/health" __PROJECT_SLUG__-api || {
    docker logs __PROJECT_SLUG__-api --tail 30 2>/dev/null || true
    return 1
  }
}

cmd_restart() {
  echo "Recreating infra (mongodb, redis)..."
  $COMPOSE up -d --force-recreate mongodb redis

  echo "Recreating app services (api, realtime, log-agent)..."
  $COMPOSE up -d --force-recreate api realtime log-agent

  wait_for_realtime
  wait_for_api

  echo "Recreating nginx..."
  $COMPOSE up -d --force-recreate --no-deps nginx

  cmd_health
}

cmd_health() {
  set +e
  $COMPOSE ps
  failed=0

  echo "--- API health (direct :${API_PORT}) ---"
  if curl -sf "http://127.0.0.1:${API_PORT}/api/health"; then
    echo ""
  else
    echo "FAILED"
    failed=1
  fi

  echo "--- Realtime health (direct :${REALTIME_PORT}) ---"
  if curl -sf "http://127.0.0.1:${REALTIME_PORT}/health"; then
    echo ""
  else
    echo "FAILED"
    failed=1
  fi

  echo "--- API health via nginx (:${NGINX_PORT}) ---"
  if curl -sf "http://127.0.0.1:${NGINX_PORT}/api/health"; then
    echo ""
  else
    echo "FAILED"
    failed=1
  fi

  if [ "$failed" -ne 0 ]; then
    echo "--- __PROJECT_SLUG__-realtime logs (last 20) ---"
    docker logs __PROJECT_SLUG__-realtime --tail 20 2>/dev/null || true
    exit 1
  fi
}

case "${1:-}" in
  restart) cmd_restart ;;
  health) cmd_health ;;
  *)
    echo "Usage: $0 restart|health" >&2
    exit 1
    ;;
esac
