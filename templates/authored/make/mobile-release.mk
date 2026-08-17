# mobile release targets (Fastlane: TestFlight + Play).
#
# Hand-maintained fragment. Unlike make/mobile.mk this one is NOT derived from the
# reference project — see templates/authored/README.md in the generator.
.PHONY: mobile-release-check mobile-prebuild mobile-set-build mobile-verify-build-sync mobile-beta mobile-beta-select mobile-ios-beta mobile-ios-upload-beta mobile-ios-release mobile-android-preflight mobile-android-beta mobile-android-upload-beta mobile-android-release

MOBILE_FASTLANE_ENV := mobile/fastlane/.env
# Every release target sources fastlane/.env first, so VERSION/BUILD resolution and
# the HTTPS guards see the same values the Fastfile will.
MOBILE_RELEASE_ENV = set -a; [ -f $(MOBILE_FASTLANE_ENV) ] && . $(MOBILE_FASTLANE_ENV); set +a;
# Prints `export VERSION=... BUILD=...` from mobile/package.json, refusing a BUILD
# that disagrees with it unless ALLOW_BUILD_OVERRIDE=1.
MOBILE_READ_RELEASE = eval "$$(VERSION='$(VERSION)' BUILD='$(BUILD)' node mobile/scripts/read-release-version.mjs)"

# Which platforms `mobile-beta-select` ships. `make ship-it` sets this explicitly.
PLATFORMS ?= ios android

mobile-release-check: ## Check Fastlane credentials and env without building
	@$(MOBILE_RELEASE_ENV) \
	MISSING=""; \
	[ -f $(MOBILE_FASTLANE_ENV) ] || { \
	  echo "$(MOBILE_FASTLANE_ENV) is missing — copy it from mobile/fastlane/.env.example"; exit 1; \
	}; \
	echo "$(MOBILE_FASTLANE_ENV) found"; \
	case "$${EXPO_PUBLIC_API_URL:-}" in \
	  https://*) echo "EXPO_PUBLIC_API_URL=$$EXPO_PUBLIC_API_URL";; \
	  "") MISSING="$$MISSING EXPO_PUBLIC_API_URL";; \
	  *) echo "EXPO_PUBLIC_API_URL must be HTTPS (got $$EXPO_PUBLIC_API_URL)"; MISSING="$$MISSING EXPO_PUBLIC_API_URL";; \
	esac; \
	for v in APPLE_TEAM_ID APP_STORE_CONNECT_API_KEY_ID APP_STORE_CONNECT_ISSUER_ID APP_STORE_CONNECT_API_KEY_PATH; do \
	  eval "val=\$$$$v"; [ -n "$$val" ] || MISSING="$$MISSING $$v"; \
	done; \
	for v in SUPPLY_JSON_KEY_PATH ANDROID_KEYSTORE_PATH ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD; do \
	  eval "val=\$$$$v"; [ -n "$$val" ] || MISSING="$$MISSING $$v"; \
	done; \
	for pair in "APP_STORE_CONNECT_API_KEY_PATH:App Store Connect key" "SUPPLY_JSON_KEY_PATH:Play service account" "ANDROID_KEYSTORE_PATH:upload keystore"; do \
	  v=$${pair%%:*}; label=$${pair#*:}; eval "val=\$$$$v"; \
	  if [ -n "$$val" ]; then \
	    p="mobile/$${val#./}"; \
	    [ -f "$$p" ] && echo "$$label: $$p" || echo "MISSING FILE — $$label expected at $$p"; \
	  fi; \
	done; \
	(cd mobile && bundle check >/dev/null 2>&1) && echo "Ruby gems installed" || echo "Ruby gems missing — run: cd mobile && bundle install"; \
	$(MOBILE_READ_RELEASE); \
	echo "Would ship VERSION=$$VERSION BUILD=$$BUILD"; \
	if [ -n "$$MISSING" ]; then \
	  echo ""; echo "Unset in $(MOBILE_FASTLANE_ENV):$$MISSING"; exit 1; \
	fi; \
	echo "Release env OK"

mobile-prebuild: ## Regenerate mobile/ios + mobile/android from app.config.ts
	@$(MOBILE_RELEASE_ENV) \
	test -n "$$EXPO_PUBLIC_API_URL" || { \
	  echo "EXPO_PUBLIC_API_URL is required (HTTPS); set it in $(MOBILE_FASTLANE_ENV) or export it"; exit 1; \
	}; \
	$(MOBILE_READ_RELEASE); \
	echo "Prebuild VERSION=$$VERSION BUILD=$$BUILD"; \
	cd mobile && VERSION="$$VERSION" BUILD="$$BUILD" EXPO_PUBLIC_API_URL="$$EXPO_PUBLIC_API_URL" \
	  sh scripts/prebuild-release.sh all

mobile-set-build: ## Set mobile buildNumber (BUILD=42)
	@test -n "$(BUILD)" || { echo "BUILD is required, e.g. make mobile-set-build BUILD=42"; exit 1; }
	@NEW_BUILD=$$(node mobile/scripts/set-build-number.mjs "$(BUILD)"); \
	echo "Set mobile/package.json buildNumber to $$NEW_BUILD"

mobile-verify-build-sync: ## Check native build numbers match mobile/package.json
	@$(MOBILE_READ_RELEASE); \
	BUILD="$$BUILD" node mobile/scripts/verify-build-number-sync.mjs --platform=all

# --- Beta (TestFlight + Play internal) --------------------------------------
#
# Bumps buildNumber once, commits it, then ships each platform at that SAME build
# so a tester report maps to one number across both stores. Sequential on purpose:
# both platforms prebuild into the shared mobile/ios + mobile/android dirs, so a
# parallel run races and corrupts the native projects.
#
# SKIP_BUILD_BUMP=1    reuse the current buildNumber (retry a half-shipped release)
# SKIP_BUILD_COMMIT=1  bump but do not commit
# BUILD_NUMBER=N       set an explicit build instead of bumping

mobile-beta: ## Ship a beta to TestFlight and Play internal (bumps build)
	@$(MAKE) mobile-beta-select PLATFORMS="ios android"

# Two recipe lines on purpose. GNU make executes any recipe line containing
# `$(MAKE)` even under `-n`, so the build-number bump and its commit must live on
# a line that has none — otherwise `make -n mobile-beta` would really bump and
# really commit. Keep the mutating step and the recursive dispatch separate.
mobile-beta-select: ## Ship a beta to PLATFORMS="ios android"
	@test -n "$(strip $(PLATFORMS))" || { \
	  echo "PLATFORMS is empty (expected 'ios', 'android', or 'ios android')"; exit 1; \
	}
	@set -eu; \
	for p in $(PLATFORMS); do \
	  case "$$p" in \
	    ios|android) ;; \
	    *) echo "Invalid PLATFORMS entry: $$p (expected 'ios' and/or 'android')"; exit 1;; \
	  esac; \
	done; \
	if [ "$(SKIP_BUILD_BUMP)" != "1" ]; then \
	  if [ -n "$(BUILD_NUMBER)" ]; then \
	    NEW_BUILD=$$(node mobile/scripts/set-build-number.mjs "$(BUILD_NUMBER)"); \
	    echo "Set mobile/package.json buildNumber to $$NEW_BUILD"; \
	  else \
	    NEW_BUILD=$$(node mobile/scripts/bump-build-number.mjs); \
	    echo "Bumped mobile/package.json buildNumber to $$NEW_BUILD"; \
	  fi; \
	  if [ "$(SKIP_BUILD_COMMIT)" != "1" ]; then \
	    git add mobile/package.json; \
	    git commit -m "chore(mobile): bump buildNumber to $$NEW_BUILD" || { \
	      echo "git commit failed — mobile/package.json is at buildNumber $$NEW_BUILD; commit it manually"; exit 1; \
	    }; \
	  fi; \
	fi
	@set -eu; \
	HAS_IOS=0; HAS_ANDROID=0; \
	for p in $(PLATFORMS); do \
	  [ "$$p" = "ios" ] && HAS_IOS=1 || true; \
	  [ "$$p" = "android" ] && HAS_ANDROID=1 || true; \
	done; \
	$(MOBILE_READ_RELEASE); \
	echo "Mobile beta VERSION=$$VERSION BUILD=$$BUILD PLATFORMS=$(PLATFORMS)"; \
	if [ $$HAS_IOS -eq 1 ]; then \
	  echo "==> iOS beta (build $$BUILD)"; \
	  $(MAKE) mobile-ios-beta || { \
	    echo "Mobile beta failed (ios)"; \
	    echo "Retry: SKIP_BUILD_BUMP=1 make mobile-ios-beta"; \
	    exit 1; \
	  }; \
	fi; \
	if [ $$HAS_ANDROID -eq 1 ]; then \
	  echo "==> Android beta (build $$BUILD)"; \
	  $(MAKE) mobile-android-beta || { \
	    echo "Mobile beta failed (android)"; \
	    echo "Retry: SKIP_BUILD_BUMP=1 make mobile-android-beta"; \
	    exit 1; \
	  }; \
	fi; \
	if [ $$HAS_IOS -eq 1 ] && [ $$HAS_ANDROID -eq 1 ]; then VP=all; \
	elif [ $$HAS_IOS -eq 1 ]; then VP=ios; else VP=android; fi; \
	BUILD="$$BUILD" node mobile/scripts/verify-build-number-sync.mjs --platform=$$VP; \
	if [ "$$VP" != "all" ]; then \
	  OTHER=$$([ "$$VP" = "ios" ] && echo android || echo ios); \
	  echo "Note: $$OTHER not shipped this run — sync it to build $$BUILD with: SKIP_BUILD_BUMP=1 make mobile-$$OTHER-beta"; \
	fi

# --- iOS --------------------------------------------------------------------
mobile-ios-beta: ## Build and upload iOS to TestFlight
	@$(MOBILE_RELEASE_ENV) \
	$(MOBILE_READ_RELEASE); \
	echo "iOS beta VERSION=$$VERSION BUILD=$$BUILD"; \
	cd mobile && VERSION="$$VERSION" BUILD="$$BUILD" bundle exec fastlane ios beta

mobile-ios-upload-beta: ## Upload the existing IPA to TestFlight (no build)
	@$(MOBILE_RELEASE_ENV) \
	$(MOBILE_READ_RELEASE); \
	echo "iOS upload beta VERSION=$$VERSION BUILD=$$BUILD"; \
	cd mobile && VERSION="$$VERSION" BUILD="$$BUILD" bundle exec fastlane ios upload_beta

mobile-ios-release: ## Build and upload iOS to App Store Connect (no review submit)
	@$(MOBILE_RELEASE_ENV) \
	$(MOBILE_READ_RELEASE); \
	echo "iOS release VERSION=$$VERSION BUILD=$$BUILD"; \
	cd mobile && VERSION="$$VERSION" BUILD="$$BUILD" bundle exec fastlane ios release

# --- Android ----------------------------------------------------------------
mobile-android-preflight: ## Check the Android toolchain, keystore and Play key
	@./mobile/scripts/android-play-preflight.sh

mobile-android-beta: ## Build an AAB and upload to the Play internal track
	@$(MOBILE_RELEASE_ENV) \
	$(MOBILE_READ_RELEASE); \
	echo "Android beta VERSION=$$VERSION BUILD=$$BUILD"; \
	cd mobile && VERSION="$$VERSION" BUILD="$$BUILD" bundle exec fastlane android beta

mobile-android-upload-beta: ## Upload the existing AAB to Play internal (no build)
	@$(MOBILE_RELEASE_ENV) \
	$(MOBILE_READ_RELEASE); \
	echo "Android upload beta VERSION=$$VERSION BUILD=$$BUILD"; \
	cd mobile && VERSION="$$VERSION" BUILD="$$BUILD" bundle exec fastlane android upload_beta

mobile-android-release: ## Build an AAB and upload to Play production as a draft
	@$(MOBILE_RELEASE_ENV) \
	$(MOBILE_READ_RELEASE); \
	echo "Android release VERSION=$$VERSION BUILD=$$BUILD"; \
	cd mobile && VERSION="$$VERSION" BUILD="$$BUILD" bundle exec fastlane android release
