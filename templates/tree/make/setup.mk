# setup targets.
.PHONY: jwt-secret api-install api-auth-dist design-system-setup wyscan-dev-setup

jwt-secret: ## Generate a strong JWT_SECRET into api/.env (idempotent)
	sh scripts/ensure-jwt-secret.sh

api-install: ## pnpm install in api/
	cd api && pnpm install

api-auth-dist: ## Rebuild shared auth/core package dist into api/node_modules
	cd api && sh scripts/ensure-auth-api-dist.sh

design-system-setup: ## Check out a branch of the shared design system
	chmod +x scripts/setup-design-system.sh
	./scripts/setup-design-system.sh $(V)

wyscan-dev-setup: ## Clone the shared package repos into ../<ecosystem>
	chmod +x scripts/init-wyscan-dev.sh
	./scripts/init-wyscan-dev.sh
