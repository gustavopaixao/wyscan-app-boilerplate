# docker-release targets.
.PHONY: api-docker-check api-docker-validate-version api-docker-build api-docker-push api-docker-login api-docker-release api-deploy-bundle

api-docker-check: $(API_CHECK_DEPS) ## Lint + test gate before building an image

api-docker-validate-version: ## Assert the release version is x.y.z
	@node -e "const v='$(DOCKER_VERSION)'; if(!v||!/^\d+\.\d+\.\d+$$/.test(v)) { console.error('Invalid or missing version:', v||'(empty)'); console.error('Set VERSION= or fix api/package.json (expected x.y.z)'); process.exit(1); }"

api-docker-build: api-docker-check api-docker-validate-version ## Build the production API image
	@if [ -n "$(VERSION)" ]; then \
	  echo "Using VERSION=$(VERSION) override"; \
	else \
	  echo "Using version $(DOCKER_VERSION) from api/package.json"; \
	fi
	@if [ "$(WYSCAN_SOURCE)" = "local" ]; then \
	  test -d "$(WYSCAN_PACKAGES)" || (echo "WYSCAN_PACKAGES not found at $(WYSCAN_PACKAGES); run make wyscan-dev-setup or set WYSCAN_PACKAGES"; exit 1); \
	fi
	@$(DOCKER_BUILD_ENV) \
	if [ "$(WYSCAN_SOURCE)" = "registry" ]; then \
	  test -n "$$NPM_TOKEN" || (echo "NPM_TOKEN required when WYSCAN_SOURCE=registry — set in docker/build.env (see docker/build.env.example) or export it"; exit 1); \
	fi
	@mkdir -p .docker-empty-wyscan
	@echo "Building $(API_IMAGE):$(DOCKER_VERSION) for platform $(DOCKER_PLATFORM)"
	@$(DOCKER_BUILD_ENV) \
	WYSCAN_CTX="$(WYSCAN_PACKAGES)"; \
	if [ "$(WYSCAN_SOURCE)" = "registry" ]; then WYSCAN_CTX=".docker-empty-wyscan"; fi; \
	docker build \
	  --platform "$(DOCKER_PLATFORM)" \
	  -f api/Dockerfile \
	  --target production \
	  --build-arg DEPLOY_ENV=$(DOCKER_DEPLOY_ENV) \
	  --build-arg NPM_TOKEN=$${NPM_TOKEN:-} \
	  --build-context wyscan-packages="$$WYSCAN_CTX" \
	  -t "$(API_IMAGE):$(DOCKER_VERSION)" \
	  .

api-docker-push: api-docker-validate-version ## Push the API image to the registry
	@if [ -n "$(VERSION)" ]; then \
	  echo "Using VERSION=$(VERSION) override"; \
	else \
	  echo "Using version $(DOCKER_VERSION) from api/package.json"; \
	fi
	@docker tag "$(API_IMAGE):$(DOCKER_VERSION)" "$(API_IMAGE):$(DOCKER_VERSION)"
	@docker push "$(API_IMAGE):$(DOCKER_VERSION)"
	@if [ -n "$(TAG)" ] && [ "$(TAG)" != "$(DOCKER_VERSION)" ]; then \
	  docker tag "$(API_IMAGE):$(DOCKER_VERSION)" "$(API_IMAGE):$(TAG)"; \
	  docker push "$(API_IMAGE):$(TAG)"; \
	fi
	@if [ -n "$(GIT_SHA)" ]; then \
	  docker tag "$(API_IMAGE):$(DOCKER_VERSION)" "$(API_IMAGE):$(DOCKER_VERSION)-$(GIT_SHA)"; \
	  docker push "$(API_IMAGE):$(DOCKER_VERSION)-$(GIT_SHA)"; \
	fi

api-docker-login: ## Log in to the container registry
	@$(DOCKER_BUILD_ENV) \
	test -n "$$GITHUB_TOKEN" || (echo "GITHUB_TOKEN required — set in docker/build.env (see docker/build.env.example) or export it"; exit 1); \
	test -n "$$GITHUB_USER" || (echo "GITHUB_USER required — set in docker/build.env (see docker/build.env.example) or export it"; exit 1); \
	echo "$$GITHUB_TOKEN" | docker login ghcr.io -u "$$GITHUB_USER" --password-stdin

api-docker-release: ## Lint, test, build, push, then bump the patch version
	@if [ -n "$(VERSION)" ]; then \
	  echo "WARN: VERSION= is ignored for api-docker-release — using api/package.json"; \
	fi
	@set -eu; \
	RELEASE_VER=$$(node -p "JSON.parse(require('fs').readFileSync('api/package.json','utf8')).version"); \
	node -e "const v='$$RELEASE_VER'; if(!/^\d+\.\d+\.\d+$$/.test(v)) { console.error('Invalid api/package.json version:', v, '(expected x.y.z)'); process.exit(1); }"; \
	echo "Releasing API version $$RELEASE_VER from api/package.json"; \
	$(MAKE) api-docker-build VERSION=$$RELEASE_VER; \
	$(MAKE) api-docker-login; \
	$(MAKE) api-docker-push VERSION=$$RELEASE_VER; \
	if [ "$(SKIP_VERSION_BUMP)" = "1" ]; then \
	  echo "SKIP_VERSION_BUMP=1 — skipping version bump"; \
	else \
	  NEW_VER=$$(node api/scripts/bump-patch-version.mjs); \
	  echo "Bumped api/package.json to $$NEW_VER"; \
	  if [ "$(SKIP_VERSION_COMMIT)" != "1" ]; then \
	    git add api/package.json; \
	    git commit -m "chore(api): bump version to $$NEW_VER" || { \
	      echo "git commit failed — api/package.json is at $$NEW_VER; commit manually"; exit 1; \
	    }; \
	  fi; \
	fi

api-deploy-bundle: api-docker-validate-version ## Tar docker/deploy for rsync to a server
	@if [ -n "$(VERSION)" ]; then \
	  echo "Using VERSION=$(VERSION) override"; \
	else \
	  echo "Using version $(DOCKER_VERSION) from api/package.json"; \
	fi
	@mkdir -p dist
	@TMP=$$(mktemp -d); \
	BUNDLE="$$TMP/__PROJECT_SLUG__-api-deploy-$(DOCKER_VERSION)"; \
	mkdir -p "$$BUNDLE/nginx" "$$BUNDLE/scripts"; \
	cp docker/deploy/Makefile docker/deploy/docker-compose.yml docker/deploy/docker-compose.mongodb-bundled.yml \
	  docker/deploy/docker-compose.mongodb-external.yml docker/deploy/.env.example docker/deploy/setup.sh "$$BUNDLE/"; \
	cp docker/deploy/nginx/host-nginx.conf.example "$$BUNDLE/nginx/"; \
	cp docker/deploy/scripts/*.sh docker/deploy/scripts/*.js "$$BUNDLE/scripts/" 2>/dev/null || true; \
	echo "$(DOCKER_VERSION)" > "$$BUNDLE/VERSION"; \
	tar -czf "dist/__PROJECT_SLUG__-api-deploy-$(DOCKER_VERSION).tar.gz" -C "$$TMP" "__PROJECT_SLUG__-api-deploy-$(DOCKER_VERSION)"; \
	rm -rf "$$TMP"; \
	echo "Created dist/__PROJECT_SLUG__-api-deploy-$(DOCKER_VERSION).tar.gz"
