# Production server ops — run from this directory (docker/deploy/).
# See docs/runbooks/production-api-day-to-day.md
.PHONY: help upgrade rollback health restart restart-api restart-app resolve-version

IMAGE_REGISTRY ?= __IMAGE_REGISTRY__
VERSION ?= latest
COMPOSE_FILES ?= -f docker-compose.yml -f docker-compose.mongodb-bundled.yml
REPO_ROOT ?= $(abspath ../..)
COMPOSE := docker compose $(COMPOSE_FILES)

help:
	@echo "__PROJECT_NAME__ production deploy (docker/deploy)"
	@echo ""
	@echo "  make upgrade [VERSION=latest]  - pull api + realtime + log-agent, restart, verify health"
	@echo "  make rollback [VERSION=…]      - same as upgrade with an older tag"
	@echo "  make health                    - compose ps + local/public health curls"
	@echo "  make restart                   - recreate full stack (reload .env, no pull/build)"
	@echo "  make restart-api               - recreate api only (--no-deps)"
	@echo "  make restart-app               - recreate api + realtime (.env secrets)"
	@echo "  (LOG_AGENT_SECRET-only changes: make restart or recreate log-agent)"
	@echo ""
	@echo "Optional: GIT_PULL=1  YES=1  PUBLIC_HEALTH_URL=https://api.example.com/api/health"
	@echo "           COMPOSE_FILES='-f docker-compose.yml -f docker-compose.mongodb-external.yml'"

upgrade rollback: resolve-version
	@set -eu; \
	ACTION=$@ IMAGE_REGISTRY="$(IMAGE_REGISTRY)" VERSION="$(VERSION)" sh scripts/confirm-upgrade.sh; \
	export VERSION="$(VERSION)" IMAGE_REGISTRY="$(IMAGE_REGISTRY)"; \
	if [ "$(GIT_PULL)" = "1" ]; then \
	  if [ -d "$(REPO_ROOT)/.git" ]; then \
	    echo "git pull ($(REPO_ROOT))"; \
	    git -C "$(REPO_ROOT)" pull; \
	  else \
	    echo "WARN: GIT_PULL=1 but $(REPO_ROOT) is not a git repo — skipping"; \
	  fi; \
	fi; \
	echo "Pulling api + realtime + log-agent (VERSION=$$VERSION)"; \
	$(COMPOSE) pull api realtime log-agent; \
	echo "Restarting api + realtime + log-agent (--no-deps)"; \
	$(COMPOSE) up -d --no-deps api realtime log-agent; \
	echo "--- __PROJECT_SLUG__-api logs (last 20) ---"; \
	docker logs __PROJECT_SLUG__-api --tail 20; \
	echo "--- __PROJECT_SLUG__-realtime logs (last 20) ---"; \
	docker logs __PROJECT_SLUG__-realtime --tail 20; \
	echo "--- localhost API health ---"; \
	curl -sf http://127.0.0.1:3000/api/health; \
	echo ""; \
	echo "--- localhost realtime health ---"; \
	curl -sf http://127.0.0.1:3001/health; \
	echo ""; \
	url="$(PUBLIC_HEALTH_URL)"; \
	if [ -z "$$url" ] && [ -f .env ]; then \
	  base=$$(grep -E '^API_PUBLIC_BASE_URL=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"); \
	  if [ -n "$$base" ]; then \
	    base=$${base%/}; \
	    url="$$base/api/health"; \
	  fi; \
	fi; \
	if [ -n "$$url" ]; then \
	  echo "--- public health ($$url) ---"; \
	  curl -sf "$$url"; \
	  echo ""; \
	else \
	  echo "(skip public health — set PUBLIC_HEALTH_URL or API_PUBLIC_BASE_URL in .env)"; \
	fi

health:
	@set -eu; \
	export IMAGE_REGISTRY="$(IMAGE_REGISTRY)"; \
	$(COMPOSE) ps; \
	echo "--- localhost API health ---"; \
	curl -sf http://127.0.0.1:3000/api/health; \
	echo ""; \
	echo "--- localhost realtime health ---"; \
	curl -sf http://127.0.0.1:3001/health; \
	echo ""; \
	url="$(PUBLIC_HEALTH_URL)"; \
	if [ -z "$$url" ] && [ -f .env ]; then \
	  base=$$(grep -E '^API_PUBLIC_BASE_URL=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"); \
	  if [ -n "$$base" ]; then \
	    base=$${base%/}; \
	    url="$$base/api/health"; \
	  fi; \
	fi; \
	if [ -n "$$url" ]; then \
	  echo "--- public health ($$url) ---"; \
	  curl -sf "$$url"; \
	  echo ""; \
	fi

restart:
	@echo "Recreating full stack (reload .env, no pull)…"
	@export IMAGE_REGISTRY="$(IMAGE_REGISTRY)"; \
	$(COMPOSE) up -d --force-recreate
	@$(MAKE) health IMAGE_REGISTRY="$(IMAGE_REGISTRY)" PUBLIC_HEALTH_URL="$(PUBLIC_HEALTH_URL)"

restart-api:
	@echo "Recreating api only…"
	@set -eu; \
	export IMAGE_REGISTRY="$(IMAGE_REGISTRY)"; \
	$(COMPOSE) up -d --no-deps --force-recreate api; \
	echo "--- localhost API health ---"; \
	curl -sf http://127.0.0.1:3000/api/health; \
	echo ""

restart-app:
	@echo "Recreating api + realtime…"
	@set -eu; \
	export IMAGE_REGISTRY="$(IMAGE_REGISTRY)"; \
	$(COMPOSE) up -d --force-recreate api realtime; \
	echo "--- localhost API health ---"; \
	curl -sf http://127.0.0.1:3000/api/health; \
	echo ""; \
	echo "--- localhost realtime health ---"; \
	curl -sf http://127.0.0.1:3001/health; \
	echo ""

resolve-version:
	@test -n "$(VERSION)" || (echo "VERSION must not be empty"; exit 1)
