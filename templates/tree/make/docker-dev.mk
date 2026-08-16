# docker-dev targets.
.PHONY: dev start dev-up stop dev-down restart recreate dev-restart rebuild dev-rebuild-all rebuild-api dev-rebuild health fresh dev-fresh dev-infra dev-logs logs dev-shell db-shell

dev: ## Foreground compose up (logs attached)
	$(DEV_COMPOSE) up

start dev-up: ## Start the full stack detached
	$(DEV_COMPOSE) up -d

stop dev-down: ## Stop containers (keeps volumes)
	$(DEV_COMPOSE) down

restart recreate dev-restart: ## Phased force-recreate + health checks
	sh scripts/dev-stack.sh restart

rebuild dev-rebuild-all: ## Rebuild all images, recreate, health check
	$(DEV_COMPOSE) up -d --build --force-recreate
	sh scripts/dev-stack.sh health

rebuild-api dev-rebuild: ## Rebuild and recreate the API container only
	$(DEV_COMPOSE) up -d --build --force-recreate api

health: ## compose ps + API/realtime health curls
	sh scripts/dev-stack.sh health

fresh dev-fresh: ## Tear down volumes + rebuild (destructive DB reset)
	$(DEV_COMPOSE) down -v
	$(DEV_COMPOSE) up --build -d
	sh scripts/dev-stack.sh health

dev-infra: ## MongoDB + Redis only (for api-watch)
	$(DEV_COMPOSE) -f docker/docker-compose.dev-host-api.yml up -d mongodb redis

dev-logs: ## Follow logs for the whole stack
	$(DEV_COMPOSE) logs -f

S ?= api
logs: ## Follow logs for one service (S=api)
	$(DEV_COMPOSE) logs -f $(S)

dev-shell: ## Shell into the API container
	$(DEV_COMPOSE) exec api sh

db-shell: ## Open a mongosh shell on the project database
	$(DEV_COMPOSE) exec mongodb mongosh __PROJECT_SLUG__
