# api-dev targets.
.PHONY: api-watch api-watch-debug realtime-dev log-agent

api-watch: ## Infra in Docker, API on the host with hot reload
	$(DEV_COMPOSE) -f docker/docker-compose.dev-host-api.yml up -d mongodb redis
	@docker stop __PROJECT_SLUG__-api 2>/dev/null || true
	@export MONGODB_URL="mongodb://localhost:27017/__PROJECT_SLUG__" REDIS_URL="redis://localhost:6379" NODE_ENV=development PORT=3000 && cd api && pnpm run dev:watch

api-watch-debug: ## As api-watch, with the inspector (BRK=1 to break on start)
	$(DEV_COMPOSE) -f docker/docker-compose.dev-host-api.yml up -d mongodb redis
	@docker stop __PROJECT_SLUG__-api 2>/dev/null || true
	@if [ "$(BRK)" = "1" ]; then \
	  export MONGODB_URL="mongodb://localhost:27017/__PROJECT_SLUG__" REDIS_URL="redis://localhost:6379" NODE_ENV=development PORT=3000 && cd api && pnpm run dev:debug-brk; \
	else \
	  export MONGODB_URL="mongodb://localhost:27017/__PROJECT_SLUG__" REDIS_URL="redis://localhost:6379" NODE_ENV=development PORT=3000 && cd api && pnpm run dev:debug; \
	fi

realtime-dev: ## Run the Socket.IO realtime service on the host
	@export REDIS_URL="$${REDIS_URL:-redis://localhost:6379}" REALTIME_PORT="$${REALTIME_PORT:-3001}" NODE_ENV=development && cd api && pnpm job:realtime

log-agent: ## Run the log agent on the host
	@export LOG_AGENT_SECRET="$${LOG_AGENT_SECRET:-dev-log-agent-secret-min-16}" LOG_AGENT_PORT="$${LOG_AGENT_PORT:-3090}" && cd api && pnpm job:log-agent
