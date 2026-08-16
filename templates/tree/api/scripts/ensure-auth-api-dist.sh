#!/bin/sh
# Ensure Wyscan file: dependencies have dist/ under api/node_modules for __PROJECT_NAME__ (Hono + tsx).
#
# Wyscan Packages .gitignore lists "dist/", so pnpm "file:" installs omit dist/ from the materialized
# copy under api/node_modules even when ../__ECOSYSTEM_DIR__/.../dist exists. We build each package in order
# (core-api → ai-api → notify-api → auth-api → ads-api → feedback-api) then copy dist/ into node_modules.
# ai-api depends on core-api, so it is built/synced strictly after core-api.
set -e
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WYSCAN_PKG="${__PROJECT_CONST___WYSCAN_PACKAGES:-$REPO_ROOT/../__ECOSYSTEM_DIR__/Packages}"
CORE_PKG="$WYSCAN_PKG/packages/wyscan-core/api/nextjs"
AI_PKG="$WYSCAN_PKG/packages/wyscan-ai/api/nextjs"
AUTH_SHARED_PKG="$WYSCAN_PKG/packages/wyscan-auth-shared/api/nextjs"
NOTIFY_PKG="$WYSCAN_PKG/packages/wyscan-notify/api/nextjs"
AUTH_PKG="$WYSCAN_PKG/packages/wyscan-auth/api/nextjs"
ADS_PKG="$WYSCAN_PKG/packages/wyscan-ads/api/nextjs"
FEEDBACK_PKG="$WYSCAN_PKG/packages/wyscan-feedback/api/nextjs"

# pnpm resolves file: deps from api/package.json — this script must build/sync the SAME tree or
# node_modules gets dist/ from the wrong place after you move WyscanPackages.
if [ ! -f "$AUTH_PKG/package.json" ]; then
  echo "__PROJECT_SLUG__-api: WyscanPackages auth-api not found at:" >&2
  echo "  $AUTH_PKG" >&2
  echo "Set __PROJECT_CONST___WYSCAN_PACKAGES to your WyscanPackages clone root (folder with packages/ and pnpm-workspace.yaml)." >&2
  echo "That root must match the path family used in api/package.json file:... dependencies, then run: cd api && pnpm install" >&2
  exit 1
fi

if [ ! -f "$FEEDBACK_PKG/package.json" ]; then
  echo "__PROJECT_SLUG__-api: WyscanPackages feedback-api not found at:" >&2
  echo "  $FEEDBACK_PKG" >&2
  echo "Run make wyscan-dev-setup (or clone WyscanPackages) so wyscan-feedback is available, then: cd api && pnpm install && make api-auth-dist" >&2
  exit 1
fi

NM_ROOT="$REPO_ROOT/api/node_modules/__NPM_SCOPE__"
NM_CORE="$NM_ROOT/core-api"
NM_AI="$NM_ROOT/ai-api"
NM_AUTH_SHARED="$NM_ROOT/auth-shared"
NM_NOTIFY="$NM_ROOT/notify-api"
NM_AUTH="$NM_ROOT/auth-api"
NM_ADS="$NM_ROOT/ads-api"
NM_FEEDBACK="$NM_ROOT/feedback-api"

# __PROJECT_NAME__ imports (api/src/v1/authRoutes.ts)
AUTH_REQUIRED="dist/routes/auth/login.js dist/routes/auth/register.js dist/routes/auth/verify-email.js dist/routes/auth/resend-code.js dist/routes/auth/forgot-password.js dist/routes/auth/reset-password.js dist/routes/auth/refresh.js dist/routes/auth/logout.js dist/routes/auth/google.js dist/routes/auth/apple.js dist/routes/auth/facebook.js dist/routes/me/profile.js dist/routes/me/update.js"

# __PROJECT_NAME__ imports (api/src/v1/adsRoutes.ts)
ADS_REQUIRED="dist/routes/banner/get.js dist/routes/events/post.js dist/routes/admin/banners/list-and-create.js dist/routes/admin/banners/[id]/update-and-delete.js"

# __PROJECT_NAME__ imports (api/src/v1/feedback/routes.ts, submitFeedback.ts)
FEEDBACK_REQUIRED="dist/routes/admin/feedback/get-one.js dist/routes/admin/feedback/list.js dist/models/feedback.model.js"

CORE_MARKER="dist/utils/errors.js"
AI_MARKER="dist/index.js"
AUTH_SHARED_MARKER="dist/create-require-auth.js"
NOTIFY_MARKER="dist/utils/email.js"

dist_complete_auth() {
  root="$1"
  for rel in $AUTH_REQUIRED; do
    if [ ! -f "$root/$rel" ]; then
      return 1
    fi
  done
  return 0
}

dist_complete_ads() {
  root="$1"
  for rel in $ADS_REQUIRED; do
    if [ ! -f "$root/$rel" ]; then
      return 1
    fi
  done
  return 0
}

dist_complete_feedback() {
  root="$1"
  for rel in $FEEDBACK_REQUIRED; do
    if [ ! -f "$root/$rel" ]; then
      return 1
    fi
  done
  return 0
}

auth_has_account_deletion_helpers() {
  root="$1"
  [ -f "$root/dist/utils/tokens.js" ] && grep -q 'saveAccountDeletionCode' "$root/dist/utils/tokens.js"
}

auth_model_has_account_deletion_type() {
  root="$1"
  [ -f "$root/dist/models/auth-token.model.js" ] && grep -q 'accountDeletion' "$root/dist/models/auth-token.model.js"
}

sync_auth_if_stale() {
  ensure_api_node_modules
  if auth_has_account_deletion_helpers "$AUTH_PKG"; then
    if ! auth_has_account_deletion_helpers "$NM_AUTH" || ! auth_model_has_account_deletion_type "$NM_AUTH"; then
      sync_dist "$AUTH_PKG" "$NM_AUTH" "auth-api"
    fi
  fi
}

auth_shared_esm_ready() {
  root="$1"
  [ -f "$root/src/create-require-auth.ts" ] \
    && grep -q "import jwt from 'jsonwebtoken'" "$root/src/create-require-auth.ts"
}

sync_auth_shared() {
  src="$1"
  nm="$2"
  echo "__PROJECT_SLUG__-api: syncing auth-shared dist+src into node_modules (tsx resolves package sources)..."
  if [ ! -d "$src/dist" ]; then
    echo "__PROJECT_SLUG__-api: error: no dist at $src/dist" >&2
    exit 1
  fi
  ensure_api_node_modules
  rm -rf "$nm/dist" "$nm/src"
  cp -R "$src/dist" "$nm/"
  cp -R "$src/src" "$nm/"
}

all_ready() {
  [ -f "$CORE_PKG/$CORE_MARKER" ] && [ -f "$NM_CORE/$CORE_MARKER" ] || return 1
  if [ -f "$AI_PKG/package.json" ]; then
    [ -f "$AI_PKG/$AI_MARKER" ] && [ -f "$NM_AI/$AI_MARKER" ] || return 1
  fi
  [ -f "$AUTH_SHARED_PKG/$AUTH_SHARED_MARKER" ] && [ -f "$NM_AUTH_SHARED/$AUTH_SHARED_MARKER" ] || return 1
  auth_shared_esm_ready "$NM_AUTH_SHARED" || return 1
  [ -f "$NOTIFY_PKG/$NOTIFY_MARKER" ] && [ -f "$NM_NOTIFY/$NOTIFY_MARKER" ] || return 1
  dist_complete_auth "$AUTH_PKG" && dist_complete_auth "$NM_AUTH" || return 1
  dist_complete_ads "$ADS_PKG" && dist_complete_ads "$NM_ADS" || return 1
  dist_complete_feedback "$FEEDBACK_PKG" && dist_complete_feedback "$NM_FEEDBACK"
}

build_wyscan_package() {
  pkg_dir="$1"
  name="$2"
  if [ ! -d "$pkg_dir" ]; then
    echo "__PROJECT_SLUG__-api: error: missing package directory $pkg_dir" >&2
    exit 1
  fi
  if [ -f "$WYSCAN_PKG/pnpm-workspace.yaml" ]; then
    relpath="${pkg_dir#$WYSCAN_PKG/}"
    echo "__PROJECT_SLUG__-api: building $name (workspace)..."
    (cd "$WYSCAN_PKG" && pnpm install && cd "$relpath" && pnpm run build)
  else
    echo "__PROJECT_SLUG__-api: building $name (standalone)..."
    (cd "$pkg_dir" && pnpm install && pnpm run build)
  fi
}

ensure_api_node_modules() {
  if [ ! -f "$NM_AUTH/package.json" ] || [ ! -f "$NM_CORE/package.json" ] || [ ! -f "$NM_AI/package.json" ] || [ ! -f "$NM_AUTH_SHARED/package.json" ] || [ ! -f "$NM_ADS/package.json" ] || [ ! -f "$NM_FEEDBACK/package.json" ]; then
    (cd "$REPO_ROOT/api" && pnpm install)
  fi
}

sync_dist() {
  src="$1"
  nm="$2"
  label="$3"
  echo "__PROJECT_SLUG__-api: copying $label dist into node_modules (pnpm file: omits gitignored dist/)..."
  if [ ! -d "$src/dist" ]; then
    echo "__PROJECT_SLUG__-api: error: no dist at $src/dist" >&2
    exit 1
  fi
  ensure_api_node_modules
  rm -rf "$nm/dist"
  cp -R "$src/dist" "$nm/"
}

ensure_api_node_modules

sync_auth_if_stale

if all_ready && auth_model_has_account_deletion_type "$NM_AUTH"; then
  exit 0
fi

if ! [ -f "$CORE_PKG/$CORE_MARKER" ]; then
  build_wyscan_package "$CORE_PKG" "__NPM_SCOPE__/core-api"
fi
if ! [ -f "$CORE_PKG/$CORE_MARKER" ]; then
  echo "__PROJECT_SLUG__-api: error: core-api dist still missing at $CORE_PKG" >&2
  exit 1
fi

# ai-api depends on core-api — build strictly after core-api above.
if [ -f "$AI_PKG/package.json" ] && ! [ -f "$AI_PKG/$AI_MARKER" ]; then
  build_wyscan_package "$AI_PKG" "__NPM_SCOPE__/ai-api"
fi
if [ -f "$AI_PKG/package.json" ] && ! [ -f "$AI_PKG/$AI_MARKER" ]; then
  echo "__PROJECT_SLUG__-api: error: ai-api dist still missing at $AI_PKG" >&2
  exit 1
fi

if ! [ -f "$AUTH_SHARED_PKG/$AUTH_SHARED_MARKER" ] || ! auth_shared_esm_ready "$AUTH_SHARED_PKG"; then
  build_wyscan_package "$AUTH_SHARED_PKG" "__NPM_SCOPE__/auth-shared"
fi
if ! [ -f "$AUTH_SHARED_PKG/$AUTH_SHARED_MARKER" ]; then
  echo "__PROJECT_SLUG__-api: error: auth-shared dist still missing at $AUTH_SHARED_PKG" >&2
  exit 1
fi

if ! [ -f "$NOTIFY_PKG/$NOTIFY_MARKER" ]; then
  build_wyscan_package "$NOTIFY_PKG" "__NPM_SCOPE__/notify-api"
fi
if ! [ -f "$NOTIFY_PKG/$NOTIFY_MARKER" ]; then
  echo "__PROJECT_SLUG__-api: error: notify-api dist still missing at $NOTIFY_PKG" >&2
  exit 1
fi

if ! dist_complete_auth "$AUTH_PKG"; then
  build_wyscan_package "$AUTH_PKG" "__NPM_SCOPE__/auth-api"
fi
if ! dist_complete_auth "$AUTH_PKG"; then
  echo "__PROJECT_SLUG__-api: error: auth-api dist still incomplete at $AUTH_PKG" >&2
  exit 1
fi

if [ -f "$ADS_PKG/package.json" ]; then
  if ! dist_complete_ads "$ADS_PKG"; then
    build_wyscan_package "$ADS_PKG" "__NPM_SCOPE__/ads-api"
  fi
  if ! dist_complete_ads "$ADS_PKG"; then
    echo "__PROJECT_SLUG__-api: error: ads-api dist still incomplete at $ADS_PKG" >&2
    exit 1
  fi
fi

if ! dist_complete_feedback "$FEEDBACK_PKG"; then
  build_wyscan_package "$FEEDBACK_PKG" "__NPM_SCOPE__/feedback-api"
fi
if ! dist_complete_feedback "$FEEDBACK_PKG"; then
  echo "__PROJECT_SLUG__-api: error: feedback-api dist still incomplete at $FEEDBACK_PKG" >&2
  exit 1
fi

if ! [ -f "$NM_CORE/$CORE_MARKER" ]; then
  sync_dist "$CORE_PKG" "$NM_CORE" "core-api"
fi
if [ -f "$AI_PKG/package.json" ] && ! [ -f "$NM_AI/$AI_MARKER" ]; then
  sync_dist "$AI_PKG" "$NM_AI" "ai-api"
fi
if ! [ -f "$NM_AUTH_SHARED/$AUTH_SHARED_MARKER" ] || ! auth_shared_esm_ready "$NM_AUTH_SHARED"; then
  sync_auth_shared "$AUTH_SHARED_PKG" "$NM_AUTH_SHARED"
fi
if ! [ -f "$NM_NOTIFY/$NOTIFY_MARKER" ]; then
  sync_dist "$NOTIFY_PKG" "$NM_NOTIFY" "notify-api"
fi
if ! dist_complete_auth "$NM_AUTH"; then
  sync_dist "$AUTH_PKG" "$NM_AUTH" "auth-api"
fi
if [ -f "$ADS_PKG/package.json" ] && ! dist_complete_ads "$NM_ADS"; then
  sync_dist "$ADS_PKG" "$NM_ADS" "ads-api"
fi
if ! dist_complete_feedback "$NM_FEEDBACK"; then
  sync_dist "$FEEDBACK_PKG" "$NM_FEEDBACK" "feedback-api"
fi

sync_auth_if_stale

if ! all_ready || ! auth_model_has_account_deletion_type "$NM_AUTH"; then
  echo "__PROJECT_SLUG__-api: error: after build/sync, dependencies still incomplete:" >&2
  for rel in $AUTH_REQUIRED; do
    if [ ! -f "$NM_AUTH/$rel" ]; then
      echo "  missing $NM_AUTH/$rel" >&2
    fi
  done
  for rel in $ADS_REQUIRED; do
    if [ ! -f "$NM_ADS/$rel" ]; then
      echo "  missing $NM_ADS/$rel" >&2
    fi
  done
  for rel in $FEEDBACK_REQUIRED; do
    if [ ! -f "$NM_FEEDBACK/$rel" ]; then
      echo "  missing $NM_FEEDBACK/$rel" >&2
    fi
  done
  [ -f "$NM_CORE/$CORE_MARKER" ] || echo "  missing $NM_CORE/$CORE_MARKER" >&2
  if [ -f "$AI_PKG/package.json" ]; then
    [ -f "$NM_AI/$AI_MARKER" ] || echo "  missing $NM_AI/$AI_MARKER" >&2
  fi
  [ -f "$NM_AUTH_SHARED/$AUTH_SHARED_MARKER" ] || echo "  missing $NM_AUTH_SHARED/$AUTH_SHARED_MARKER" >&2
  auth_shared_esm_ready "$NM_AUTH_SHARED" || echo "  stale $NM_AUTH_SHARED/src/create-require-auth.ts (needs ESM jwt import)" >&2
  [ -f "$NM_NOTIFY/$NOTIFY_MARKER" ] || echo "  missing $NM_NOTIFY/$NOTIFY_MARKER" >&2
  exit 1
fi
