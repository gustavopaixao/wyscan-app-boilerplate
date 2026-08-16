#!/bin/sh
set -e
if [ ! -f node_modules/.bin/tsx ]; then
  echo "Installing dependencies (devDependencies for tsx)..."
  pnpm install --no-frozen-lockfile
fi
exec "$@"
