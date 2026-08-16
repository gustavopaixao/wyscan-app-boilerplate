#!/bin/sh
set -e

# staging / production: install __NPM_SCOPE__/* from GitHub npm registry (Mode B).
# development: keep pnpm file: overrides for local __ECOSYSTEM_DIR__/Packages (Mode A).
if [ "$DEPLOY_ENV" = "staging" ] || [ "$DEPLOY_ENV" = "production" ]; then
  echo "${DEPLOY_ENV}: removing pnpm overrides for registry __NPM_SCOPE__ packages"
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (pkg.pnpm && pkg.pnpm.overrides) {
      delete pkg.pnpm.overrides;
      if (Object.keys(pkg.pnpm).length === 0) delete pkg.pnpm;
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    }
    const deps = pkg.dependencies || {};
    for (const [name, spec] of Object.entries(deps)) {
      if (String(spec).startsWith('file:')) {
        throw new Error('file: dependency ' + name + ' remains after registry prep; pin registry versions in package.json for ' + process.env.DEPLOY_ENV);
      }
    }
  "
  if [ -f "pnpm-lock.yaml" ]; then
    rm pnpm-lock.yaml
  fi
else
  echo "Development: keeping pnpm overrides for local __ECOSYSTEM_DIR__/Packages"
fi
