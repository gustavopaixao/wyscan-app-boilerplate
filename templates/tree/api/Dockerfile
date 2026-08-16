# syntax=docker/dockerfile:1.4
FROM node:24-alpine AS base
WORKDIR /app

COPY api/package.json ./package.json.pin
RUN corepack enable \
  && PM="$(node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('./package.json.pin','utf8')); const pm=p.packageManager; if(!pm||!String(pm).startsWith('pnpm@')) throw new Error('package.json requires packageManager: pnpm@X.Y.Z'); process.stdout.write(pm)")" \
  && corepack prepare "$PM" --activate \
  && rm -f package.json.pin

FROM base AS deps
ARG DEPLOY_ENV=development
ENV DEPLOY_ENV=${DEPLOY_ENV}
ENV CI=true
RUN apk add --no-cache libc6-compat

COPY api/.npmrc ./
COPY api/package.json api/pnpm-lock.yaml* ./
COPY api/scripts/prepare-deps.sh ./prepare-deps.sh
RUN chmod +x ./prepare-deps.sh && ./prepare-deps.sh

# file:../../__ECOSYSTEM_DIR__/Packages/... resolves from /app to /__ECOSYSTEM_DIR__/Packages (Mode A).
# Pass --build-context wyscan-packages=... on build; empty dir is OK for registry Mode B.
RUN mkdir -p /__ECOSYSTEM_DIR__
COPY --from=wyscan-packages / /__ECOSYSTEM_DIR__/Packages

ARG NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}
RUN if [ -n "$NPM_TOKEN" ]; then echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> .npmrc; fi

RUN pnpm install --no-frozen-lockfile

FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /__ECOSYSTEM_DIR__ /__ECOSYSTEM_DIR__
COPY api/. .
RUN chmod +x /app/scripts/dev-entrypoint.sh /app/scripts/prepare-deps.sh 2>/dev/null || true
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENTRYPOINT ["sh", "/app/scripts/dev-entrypoint.sh"]
CMD ["pnpm", "dev"]

FROM base AS builder
ARG DEPLOY_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /__ECOSYSTEM_DIR__ /__ECOSYSTEM_DIR__
COPY api/. .
RUN pnpm build

FROM base AS production
ARG DEPLOY_ENV=development
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 apiuser
COPY --from=builder --chown=apiuser:nodejs /app/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=apiuser:nodejs /app/public ./public
# Mode A (file: Wyscan deps): include Packages tree. Mode B (registry): dir is empty — harmless.
COPY --from=deps --chown=apiuser:nodejs /__ECOSYSTEM_DIR__ /__ECOSYSTEM_DIR__
USER apiuser
EXPOSE 3000
ENV PORT=3000
CMD ["node", "dist/server.js"]
