# mobile targets.
.PHONY: mobile-dev mobile-ios mobile-ios-device mobile-ios-list mobile-android mobile-android-device mobile-android-list mobile-android-emulator mobile-android-up mobile-android-wait mobile-android-kill mobile-android-reverse mobile-typecheck mobile-test mobile-check

# Contributed to `push-check`; correct for any subset of groups.
PUSH_CHECK_DEPS += mobile-typecheck

# Physical devices cannot reach localhost — hostname must resolve on phone and Mac.
# Expo --host only accepts lan|tunnel|localhost; REACT_NATIVE_PACKAGER_HOSTNAME sets the device URL host.
MOBILE_DEV_HOST ?= __DEV_HOST__
MOBILE_EXPO_HOST ?= lan
MOBILE_EXPO_ENV = REACT_NATIVE_PACKAGER_HOSTNAME=$(MOBILE_DEV_HOST) EXPO_PUBLIC_API_URL=$${EXPO_PUBLIC_API_URL:-http://$(MOBILE_DEV_HOST):8080} EXPO_PUBLIC_DEV_HOST=$(MOBILE_DEV_HOST)
mobile-dev: ## Start Expo (Metro) on the LAN
	cd mobile && $(MOBILE_EXPO_ENV) pnpm exec expo start --host $(MOBILE_EXPO_HOST)

# iOS simulator: IOS_DEVICE=name or UDID (expo run:ios -d).
IOS_DEVICE ?=
MOBILE_IOS_DEVICE_ARGS = $(if $(IOS_DEVICE),--device "$(IOS_DEVICE)",)
mobile-ios: ## Native iOS debug build on a simulator
	cd mobile && $(MOBILE_EXPO_ENV) pnpm exec expo run:ios $(MOBILE_IOS_DEVICE_ARGS)

# Physical device: Metro must already be running (make mobile-dev). Avoids localhost bundler.
mobile-ios-device: ## Native iOS build on a physical iPhone
	cd mobile && $(MOBILE_EXPO_ENV) pnpm exec expo run:ios --device --no-bundler

mobile-ios-list: ## List available iPhone simulators
	@xcrun simctl list devices available | grep -E '^\s+iPhone' || true

# ANDROID_DEVICE=name or serial from `make mobile-android-list`; omit to let Expo pick.
mobile-android: ## Native Android debug build
	cd mobile && $(MOBILE_EXPO_ENV) pnpm exec expo run:android $(MOBILE_ANDROID_RUN_ARGS)

ANDROID_HOME ?= $(HOME)/Library/Android/sdk
ANDROID_EMULATOR = $(ANDROID_HOME)/emulator/emulator
ANDROID_DEVICE ?=
AVD ?=
MOBILE_ANDROID_RUN_ARGS = $(if $(ANDROID_DEVICE),--device "$(ANDROID_DEVICE)",)
MOBILE_ANDROID_DEVICE_ARGS = $(if $(ANDROID_DEVICE),--device "$(ANDROID_DEVICE)",--device)
mobile-android-device: ## Native Android build on a physical device
	cd mobile && $(MOBILE_EXPO_ENV) pnpm exec expo run:android $(MOBILE_ANDROID_DEVICE_ARGS) --no-bundler

mobile-android-list: ## List bootable AVDs and attached devices
	@echo "Available emulators (AVDs) — boot with: make mobile-android-emulator AVD=<name>"
	@$(ANDROID_EMULATOR) -list-avds 2>/dev/null || echo "  (none — create one in Android Studio > Device Manager)"
	@echo ""
	@echo "Attached now (emulators booted + USB devices):"
	@adb devices -l 2>/dev/null | tail -n +2 | grep . || echo "  (none)"

mobile-android-emulator: ## Boot an emulator (AVD=name, WIPE=1)
	@test -n "$(AVD)" || { echo "AVD is required — see: make mobile-android-list"; exit 1; }
	$(ANDROID_EMULATOR) -avd "$(AVD)" $(if $(WIPE),-wipe-data,) >/dev/null 2>&1 &
	@echo "Booting $(AVD)$(if $(WIPE), (data wiped),)… wait for the home screen, then: make mobile-android"

mobile-android-up: ## Boot emulator, wait, build and install (one shot)
	@AVD_NAME="$(AVD)"; \
	if [ -z "$$AVD_NAME" ]; then \
	  AVD_NAME=$$($(ANDROID_EMULATOR) -list-avds 2>/dev/null | head -1); \
	fi; \
	if [ -z "$$AVD_NAME" ]; then \
	  echo "No AVD found — create one in Android Studio > Device Manager"; exit 1; \
	fi; \
	if adb devices 2>/dev/null | grep -q "^emulator-"; then \
	  echo "Emulator already attached — skipping boot (use mobile-android-kill to restart)."; \
	else \
	  echo "Booting $$AVD_NAME..."; \
	  $(ANDROID_EMULATOR) -avd "$$AVD_NAME" $(if $(WIPE),-wipe-data,) >/dev/null 2>&1 & \
	fi
	@$(MAKE) mobile-android-wait
	@$(MAKE) mobile-android

mobile-android-wait: ## Block until the emulator finishes booting
	@adb wait-for-device
	@until [ "$$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do \
	  printf "."; sleep 2; \
	done; echo ""
	@echo "Emulator booted — safe to run make mobile-android."

mobile-android-kill: ## Stop emulators and clear stale AVD locks
	-@adb emu kill 2>/dev/null
	-@pkill -f qemu-system 2>/dev/null
	-@rm -rf $(HOME)/.android/avd/*.avd/*.lock
	@echo "Emulators stopped, stale AVD locks cleared."

# Point the device's localhost at the Mac: 8081 = Metro, 8080 = Nginx/API.
mobile-android-reverse: ## adb reverse 8081/8080 for localhost access
	@adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8080 tcp:8080 && \
	  echo "adb reverse ready — now: make mobile-android-device MOBILE_DEV_HOST=localhost"

mobile-typecheck: ## Type-check the mobile app (tsc --noEmit)
	cd mobile && pnpm typecheck

mobile-test: ## Run mobile unit tests (vitest)
	cd mobile && pnpm test

mobile-check: mobile-typecheck mobile-test ## Mobile type-check + tests
