# Ship-it

Start with: **Ship-it Agent activated...**

Follow the full process in [.cursor/agents/ship-it.mdc](../agents/ship-it.mdc) (source of truth). Do not commit, push, or run production server upgrades unless the user explicitly asks.

## Input

The user's message after this command is optional **context** (e.g. "plan only", "ios", "android").

- `/ship-it` — both mobile platforms (default)
- `/ship-it plan only` — dry run (`--plan-only`)
- `/ship-it ios` / `/ship-it android` — ship a single mobile platform (shared buildNumber)

## What to do

1. **Read** `ship-it.mdc` and discover changes since release markers.
2. **Pre-flight** — API lint/type-check/test, mobile typecheck/test, env files, health curl when applicable. On failure: **report + offer to fix**, re-run; never ship on red.
3. **Release notes** (when mobile changed) — invoke the `release-manager-tech-writer` skill to write `docs/runbooks/release-notes/{nextBuild}/{ios,android}.md` (en, pt-BR, pt-PT, es, fr, de, it, nl); leave them uncommitted for review.
4. **Confirm version & build numbers** — show the proposed API version, mobile app version, and next buildNumber (current + 1); ask the user to **confirm or enter manually** before the deployment checklist. A build override flows as `BUILD_NUMBER=N` to `make mobile-beta-select`; version overrides edit the respective `package.json`.
5. **Plan + checklist** — print summary incl. the generated notes; ask the user (multi-select) to **check which deployments to ship** (Docker API / iOS TestFlight / Android internal). Wait for the selection before any release command.
6. **Execute** (only the checked deployments) — run them in parallel: `make api-docker-release TAG=latest` ∥ `make mobile-beta-select PLATFORMS="<selected>" [BUILD_NUMBER=<n>]`. Prefer `make ship-it` / `node scripts/ship-it.mjs` when the selection matches its auto-detected surfaces and no build override was chosen.
7. **Report** — outcomes, uncommitted release-notes paths, `git push` reminder, production server commands (print only), web deploy warnings, and (single-platform) the same-build sync command for the other store.

## Examples

```
/ship-it
/ship-it plan only
/ship-it ios
make ship-it
make ship-it PLATFORMS=ios
make ship-it YES=1
make mobile-beta-select PLATFORMS=ios BUILD_NUMBER=42   # manual build override
node scripts/ship-it.mjs --plan-only --platforms=android
```
