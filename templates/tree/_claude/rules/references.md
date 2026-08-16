<!-- Ported standalone from .cursor/rules/references.mdc (alwaysApply:true). -->

# Project References

## Project Locations

### Mobile (Expo)

- **Location**: `mobile/`
- **Status**: Active development
- **Framework**: React Native (Expo)
- **Note**: iOS and Android ship from the same codebase; native Swift/Kotlin reference implementations live in **WyscanDesignSystem** (`../__ECOSYSTEM_DIR__/DesignSystem` when you run `make wyscan-dev-setup`).

### __ECOSYSTEM_DIR__ (sibling directory, not in this git repo)

- **Layout**: `../__ECOSYSTEM_DIR__/Packages` (WyscanPackages), `../__ECOSYSTEM_DIR__/DesignSystem` (WyscanDesignSystem).
- **Setup**: `make wyscan-dev-setup` or `./scripts/init-wyscan-dev.sh` (optional env: `__PROJECT_CONST___WYSCAN_DEV`, `WYSCAN_PACKAGES_REMOTE`, `WYSCAN_DESIGNSYSTEM_REMOTE`).
- **DesignSystem branch**: `make design-system-setup` or `./scripts/setup-design-system.sh [branch]`

### DesignSystem (WyscanDesignSystem clone)

- **Location on disk**: `../__ECOSYSTEM_DIR__/DesignSystem/`
- **Repo**: git@github.com:__OWNER_HANDLE__/WyscanDesignSystem.git
- **Packages**: WyscanSwiftUI (iOS), WyscanAndroidUI (Android)

## Documentation

### Reference Documentation

- **Location**: `docs/`
- Contains project specifications, PRD, and MVP documentation
- Files:
  - `__PROJECT_SLUG__-spec.md` - MVP specification
  - `__PROJECT_SLUG__-prd.md` - Product Requirements Document

### Feature Documentation

- **Location**: `docs/features/` (active) and `docs/features/archive/` (archived; flat, no range buckets)
- **Purpose**: When new features are implemented, create documentation here
- **Usage**: Specs and implementation notes for features spanning API, web, and mobile
- **Index**: `docs/features/README.md` — generated, lists every feature (active + archived); regenerate with `make features-index`
- **Numbering**: IDs are global and monotonic across both locations — next ID = max(root, archive) + 1; archiving never frees an ID
- **Cross-links**: same level `../NNNN-slug/spec.md`; active → archived `../archive/NNNN-slug/spec.md`; archived → active `../../NNNN-slug/spec.md`
- **Rolling archive policy**: when the root exceeds ~80 entries, archive the oldest with `make features-archive UP_TO=NNNN` (idempotent — moves dirs, rewrites links, regenerates the index, then verifies links)
- **Link verification**: `make docs-links-check` (baseline of known-broken legacy links in `scripts/check-doc-links-baseline.txt`)
