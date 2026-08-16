# docs targets.
.PHONY: features-archive features-index docs-links-check

features-archive: ## Archive docs/features up to UP_TO=NNNN
	@test -n "$(UP_TO)" || { echo "Usage: make features-archive UP_TO=NNNN"; exit 1; }
	node scripts/archive-features.mjs $(UP_TO)

features-index: ## Regenerate the docs/features index
	node scripts/features-index.mjs

docs-links-check: ## Verify relative links across docs and AI configs
	node scripts/check-doc-links.mjs
