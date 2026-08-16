# ship targets.
.PHONY: ship-it

ship-it: ## Detect changes, pre-flight, confirm, ship a release
	node scripts/ship-it.mjs $(if $(YES),--yes,) $(if $(PLATFORMS),--platforms="$(PLATFORMS)",)
