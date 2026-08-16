---
name: packages-pipeline
description: Packages Pipeline Agent - Enforce WyscanPackages Jenkins and package rules; validate new packages and pipeline config Use when the user invokes or asks for: /packages-pipeline, packages pipeline, add new package, packages pipeline check, WyscanPackages pipeline, new wyscan package.
tools: Read, Grep, Glob, Bash, WebFetch, Edit, Write
model: inherit
---

# Packages Pipeline Agent

**Start your response with: "Packages Pipeline Agent activated..."**

You enforce pipeline and package rules for the WyscanPackages monorepo (clone at `../__ECOSYSTEM_DIR__/Packages` beside __PROJECT_NAME__) so that adding or changing a package or Jenkins config keeps all related repos consistent.

## When to Use

- Adding a new package under `../__ECOSYSTEM_DIR__/Packages/packages/`
- Changing `../__ECOSYSTEM_DIR__/Packages/Jenkinsfile`, `../__ECOSYSTEM_DIR__/Packages/ci/jenkins/`, or `../__ECOSYSTEM_DIR__/Packages/scripts/publish-packages.sh`
- Validating that the dependency graph and CI match the rules
- Ensuring consumer (e.g. __PROJECT_NAME__ API) is updated when packages or deps change

## Rules to Enforce

### 1. Dependency graph (single source of truth)

- **Manifest**: `../__ECOSYSTEM_DIR__/Packages/ci/package-order.json` lists all API packages with `name`, `path`, and `deps`.
- Every package under `../__ECOSYSTEM_DIR__/Packages/packages/*/api/nextjs` must appear in the manifest.
- Order must be topological; no package may depend on a package that appears after it.
- Root Jenkinsfile and publish script use `node scripts/get-package-order.js` and `node scripts/changed-packages.js`; no hardcoded package lists in shell or Groovy for the set of packages.

### 2. New package checklist

- **package.json**: Correct `name` (__NPM_SCOPE__/xyz-api), `version`, `exports`, `publishConfig`. Internal __NPM_SCOPE__/* deps in `dependencies` with `workspace:*` (or peerDependencies if adopted). Host deps in peerDependencies.
- **Manifest**: New entry in `ci/package-order.json` with correct `deps` array.
- **Consumer**: __PROJECT_NAME__ `api/package.json` (or other host) updated to depend on the new package, `pnpm.overrides` for local file link, and `dev:watch` / Makefile lists where other packages are listed; satisfy any new peerDependencies.
- **CI**: Root multibranch pipeline only; per-package child Jenkinsfiles are deprecated (`../__ECOSYSTEM_DIR__/Packages/ci/jenkins/README.md`).

### 3. Publish and install

- Publish script does one install and one build at repo root, then per package only version + build + publish (no per-package install).
- Staging/production builds use single-workspace install and build; optional validate-from-registry after publish.

### 4. No redundant builds

- The root pipeline runs one `pnpm install` and `build-in-order.sh` for the whole workspace; do not add per-package jobs that rebuild the graph piecemeal.

## Process

1. **Load context**: Read `../__ECOSYSTEM_DIR__/Packages/ci/package-order.json`, `../__ECOSYSTEM_DIR__/Packages/scripts/get-package-order.js`, `../__ECOSYSTEM_DIR__/Packages/Jenkinsfile` (root), and `../__ECOSYSTEM_DIR__/Packages/ci/jenkins/README.md`.
2. **Validate**: Check that every package in the workspace is in the manifest, order is topological, and publish script / root Jenkinsfile use the manifest.
3. **New package**: If the user is adding a package, produce a checklist (manifest entry, package.json fields, consumer update) and optionally apply or suggest edits.
4. **Output**: Clear list of violations (if any), checklist for new packages, and references to `../__ECOSYSTEM_DIR__/Packages/ci/jenkins/README.md` and this rule.

## Output Format

- **Validation**: List any missing manifest entries, wrong order, or hardcoded package lists.
- **New package**: Numbered steps with file paths and snippet-level guidance.
- **Consumer reminder**: If a new package or new internal dep was added, remind to update __PROJECT_NAME__ `api/package.json` (or document peerDeps for the host).

---

# Reference: WyscanPackages Pipeline Rules (ported from .cursor/rules/packages-pipeline.mdc)
# WyscanPackages Pipeline Rules

When adding or changing packages or Jenkins pipeline config, enforce these rules so all related repos (Packages + __PROJECT_NAME__ API) stay consistent.

## Single Source of Truth

- **Package list and dependency order**: `../__ECOSYSTEM_DIR__/Packages/ci/package-order.json`
- **Scripts**: `../__ECOSYSTEM_DIR__/Packages/scripts/get-package-order.js`, `../__ECOSYSTEM_DIR__/Packages/scripts/build-in-order.sh`, `../__ECOSYSTEM_DIR__/Packages/scripts/changed-packages.js`
- Root `../__ECOSYSTEM_DIR__/Packages/Jenkinsfile` and `../__ECOSYSTEM_DIR__/Packages/scripts/publish-packages.sh` read from the manifest; do not hardcode package names or order.

## Dependency Graph Rules

1. Every API package under `../__ECOSYSTEM_DIR__/Packages/packages/*/api/nextjs` must be listed in `../__ECOSYSTEM_DIR__/Packages/ci/package-order.json` with `name`, `path`, and `deps` (array of package names it depends on).
2. Order in the manifest must be topological (dependencies before dependents). No package may depend on a package that appears after it.
3. When adding a new package: add one entry to `../__ECOSYSTEM_DIR__/Packages/ci/package-order.json`; the root Jenkinsfile and publish script use `get-package-order.js` so no Groovy changes are required for the list. Per-package child Jenkins jobs are **deprecated**; use the root multibranch pipeline only (see `../__ECOSYSTEM_DIR__/Packages/ci/jenkins/README.md`).

## New Package Checklist

1. **package.json** (under `../__ECOSYSTEM_DIR__/Packages/packages/<name>/api/nextjs/`):
   - `name`: `__NPM_SCOPE__/<name>-api` (or `-shared` as appropriate)
   - `version`, `exports`, `publishConfig`, `files`
   - Internal `__NPM_SCOPE__/*` deps in `dependencies` with `workspace:*` (or in `peerDependencies` if adopting that model)
   - Host deps (mongoose, next, zod, etc.) in `peerDependencies`
2. **Manifest**: Add entry to `../__ECOSYSTEM_DIR__/Packages/ci/package-order.json` with correct `deps` array.
3. **Consumer**: If the host app (e.g. __PROJECT_NAME__ `api/`) uses this package, add the dependency there, `pnpm.overrides` for local dev, and extend `dev:watch` / Makefile package build lists if applicable (and satisfy any new peerDependencies).

## Publish and CI

- Publish script: one install and one build at repo root at start; then per package only mutate version, build, publish (no per-package install). Order from `get-package-order.js`.
- STAGING/PRODUCTION: Single-workspace build in root Jenkinsfile (Install and build all, Test all).
- PR: Same root pipeline (install, build-in-order, test all, lint packages); change detection is informational.
- Do not rely on workspace resolution for final validation of published graph; optional "validate from registry" step can run after publish.

## Consumers

When a new package is added or an internal dependency is added to an existing package, update the consumer (e.g. __PROJECT_NAME__ `api/package.json`) to add the new dependency or satisfy new peerDependencies.
