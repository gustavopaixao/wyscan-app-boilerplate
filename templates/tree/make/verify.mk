# verify targets.
.PHONY: push-check push-verify push-verify-run

push-check: $(PUSH_CHECK_DEPS) ## Run every selected workspace's pre-push gate

push-verify: ## Show push-notification verification usage
	@chmod +x scripts/verify-push-local.sh
	@echo "Tier 1 API verification: ACCESS_TOKEN=eyJ... make push-verify-run"
	@echo "Tier 3 test send:        ACCESS_TOKEN=eyJ... SEND_TEST=1 make push-verify-run"

push-verify-run: ## Run push-notification verification (needs ACCESS_TOKEN)
	@chmod +x scripts/verify-push-local.sh
	@test -n "$(ACCESS_TOKEN)" || (echo "Set ACCESS_TOKEN to a logged-in user JWT."; exit 1)
	./scripts/verify-push-local.sh $(if $(SEND_TEST),--send-test,)
