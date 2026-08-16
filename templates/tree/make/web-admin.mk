# web:admin targets.
.PHONY: admin-dev

admin-dev: ## Run the admin dev server
	cd web/__PROJECT_SLUG__-admin && pnpm dev
