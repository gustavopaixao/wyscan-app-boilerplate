#!/bin/sh
# Build local wyscan-* packages when ../__ECOSYSTEM_DIR__/Packages is present, then
# force-sync each freshly built dist/ into api/node_modules so the running API
# always reflects the latest Wyscan source on every (re)start.
#
# Why the sync step: pnpm `file:` installs of the Wyscan packages materialize as
# COPIED directories under node_modules (their dist/ is gitignored, so pnpm omits
# it). Rebuilding the source clone alone does NOT update that copy — without the
# copy below, `make restart` / recreate keep serving a stale dist (e.g. a User
# schema missing a newly added field, which Mongoose strict mode then silently
# drops on save). When the dep is instead a symlink to the clone, the build is
# enough and we skip the copy.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_ROOT="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$API_ROOT")"
WYSCAN_PKG="${__PROJECT_CONST___WYSCAN_PACKAGES:-$REPO_ROOT/../__ECOSYSTEM_DIR__/Packages}"
NM_ROOT="$API_ROOT/node_modules"
if [ ! -d "$WYSCAN_PKG/packages" ]; then
  exit 0
fi

# Packages __PROJECT_SLUG__-api actually imports (see scripts/ensure-auth-api-dist.sh).
# A missing/stale dist here crashes the server at import time, so for these we
# build and verify strictly — failing loudly now beats a cryptic crash later.
# Everything else in the loop is best-effort (present in the workspace but not a
# hard dependency of this API). (bugfix 0001)
REQUIRED_PKGS="wyscan-core wyscan-ai wyscan-auth-shared wyscan-auth wyscan-ads wyscan-notify wyscan-feedback"

is_required() {
  for r in $REQUIRED_PKGS; do
    [ "$1" = "$r" ] && return 0
  done
  return 1
}

# Force-copy a built package dist/ into its node_modules location.
# Skips when the dep is a symlink (build already reflected) or dist/ is absent.
sync_dist() {
  pkg_dir="$1"
  pkg_name="$(node -p "require('$pkg_dir/package.json').name" 2>/dev/null || echo "")"
  [ -n "$pkg_name" ] || return 0
  nm_dir="$NM_ROOT/$pkg_name"
  [ -d "$nm_dir" ] || return 0
  [ -L "$nm_dir" ] && return 0
  [ -d "$pkg_dir/dist" ] || return 0
  echo "ensure-local-packages-built: syncing $pkg_name dist -> node_modules"
  rm -rf "$nm_dir/dist"
  cp -R "$pkg_dir/dist" "$nm_dir/"
}

fail_required() {
  slug="$1"
  dir="$2"
  reason="$3"
  echo "ensure-local-packages-built: ERROR: required Wyscan package $slug $reason" >&2
  echo "  package: $dir" >&2
  echo "  Fix the Wyscan source under \$__PROJECT_CONST___WYSCAN_PACKAGES (default ../__ECOSYSTEM_DIR__/Packages)" >&2
  echo "  and re-run. The __PROJECT_NAME__ API imports $slug and cannot start without its dist/." >&2
  exit 1
}

for dir in \
  "$WYSCAN_PKG/packages/wyscan-core/api/nextjs" \
  "$WYSCAN_PKG/packages/wyscan-ai/api/nextjs" \
  "$WYSCAN_PKG/packages/wyscan-auth-shared/api/nextjs" \
  "$WYSCAN_PKG/packages/wyscan-auth/api/nextjs" \
  "$WYSCAN_PKG/packages/wyscan-ads/api/nextjs" \
  "$WYSCAN_PKG/packages/wyscan-notify/api/nextjs" \
  "$WYSCAN_PKG/packages/wyscan-messaging/api/nextjs" \
  "$WYSCAN_PKG/packages/wyscan-social/api/nextjs" \
  "$WYSCAN_PKG/packages/wyscan-feature-flags/api/nextjs" \
  "$WYSCAN_PKG/packages/wyscan-subscriptions/api/nextjs" \
  "$WYSCAN_PKG/packages/wyscan-feedback/api/nextjs"; do
  # slug = the wyscan-* folder name (…/packages/<slug>/api/nextjs)
  slug="$(basename "$(dirname "$(dirname "$dir")")")"
  if [ ! -f "$dir/package.json" ]; then
    if is_required "$slug"; then
      fail_required "$slug" "$dir" "is missing (no package.json)"
    fi
    continue
  fi
  if is_required "$slug"; then
    echo "ensure-local-packages-built: building $slug (required)..."
    if ! (cd "$dir" && pnpm build); then
      fail_required "$slug" "$dir" "failed to build"
    fi
    if [ ! -d "$dir/dist" ]; then
      fail_required "$slug" "$dir" "built but produced no dist/"
    fi
    sync_dist "$dir"
  else
    (cd "$dir" && pnpm build) || true
    sync_dist "$dir" || true
  fi
done
