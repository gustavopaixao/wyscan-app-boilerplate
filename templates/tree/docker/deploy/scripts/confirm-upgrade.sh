#!/bin/sh
# Confirm production API upgrade/rollback before pull + restart.
set -eu

VERSION="${VERSION:-latest}"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-__IMAGE_REGISTRY__}"
IMAGE_NAME="${IMAGE_NAME:-__PROJECT_SLUG__-api}"
ACTION="${ACTION:-upgrade}"

IMAGE="${IMAGE_REGISTRY}/${IMAGE_NAME}:${VERSION}"

current_tag() {
  docker inspect "$1" --format '{{.Config.Image}}' 2>/dev/null | sed 's/.*://' || echo "(not running)"
}

echo "Production API $ACTION"
echo "  Image:   $IMAGE"
echo "  Target:  $VERSION"
echo "  Current tags (api / realtime):"
echo "    api:                  $(current_tag __PROJECT_SLUG__-api)"
echo "    realtime:             $(current_tag __PROJECT_SLUG__-realtime)"
echo ""

if [ "${YES:-}" = "1" ]; then
  exit 0
fi

if [ ! -t 0 ]; then
  echo "Non-interactive shell — set YES=1 to proceed without confirmation." >&2
  exit 1
fi

printf "Proceed? [y/N] "
read -r REPLY
case "$REPLY" in
  y|Y|yes|YES)
    ;;
  *)
    echo "Aborted."
    exit 1
    ;;
esac
