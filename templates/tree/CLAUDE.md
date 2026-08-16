# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This directory is a fresh restart of the __PROJECT_NAME__ project and contains **no code yet** — only `__PROJECT_SLUG__.code-workspace` and this file. It is not yet a git repository. Once the actual codebase lands here, re-run `/init` to replace this file with real build/test/architecture documentation.

## Context

- The previous iteration of the project lives in `../__PROJECT_SLUG__-old` (Laravel API + web apps, Docker Compose, Make-based workflow — see its `Makefile` for the old commands). Treat it as reference only; do not modify it.
- The VS Code workspace links two sibling folders from the Wyscan ecosystem:
  - `../__ECOSYSTEM_DIR__/DesignSystem` — shared design system (WyscanSwiftUI, WyscanAndroidUI, WyscanReactNative).
  - `../__ECOSYSTEM_DIR__/Packages` — pnpm monorepo of `wyscan-*` packages (auth, core, analytics, messaging, etc.), linted/formatted with Biome.
- The workspace's `search.exclude` includes `.expo`, suggesting the new app is planned as an Expo/React Native project, but nothing has been scaffolded yet.
