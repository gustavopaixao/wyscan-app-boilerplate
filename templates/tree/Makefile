# __PROJECT_NAME__ monorepo: Wyscan sources live in ../__ECOSYSTEM_DIR__/{Packages,DesignSystem} (see make wyscan-dev-setup).
.PHONY: help dev dev-up dev-down dev-logs dev-fresh dev-restart dev-rebuild dev-rebuild-all dev-infra \
        start stop restart recreate rebuild rebuild-api health fresh \
        dev-shell db-shell api-install api-auth-dist api-watch api-watch-debug api-build api-lint api-format api-test jwt-secret \
        realtime-dev log-agent \
        api-docker-check api-docker-validate-version api-docker-build api-docker-push api-docker-login api-docker-release api-deploy-bundle \
        api-production-upgrade api-production-health \
        api-production-restart api-production-restart-api api-production-restart-app \
        design-system-setup wyscan-dev-setup \
        site-dev admin-dev app-dev mobile-dev mobile-ios mobile-ios-device mobile-ios-list mobile-android mobile-android-device mobile-android-list mobile-android-emulator mobile-android-up mobile-android-wait mobile-android-kill mobile-android-reverse mobile-typecheck mobile-test mobile-check push-check push-verify push-verify-run \
        ship-it \
        features-archive features-index docs-links-check

# Production API Docker
IMAGE_REGISTRY ?= __IMAGE_REGISTRY__
IMAGE_NAME ?= __PROJECT_SLUG__-api
TAG ?= latest
# Target OS/arch for GHCR images (production servers are usually linux/amd64)
DOCKER_PLATFORM ?= linux/amd64
# WYSCAN_SOURCE=local (Mode A: WyscanPackages clone) | registry (Mode B: GitHub npm + NPM_TOKEN)
WYSCAN_SOURCE ?= local
WYSCAN_PACKAGES ?= ../__ECOSYSTEM_DIR__/Packages
DOCKER_DEPLOY_ENV := $(if $(filter registry,$(WYSCAN_SOURCE)),production,development)
GIT_SHA ?= $(shell git rev-parse --short HEAD 2>/dev/null)
API_IMAGE := $(IMAGE_REGISTRY)/$(IMAGE_NAME)
API_DEPLOY_DIR ?= docker/deploy
# Build machine GHCR/npm credentials (see docker/build.env.example)
DOCKER_BUILD_ENV_FILE := docker/build.env
DOCKER_BUILD_ENV = set -a; [ -f $(DOCKER_BUILD_ENV_FILE) ] && . $(DOCKER_BUILD_ENV_FILE); set +a;
API_PKG_VERSION := $(shell node -p "JSON.parse(require('fs').readFileSync('api/package.json','utf8')).version" 2>/dev/null)
DOCKER_VERSION := $(if $(VERSION),$(VERSION),$(API_PKG_VERSION))

DEV_COMPOSE := docker compose -f docker/docker-compose.yml

help:
	@echo "__PROJECT_NAME__"
	@echo ""
	@echo "  make wyscan-dev-setup   - clone WyscanPackages + WyscanDesignSystem into ../__ECOSYSTEM_DIR__"
	@echo "                            If Packages moved: edit api/package.json file: paths + pnpm install; export __PROJECT_CONST___WYSCAN_PACKAGES (see api/.env.example)"
	@echo "  make design-system-setup - checkout branch in ../__ECOSYSTEM_DIR__/DesignSystem"
	@echo "  Local Docker stack (MongoDB, Redis, API, realtime):"
	@echo "  make start              - Start full stack detached"
	@echo "  make stop               - Stop containers (keeps volumes)"
	@echo "  make restart / recreate - Phased force-recreate + health checks (reloads api/.env)"
	@echo "  make rebuild            - Rebuild all images + recreate + health"
	@echo "  make rebuild-api        - Rebuild and recreate API container only"
	@echo "  make health             - compose ps + API / realtime health curls"
	@echo "  make fresh              - Tear down volumes + rebuild all (destructive DB reset)"
	@echo "  (aliases: dev-up=start, dev-down=stop, dev-restart=restart, dev-rebuild-all=rebuild, …)"
	@echo "  make dev                - Foreground compose up (logs attached)"
	@echo "  make dev-infra          - MongoDB + Redis (for api-watch)"
	@echo "  make api-watch          - Infra in Docker, API on host :3000 (stop __PROJECT_SLUG__-api first)"
	@echo "  make realtime-dev       - Socket.IO realtime service on host :3001 (needs Redis)"
	@echo "  make jwt-secret         - Generate a strong JWT_SECRET into api/.env (idempotent, never clobbers an existing one)"
	@echo "  make api-auth-dist      - Re-run api/scripts/ensure-auth-api-dist.sh (Wyscan auth, core, notify, ads, feedback, ai dist → api/node_modules)"
	@echo "                            Optional __PROJECT_CONST___WYSCAN_PACKAGES if Packages is not ../__ECOSYSTEM_DIR__/Packages"
	@echo "  make db-shell           - mongosh __PROJECT_SLUG__"
	@echo "  make site-dev           - Next site (port 3500)"
	@echo "  make admin-dev          - Next admin (port 4000)"
	@echo "  make app-dev            - Next member app (port 4500)"
	@echo "  make mobile-dev         - Expo (set EXPO_PUBLIC_API_URL; see mobile/app.config.ts)"
	@echo "  make mobile-ios [IOS_DEVICE='iPhone 17 Pro Max']  - native iOS debug build on simulator"
	@echo "  make mobile-ios-device  - physical iPhone (run make mobile-dev in another terminal first)"
	@echo "  make mobile-ios-list    - list available iPhone simulators"
	@echo "  make mobile-android-up [AVD=name] [WIPE=1]       - boot emulator + wait + build/install (one shot)"
	@echo "  make mobile-android [ANDROID_DEVICE=serial]      - native Android debug build (emulator or device)"
	@echo "  make mobile-android-device [ANDROID_DEVICE=serial] - physical Android (run make mobile-dev in another terminal first)"
	@echo "  make mobile-android-list    - list bootable AVDs + attached Android devices"
	@echo "  make mobile-android-reverse - adb reverse 8081/8080, then use MOBILE_DEV_HOST=localhost"
	@echo "  make mobile-typecheck   - mobile/ TypeScript (tsc --noEmit)"
	@echo "  make mobile-test        - mobile/ unit tests (vitest)"
	@echo "  make mobile-check       - mobile typecheck + tests"
	@echo "  make api-docker-build [VERSION=…]  - production API image (default: api/package.json version)"
	@echo "  make api-docker-push [VERSION=…] TAG=latest - push to GHCR"
	@echo "  make api-docker-release [TAG=latest] - lint, test, build, push; bump patch in api/package.json + local commit"
	@echo "  make api-deploy-bundle [VERSION=…]  - tarball docker/deploy for server rsync"
	@echo "  make api-production-upgrade [VERSION=latest] [GIT_PULL=1] - server: pull + restart api + realtime"
	@echo "  make api-production-health            - server: compose ps + health curls"
	@echo "  make api-production-restart           - server: recreate full stack (reload docker/deploy/.env)"
	@echo "  make ship-it                          - detect changes, pre-flight, confirm, ship API and/or mobile beta"
	@echo "  make push-check         - api-lint + api-test + mobile-typecheck"
	@echo "  make features-archive UP_TO=NNNN - archive docs/features <= NNNN into docs/features/archive (rewrites links + index)"
	@echo "  make features-index     - regenerate docs/features/README.md index"
	@echo "  make docs-links-check   - verify relative links in docs/, .docs/, .claude/, .cursor/"

dev:
	$(DEV_COMPOSE) up

start dev-up:
	$(DEV_COMPOSE) up -d

stop dev-down:
	$(DEV_COMPOSE) down

restart recreate dev-restart:
	sh scripts/dev-stack.sh restart

rebuild dev-rebuild-all:
	$(DEV_COMPOSE) up -d --build --force-recreate
	sh scripts/dev-stack.sh health

rebuild-api dev-rebuild:
	$(DEV_COMPOSE) up -d --build --force-recreate api

health:
	sh scripts/dev-stack.sh health

fresh dev-fresh:
	$(DEV_COMPOSE) down -v
	$(DEV_COMPOSE) up --build -d
	sh scripts/dev-stack.sh health

dev-infra:
	$(DEV_COMPOSE) -f docker/docker-compose.dev-host-api.yml up -d mongodb redis

dev-logs:
	$(DEV_COMPOSE) logs -f

S ?= api
logs:
	$(DEV_COMPOSE) logs -f $(S)

dev-shell:
	$(DEV_COMPOSE) exec api sh

db-shell:
	$(DEV_COMPOSE) exec mongodb mongosh __PROJECT_SLUG__

jwt-secret:
	sh scripts/ensure-jwt-secret.sh

api-install:
	cd api && pnpm install

api-auth-dist:
	cd api && sh scripts/ensure-auth-api-dist.sh

api-watch:
	$(DEV_COMPOSE) -f docker/docker-compose.dev-host-api.yml up -d mongodb redis
	@docker stop __PROJECT_SLUG__-api 2>/dev/null || true
	@export MONGODB_URL="mongodb://localhost:27017/__PROJECT_SLUG__" REDIS_URL="redis://localhost:6379" NODE_ENV=development PORT=3000 && cd api && pnpm run dev:watch

api-watch-debug:
	$(DEV_COMPOSE) -f docker/docker-compose.dev-host-api.yml up -d mongodb redis
	@docker stop __PROJECT_SLUG__-api 2>/dev/null || true
	@if [ "$(BRK)" = "1" ]; then \
	  export MONGODB_URL="mongodb://localhost:27017/__PROJECT_SLUG__" REDIS_URL="redis://localhost:6379" NODE_ENV=development PORT=3000 && cd api && pnpm run dev:debug-brk; \
	else \
	  export MONGODB_URL="mongodb://localhost:27017/__PROJECT_SLUG__" REDIS_URL="redis://localhost:6379" NODE_ENV=development PORT=3000 && cd api && pnpm run dev:debug; \
	fi

api-build:
	cd api && pnpm build

api-lint:
	cd api && pnpm lint

api-format:
	cd api && pnpm format

api-test:
	cd api && pnpm test

push-check: api-lint api-test mobile-typecheck

push-verify:
	@chmod +x scripts/verify-push-local.sh
	@echo "Tier 1 API verification: ACCESS_TOKEN=eyJ... make push-verify-run"
	@echo "Tier 3 test send:        ACCESS_TOKEN=eyJ... SEND_TEST=1 make push-verify-run"

push-verify-run:
	@chmod +x scripts/verify-push-local.sh
	@test -n "$(ACCESS_TOKEN)" || (echo "Set ACCESS_TOKEN to a logged-in user JWT."; exit 1)
	./scripts/verify-push-local.sh $(if $(SEND_TEST),--send-test,)

api-docker-check: api-lint api-test

api-docker-validate-version:
	@node -e "const v='$(DOCKER_VERSION)'; if(!v||!/^\d+\.\d+\.\d+$$/.test(v)) { console.error('Invalid or missing version:', v||'(empty)'); console.error('Set VERSION= or fix api/package.json (expected x.y.z)'); process.exit(1); }"

api-docker-build: api-docker-check api-docker-validate-version
	@if [ -n "$(VERSION)" ]; then \
	  echo "Using VERSION=$(VERSION) override"; \
	else \
	  echo "Using version $(DOCKER_VERSION) from api/package.json"; \
	fi
	@if [ "$(WYSCAN_SOURCE)" = "local" ]; then \
	  test -d "$(WYSCAN_PACKAGES)" || (echo "WYSCAN_PACKAGES not found at $(WYSCAN_PACKAGES); run make wyscan-dev-setup or set WYSCAN_PACKAGES"; exit 1); \
	fi
	@$(DOCKER_BUILD_ENV) \
	if [ "$(WYSCAN_SOURCE)" = "registry" ]; then \
	  test -n "$$NPM_TOKEN" || (echo "NPM_TOKEN required when WYSCAN_SOURCE=registry — set in docker/build.env (see docker/build.env.example) or export it"; exit 1); \
	fi
	@mkdir -p .docker-empty-wyscan
	@echo "Building $(API_IMAGE):$(DOCKER_VERSION) for platform $(DOCKER_PLATFORM)"
	@$(DOCKER_BUILD_ENV) \
	WYSCAN_CTX="$(WYSCAN_PACKAGES)"; \
	if [ "$(WYSCAN_SOURCE)" = "registry" ]; then WYSCAN_CTX=".docker-empty-wyscan"; fi; \
	docker build \
	  --platform "$(DOCKER_PLATFORM)" \
	  -f api/Dockerfile \
	  --target production \
	  --build-arg DEPLOY_ENV=$(DOCKER_DEPLOY_ENV) \
	  --build-arg NPM_TOKEN=$${NPM_TOKEN:-} \
	  --build-context wyscan-packages="$$WYSCAN_CTX" \
	  -t "$(API_IMAGE):$(DOCKER_VERSION)" \
	  .

api-docker-push: api-docker-validate-version
	@if [ -n "$(VERSION)" ]; then \
	  echo "Using VERSION=$(VERSION) override"; \
	else \
	  echo "Using version $(DOCKER_VERSION) from api/package.json"; \
	fi
	@docker tag "$(API_IMAGE):$(DOCKER_VERSION)" "$(API_IMAGE):$(DOCKER_VERSION)"
	@docker push "$(API_IMAGE):$(DOCKER_VERSION)"
	@if [ -n "$(TAG)" ] && [ "$(TAG)" != "$(DOCKER_VERSION)" ]; then \
	  docker tag "$(API_IMAGE):$(DOCKER_VERSION)" "$(API_IMAGE):$(TAG)"; \
	  docker push "$(API_IMAGE):$(TAG)"; \
	fi
	@if [ -n "$(GIT_SHA)" ]; then \
	  docker tag "$(API_IMAGE):$(DOCKER_VERSION)" "$(API_IMAGE):$(DOCKER_VERSION)-$(GIT_SHA)"; \
	  docker push "$(API_IMAGE):$(DOCKER_VERSION)-$(GIT_SHA)"; \
	fi

api-docker-login:
	@$(DOCKER_BUILD_ENV) \
	test -n "$$GITHUB_TOKEN" || (echo "GITHUB_TOKEN required — set in docker/build.env (see docker/build.env.example) or export it"; exit 1); \
	test -n "$$GITHUB_USER" || (echo "GITHUB_USER required — set in docker/build.env (see docker/build.env.example) or export it"; exit 1); \
	echo "$$GITHUB_TOKEN" | docker login ghcr.io -u "$$GITHUB_USER" --password-stdin

api-docker-release:
	@if [ -n "$(VERSION)" ]; then \
	  echo "WARN: VERSION= is ignored for api-docker-release — using api/package.json"; \
	fi
	@set -eu; \
	RELEASE_VER=$$(node -p "JSON.parse(require('fs').readFileSync('api/package.json','utf8')).version"); \
	node -e "const v='$$RELEASE_VER'; if(!/^\d+\.\d+\.\d+$$/.test(v)) { console.error('Invalid api/package.json version:', v, '(expected x.y.z)'); process.exit(1); }"; \
	echo "Releasing API version $$RELEASE_VER from api/package.json"; \
	$(MAKE) api-docker-build VERSION=$$RELEASE_VER; \
	$(MAKE) api-docker-login; \
	$(MAKE) api-docker-push VERSION=$$RELEASE_VER; \
	if [ "$(SKIP_VERSION_BUMP)" = "1" ]; then \
	  echo "SKIP_VERSION_BUMP=1 — skipping version bump"; \
	else \
	  NEW_VER=$$(node api/scripts/bump-patch-version.mjs); \
	  echo "Bumped api/package.json to $$NEW_VER"; \
	  if [ "$(SKIP_VERSION_COMMIT)" != "1" ]; then \
	    git add api/package.json; \
	    git commit -m "chore(api): bump version to $$NEW_VER" || { \
	      echo "git commit failed — api/package.json is at $$NEW_VER; commit manually"; exit 1; \
	    }; \
	  fi; \
	fi

api-deploy-bundle: api-docker-validate-version
	@if [ -n "$(VERSION)" ]; then \
	  echo "Using VERSION=$(VERSION) override"; \
	else \
	  echo "Using version $(DOCKER_VERSION) from api/package.json"; \
	fi
	@mkdir -p dist
	@TMP=$$(mktemp -d); \
	BUNDLE="$$TMP/__PROJECT_SLUG__-api-deploy-$(DOCKER_VERSION)"; \
	mkdir -p "$$BUNDLE/nginx" "$$BUNDLE/scripts"; \
	cp docker/deploy/Makefile docker/deploy/docker-compose.yml docker/deploy/docker-compose.mongodb-bundled.yml \
	  docker/deploy/docker-compose.mongodb-external.yml docker/deploy/.env.example docker/deploy/setup.sh "$$BUNDLE/"; \
	cp docker/deploy/nginx/host-nginx.conf.example "$$BUNDLE/nginx/"; \
	cp docker/deploy/scripts/*.sh docker/deploy/scripts/*.js "$$BUNDLE/scripts/" 2>/dev/null || true; \
	echo "$(DOCKER_VERSION)" > "$$BUNDLE/VERSION"; \
	tar -czf "dist/__PROJECT_SLUG__-api-deploy-$(DOCKER_VERSION).tar.gz" -C "$$TMP" "__PROJECT_SLUG__-api-deploy-$(DOCKER_VERSION)"; \
	rm -rf "$$TMP"; \
	echo "Created dist/__PROJECT_SLUG__-api-deploy-$(DOCKER_VERSION).tar.gz"

api-production-upgrade:
	@$(MAKE) -C $(API_DEPLOY_DIR) upgrade \
	  VERSION=$(or $(VERSION),latest) \
	  IMAGE_REGISTRY=$(IMAGE_REGISTRY) \
	  $(if $(GIT_PULL),GIT_PULL=$(GIT_PULL),) \
	  $(if $(YES),YES=$(YES),) \
	  $(if $(PUBLIC_HEALTH_URL),PUBLIC_HEALTH_URL=$(PUBLIC_HEALTH_URL),) \
	  $(if $(COMPOSE_FILES),COMPOSE_FILES="$(COMPOSE_FILES)",) \
	  $(if $(REPO_ROOT),REPO_ROOT=$(REPO_ROOT),)

api-production-health:
	@$(MAKE) -C $(API_DEPLOY_DIR) health \
	  IMAGE_REGISTRY=$(IMAGE_REGISTRY) \
	  $(if $(PUBLIC_HEALTH_URL),PUBLIC_HEALTH_URL=$(PUBLIC_HEALTH_URL),) \
	  $(if $(COMPOSE_FILES),COMPOSE_FILES="$(COMPOSE_FILES)",)

api-production-restart:
	@$(MAKE) -C $(API_DEPLOY_DIR) restart \
	  IMAGE_REGISTRY=$(IMAGE_REGISTRY) \
	  $(if $(PUBLIC_HEALTH_URL),PUBLIC_HEALTH_URL=$(PUBLIC_HEALTH_URL),) \
	  $(if $(COMPOSE_FILES),COMPOSE_FILES="$(COMPOSE_FILES)",)

api-production-restart-api:
	@$(MAKE) -C $(API_DEPLOY_DIR) restart-api \
	  IMAGE_REGISTRY=$(IMAGE_REGISTRY) \
	  $(if $(COMPOSE_FILES),COMPOSE_FILES="$(COMPOSE_FILES)",)

api-production-restart-app:
	@$(MAKE) -C $(API_DEPLOY_DIR) restart-app \
	  IMAGE_REGISTRY=$(IMAGE_REGISTRY) \
	  $(if $(COMPOSE_FILES),COMPOSE_FILES="$(COMPOSE_FILES)",)

realtime-dev:
	@export REDIS_URL="$${REDIS_URL:-redis://localhost:6379}" REALTIME_PORT="$${REALTIME_PORT:-3001}" NODE_ENV=development && cd api && pnpm job:realtime

log-agent:
	@export LOG_AGENT_SECRET="$${LOG_AGENT_SECRET:-dev-log-agent-secret-min-16}" LOG_AGENT_PORT="$${LOG_AGENT_PORT:-3090}" && cd api && pnpm job:log-agent

design-system-setup:
	chmod +x scripts/setup-design-system.sh
	./scripts/setup-design-system.sh $(V)

wyscan-dev-setup:
	chmod +x scripts/init-wyscan-dev.sh
	./scripts/init-wyscan-dev.sh

site-dev:
	cd web/__PROJECT_SLUG__-site && pnpm dev

admin-dev:
	cd web/__PROJECT_SLUG__-admin && pnpm dev

app-dev:
	cd web/__PROJECT_SLUG__-app && pnpm dev

# Physical devices cannot reach localhost — hostname must resolve on phone and Mac.
# Expo --host only accepts lan|tunnel|localhost; REACT_NATIVE_PACKAGER_HOSTNAME sets the device URL host.
MOBILE_DEV_HOST ?= __DEV_HOST__
MOBILE_EXPO_HOST ?= lan
MOBILE_EXPO_ENV = REACT_NATIVE_PACKAGER_HOSTNAME=$(MOBILE_DEV_HOST) EXPO_PUBLIC_API_URL=$${EXPO_PUBLIC_API_URL:-http://$(MOBILE_DEV_HOST):8080} EXPO_PUBLIC_DEV_HOST=$(MOBILE_DEV_HOST)

mobile-dev:
	cd mobile && $(MOBILE_EXPO_ENV) pnpm exec expo start --host $(MOBILE_EXPO_HOST)

# iOS simulator: IOS_DEVICE=name or UDID (expo run:ios -d).
IOS_DEVICE ?=
MOBILE_IOS_DEVICE_ARGS = $(if $(IOS_DEVICE),--device "$(IOS_DEVICE)",)

mobile-ios:
	cd mobile && $(MOBILE_EXPO_ENV) pnpm exec expo run:ios $(MOBILE_IOS_DEVICE_ARGS)

# Physical device: Metro must already be running (make mobile-dev). Avoids localhost bundler.
mobile-ios-device:
	cd mobile && $(MOBILE_EXPO_ENV) pnpm exec expo run:ios --device --no-bundler

mobile-ios-list:
	@xcrun simctl list devices available | grep -E '^\s+iPhone' || true

# ANDROID_DEVICE=name or serial from `make mobile-android-list`; omit to let Expo pick.
mobile-android:
	cd mobile && $(MOBILE_EXPO_ENV) pnpm exec expo run:android $(MOBILE_ANDROID_RUN_ARGS)

ANDROID_HOME ?= $(HOME)/Library/Android/sdk
ANDROID_EMULATOR = $(ANDROID_HOME)/emulator/emulator
ANDROID_DEVICE ?=
AVD ?=
MOBILE_ANDROID_RUN_ARGS = $(if $(ANDROID_DEVICE),--device "$(ANDROID_DEVICE)",)
MOBILE_ANDROID_DEVICE_ARGS = $(if $(ANDROID_DEVICE),--device "$(ANDROID_DEVICE)",--device)

mobile-android-device:
	cd mobile && $(MOBILE_EXPO_ENV) pnpm exec expo run:android $(MOBILE_ANDROID_DEVICE_ARGS) --no-bundler

mobile-android-list:
	@echo "Available emulators (AVDs) — boot with: make mobile-android-emulator AVD=<name>"
	@$(ANDROID_EMULATOR) -list-avds 2>/dev/null || echo "  (none — create one in Android Studio > Device Manager)"
	@echo ""
	@echo "Attached now (emulators booted + USB devices):"
	@adb devices -l 2>/dev/null | tail -n +2 | grep . || echo "  (none)"

mobile-android-emulator:
	@test -n "$(AVD)" || { echo "AVD is required — see: make mobile-android-list"; exit 1; }
	$(ANDROID_EMULATOR) -avd "$(AVD)" $(if $(WIPE),-wipe-data,) >/dev/null 2>&1 &
	@echo "Booting $(AVD)$(if $(WIPE), (data wiped),)… wait for the home screen, then: make mobile-android"

mobile-android-up:
	@AVD_NAME="$(AVD)"; \
	if [ -z "$$AVD_NAME" ]; then \
	  AVD_NAME=$$($(ANDROID_EMULATOR) -list-avds 2>/dev/null | head -1); \
	fi; \
	if [ -z "$$AVD_NAME" ]; then \
	  echo "No AVD found — create one in Android Studio > Device Manager"; exit 1; \
	fi; \
	if adb devices 2>/dev/null | grep -q "^emulator-"; then \
	  echo "Emulator already attached — skipping boot (use mobile-android-kill to restart)."; \
	else \
	  echo "Booting $$AVD_NAME..."; \
	  $(ANDROID_EMULATOR) -avd "$$AVD_NAME" $(if $(WIPE),-wipe-data,) >/dev/null 2>&1 & \
	fi
	@$(MAKE) mobile-android-wait
	@$(MAKE) mobile-android

mobile-android-wait:
	@adb wait-for-device
	@until [ "$$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do \
	  printf "."; sleep 2; \
	done; echo ""
	@echo "Emulator booted — safe to run make mobile-android."

mobile-android-kill:
	-@adb emu kill 2>/dev/null
	-@pkill -f qemu-system 2>/dev/null
	-@rm -rf $(HOME)/.android/avd/*.avd/*.lock
	@echo "Emulators stopped, stale AVD locks cleared."

# Point the device's localhost at the Mac: 8081 = Metro, 8080 = Nginx/API.
mobile-android-reverse:
	@adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8080 tcp:8080 && \
	  echo "adb reverse ready — now: make mobile-android-device MOBILE_DEV_HOST=localhost"

mobile-typecheck:
	cd mobile && pnpm typecheck

mobile-test:
	cd mobile && pnpm test

mobile-check: mobile-typecheck mobile-test

ship-it:
	node scripts/ship-it.mjs $(if $(YES),--yes,) $(if $(PLATFORMS),--platforms="$(PLATFORMS)",)

features-archive:
	@test -n "$(UP_TO)" || { echo "Usage: make features-archive UP_TO=NNNN"; exit 1; }
	node scripts/archive-features.mjs $(UP_TO)

features-index:
	node scripts/features-index.mjs

docs-links-check:
	node scripts/check-doc-links.mjs
