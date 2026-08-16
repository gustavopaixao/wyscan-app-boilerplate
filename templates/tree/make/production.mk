# production targets.
.PHONY: api-production-upgrade api-production-health api-production-restart api-production-restart-api api-production-restart-app

api-production-upgrade: ## Server: pull + restart api and realtime
	@$(MAKE) -C $(API_DEPLOY_DIR) upgrade \
	  VERSION=$(or $(VERSION),latest) \
	  IMAGE_REGISTRY=$(IMAGE_REGISTRY) \
	  $(if $(GIT_PULL),GIT_PULL=$(GIT_PULL),) \
	  $(if $(YES),YES=$(YES),) \
	  $(if $(PUBLIC_HEALTH_URL),PUBLIC_HEALTH_URL=$(PUBLIC_HEALTH_URL),) \
	  $(if $(COMPOSE_FILES),COMPOSE_FILES="$(COMPOSE_FILES)",) \
	  $(if $(REPO_ROOT),REPO_ROOT=$(REPO_ROOT),)

api-production-health: ## Server: compose ps + health curls
	@$(MAKE) -C $(API_DEPLOY_DIR) health \
	  IMAGE_REGISTRY=$(IMAGE_REGISTRY) \
	  $(if $(PUBLIC_HEALTH_URL),PUBLIC_HEALTH_URL=$(PUBLIC_HEALTH_URL),) \
	  $(if $(COMPOSE_FILES),COMPOSE_FILES="$(COMPOSE_FILES)",)

api-production-restart: ## Server: recreate the full stack
	@$(MAKE) -C $(API_DEPLOY_DIR) restart \
	  IMAGE_REGISTRY=$(IMAGE_REGISTRY) \
	  $(if $(PUBLIC_HEALTH_URL),PUBLIC_HEALTH_URL=$(PUBLIC_HEALTH_URL),) \
	  $(if $(COMPOSE_FILES),COMPOSE_FILES="$(COMPOSE_FILES)",)

api-production-restart-api: ## Server: recreate the api container
	@$(MAKE) -C $(API_DEPLOY_DIR) restart-api \
	  IMAGE_REGISTRY=$(IMAGE_REGISTRY) \
	  $(if $(COMPOSE_FILES),COMPOSE_FILES="$(COMPOSE_FILES)",)

api-production-restart-app: ## Server: recreate the app container
	@$(MAKE) -C $(API_DEPLOY_DIR) restart-app \
	  IMAGE_REGISTRY=$(IMAGE_REGISTRY) \
	  $(if $(COMPOSE_FILES),COMPOSE_FILES="$(COMPOSE_FILES)",)
