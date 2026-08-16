# api-build targets.
.PHONY: api-build api-lint api-format api-test

# Contributed to `push-check`; correct for any subset of groups.
PUSH_CHECK_DEPS += api-lint api-test

# Contributed to `api-docker-check`; correct for any subset of groups.
API_CHECK_DEPS += api-lint api-test

api-build: ## Compile the API (tsc)
	cd api && pnpm build

api-lint: ## Lint the API (biome)
	cd api && pnpm lint

api-format: ## Format the API (biome)
	cd api && pnpm format

api-test: ## Run API unit tests (vitest)
	cd api && pnpm test
