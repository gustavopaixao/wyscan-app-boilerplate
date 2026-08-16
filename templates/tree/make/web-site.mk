# web:site targets.
.PHONY: site-dev

site-dev: ## Run the marketing site dev server
	cd web/__PROJECT_SLUG__-site && pnpm dev
