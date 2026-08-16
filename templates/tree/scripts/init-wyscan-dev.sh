#!/bin/sh
# Clone WyscanPackages and WyscanDesignSystem under ../__ECOSYSTEM_DIR__ (sibling of this repo).
# Optional: __PROJECT_CONST___WYSCAN_DEV — path to __ECOSYSTEM_DIR__ directory (default: ../__ECOSYSTEM_DIR__ from repo root).
# Optional: __PROJECT_CONST___PACKAGES_RECURSE=1 — run git submodule update --init --recursive inside Packages.
# Optional: WYSCAN_PACKAGES_REMOTE, WYSCAN_DESIGNSYSTEM_REMOTE — override clone URLs.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WYSCAN_DEV="${__PROJECT_CONST___WYSCAN_DEV:-$ROOT/../__ECOSYSTEM_DIR__}"
PACKAGES_URL="${WYSCAN_PACKAGES_REMOTE:-git@github.com:__OWNER_HANDLE__/WyscanPackages.git}"
DESIGN_URL="${WYSCAN_DESIGNSYSTEM_REMOTE:-git@github.com:__OWNER_HANDLE__/WyscanDesignSystem.git}"

mkdir -p "$WYSCAN_DEV"

if [ ! -d "$WYSCAN_DEV/Packages/.git" ]; then
	if [ -e "$WYSCAN_DEV/Packages" ]; then
		echo "__PROJECT_SLUG__: $WYSCAN_DEV/Packages exists but is not a git clone; remove or rename it." >&2
		exit 1
	fi
	echo "__PROJECT_SLUG__: cloning WyscanPackages -> $WYSCAN_DEV/Packages"
	git clone "$PACKAGES_URL" "$WYSCAN_DEV/Packages"
else
	echo "__PROJECT_SLUG__: WyscanPackages already present at $WYSCAN_DEV/Packages"
fi

if [ ! -d "$WYSCAN_DEV/DesignSystem/.git" ]; then
	if [ -e "$WYSCAN_DEV/DesignSystem" ]; then
		echo "__PROJECT_SLUG__: $WYSCAN_DEV/DesignSystem exists but is not a git clone; remove or rename it." >&2
		exit 1
	fi
	echo "__PROJECT_SLUG__: cloning WyscanDesignSystem -> $WYSCAN_DEV/DesignSystem"
	git clone "$DESIGN_URL" "$WYSCAN_DEV/DesignSystem"
else
	echo "__PROJECT_SLUG__: WyscanDesignSystem already present at $WYSCAN_DEV/DesignSystem"
fi

if [ "${__PROJECT_CONST___PACKAGES_RECURSE:-0}" = "1" ]; then
	echo "__PROJECT_SLUG__: updating nested submodules in Packages (__PROJECT_CONST___PACKAGES_RECURSE=1)..."
	(cd "$WYSCAN_DEV/Packages" && git submodule update --init --recursive)
fi

echo "__PROJECT_SLUG__: __ECOSYSTEM_DIR__ ready at $WYSCAN_DEV"
