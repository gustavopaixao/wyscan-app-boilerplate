# web:app targets.
.PHONY: app-dev

app-dev: ## Run the member app dev server
	cd web/__PROJECT_SLUG__-app && pnpm dev
