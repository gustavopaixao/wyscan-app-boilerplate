#!/bin/bash
# Checkout branch in WyscanDesignSystem clone under ../__ECOSYSTEM_DIR__/DesignSystem.
set -e

VERSION=${1:-main}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DS="$ROOT/../__ECOSYSTEM_DIR__/DesignSystem"

echo "Setting up DesignSystem at $DS (version: $VERSION)..."

if [ ! -d "$DS/.git" ]; then
	echo "__PROJECT_SLUG__: missing $DS — run make wyscan-dev-setup or ./scripts/init-wyscan-dev.sh first." >&2
	exit 1
fi

cd "$DS"
git fetch origin 2>/dev/null || true
git checkout "$VERSION" 2>/dev/null || git checkout main 2>/dev/null || true
git pull origin "$VERSION" 2>/dev/null || git pull origin main 2>/dev/null || true

echo "DesignSystem ready at $DS"
