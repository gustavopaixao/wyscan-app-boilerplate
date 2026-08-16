#!/bin/sh
set -eu

cd /workspace/api

if [ ! -f node_modules/.bin/tsx ] || [ ! -d node_modules/dockerode ] || [ ! -f node_modules/__NPM_SCOPE__/ads-api/package.json ] || [ ! -f node_modules/__NPM_SCOPE__/feedback-api/package.json ]; then
  echo "Installing API dependencies (missing tsx, dockerode, or wyscan packages)..."
  pnpm install --no-frozen-lockfile
fi
