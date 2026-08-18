# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **scaffolder**, not an application. `npx github:<owner>/wyscan-app-boilerplate my-app`
writes a full-stack monorepo (Hono API, up to three Next.js apps, Expo mobile,
Docker stack, Make orchestrator, Claude/Cursor/GitHub tooling) into a target
directory. Node 22+, zero runtime dependencies — everything is `node:` builtins.

The generated project is a different thing from this repo. Its stack (pnpm,
Biome, Vitest, Make) is not this repo's stack.

## Commands

```bash
npm test                                   # node:test, all suites
node --test test/modes.test.mjs            # one file
node --test --test-name-pattern "lockfile" # one test by name

npm run sync         # rebuild templates/tree + manifest.json from ../botonistas
npm run sync:check   # exit 1 if templates/ has drifted from the reference

# Reformat templates/authored/ the way the generated project's Biome will want
# it. Needs a generated project with deps installed; see the script header.
npm run format:authored -- /tmp/demo

node bin/create.mjs --slug demo --dry-run          # file plan, nothing written
node bin/create.mjs --slug demo --print-config     # resolved config as JSON
node bin/create.mjs --slug demo --yes /tmp/demo    # non-interactive generate
```

Tests shell out to `bin/create.mjs` and generate real projects into `mkdtemp`
dirs, then assert properties over the tree (no reference identity, no leftover
sentinels, exec bits intact, valid JSON, correct pruning). They are slow by
construction — a few seconds per generated project — and there is no watch mode.

## Pipeline

```
bin/create.mjs         argv/--config -> answers -> derive -> plan -> write -> post
src/cli/flow.mjs       interactive questions; skips anything already known
src/config/derive.mjs  pure: minimal answers -> full value set, plus validate()
src/generate/plan.mjs  pure: manifest + config -> FileOp[]   (all pruning lives here)
src/generate/write.mjs FileOp[] -> disk: render tokens, transform, restore modes
src/post/git.mjs       git init + one commit, optional gh repo, optional pnpm install
```

`derive` and `planFiles` are deliberately I/O-free so the whole decision surface
is unit-testable. Put new **selection/pruning** logic in `plan.mjs`, new
**per-file content edits** in `transforms.mjs`, and new **derived values** in
`derive.mjs`.

## The two template roots

| | `templates/tree/` | `templates/authored/` |
|---|---|---|
| Origin | extracted from `../botonistas` by `scripts/sync-from-reference.mjs` | hand-written here |
| Manifest | `templates/manifest.json` (regenerated wholesale) | `templates/authored.json` (hand-edited) |
| `npm run sync` | `rmSync`'d and rebuilt | untouched |

**Never hand-edit anything under `templates/tree/` or `templates/manifest.json`.**
The next `npm run sync` deletes it and `sync:check` reports drift forever. Fix
the reference project and re-sync, or move the content to `templates/authored/`
(see `templates/authored/README.md`). Both manifests share one entry schema
(`src`/`dest`/`group`/`mode`/`raw`/`dotEscaped`) and `create.mjs` concatenates
their `files` arrays before planning.

`templates/partials/stubs/` is a third, smaller root: local stand-ins for the
shared packages, emitted only in `standalone` mode by `stubFileOps()`.

## Tokenization

`src/tokens/catalog.mjs` is the single ordered literal ↔ sentinel table, used in
both directions.

- **Extraction is order-dependent** — most-specific-first, so `com.botonistas.app`
  is consumed by `__BUNDLE_ID__` before the bare `botonistas` rule sees it. Adding
  a token in the wrong position silently corrupts the templates.
- **Installation is order-independent** (sentinels never nest), but any catalog
  sentinel surviving `render()` aborts generation with a rollback.
- `DENYLIST` protects real substrings that look tokenizable (`wyscan-core` etc.);
  `RESIDUE_TOKENS`/`PREDECESSOR_TOKENS` drive the two sync guards that abort the
  extraction rather than shipping reference identity.
- `RENDER_ONLY_TOKENS` have no reference literal — they are introduced by
  `src/tokens/patches.mjs` (e.g. `__IOS_PROJECT_NAME__`, which `__PROJECT_NAME__`
  cannot express because Expo strips non-alphanumerics).

`patches.mjs` holds fixes for defects in the reference project. The reference is
read-only from here, so patches are applied at extraction time and reapply on
every re-sync.

## Storage-path conventions

Stored template paths carry no reference identity and no live dotfiles:

- Dot segments are stored `_`-prefixed (`.claude/` → `tree/_claude/`). Otherwise a
  stored `.gitignore` would change this repo's git behaviour and a stored
  `.claude/agents/**` would load as **this** repo's agent set. `dest` in the
  manifest carries the real path back.
- Web workspaces are stored generically (`web/botonistas-site/` → `tree/web/_site/`)
  and renamed to `web/<slug>-site/` at write time via `renderPath`.

## Group gating

Every manifest entry has a `group`. `isGroupSelected()` maps it to the config:
`core`/`make`/`scripts`/`docs` always ship; `api`/`mobile`/`web:*` follow
`workspaces`; `ai:claude`/`ai:cursor`/`ai:github` follow `aiTools`.

A `make:<g>` group additionally requires the workspace it drives
(`MAKE_GROUP_REQUIRES`) — otherwise the generated Makefile would `cd` into a
directory that was never created. `makeGroupsFor(workspaces)` derives the default
set, which is why the CLI never asks about Make groups.

## Makefile decomposition

`scripts/split-makefile.mjs` splits the reference's monolithic `Makefile` into
`Makefile.head` plus one `make/<group>.mk` fragment per group, so "include only
what you selected" is file granularity rather than text slicing.

`templates/makefile-groups.json` maps **every** target to a group and a help
string; the splitter aborts on an unmapped target, so a new upstream target can
never be silently dropped. Cross-group prerequisites (`push-check`) are modelled
as a variable each contributing fragment appends to, keeping any subset valid.

## Shared-package modes (`--wyscan`)

The reference consumes a sibling repo pair through pnpm `file:` links. Handled in
`src/generate/wyscan.mjs`: `local` keeps them, `registry` swaps them for version
ranges, `standalone` (default) strips them and vendors the stubs. Import
specifiers are never rewritten, so graduating between modes is a dependency swap.
Anything mode-dependent — lockfile invalidation, `ECOSYSTEM_ONLY_FILES`, the
Metro config rewrite, compose mounts — hangs off `cfg.wyscanMode`.

## Auth

Auth is **always on** — there is no flag. It rides the existing `api`,
`mobile`, `web:app` and `web:admin` groups, and works in all three `--wyscan`
modes:

- `local` / `registry` → the real `<scope>/auth-api` package.
- `standalone` (default) → `templates/partials/stubs/auth-api/`, a full local
  implementation with the same subpath exports and wire contracts.

The reference has no auth at all, so everything lives in `templates/authored/`.
The hooks into reference files that must *call* it (`api/src/app.ts` registering
the routes, `web/_app/src/proxy.ts` gating sessions, `mobile/app/_layout.tsx`
mounting the provider, the locale catalogues) live in `src/generate/auth.mjs`
and run from `transform()`.

**Every hook is anchored on a unique string and throws when the anchor is
missing.** A re-sync that reshapes one of those files must fail loudly rather
than quietly produce a project whose auth was never wired.
`test/auth.test.mjs` asserts each anchor still exists, so the failure lands in
CI instead of in a user's project.

Copy shared by web and mobile is defined once in `src/generate/authStrings.mjs`
and reshaped per consumer (nested for next-intl, flat `auth_*` for mobile), so a
new string cannot land on one and go missing on the other.

## Design system

One visual language across `web:app`, `web:admin` and `mobile`, always on like
auth. Tokens are **appended** to the extracted `globals.css` files and to the
mobile theme barrel by `src/generate/design.mjs` — Tailwind v4 merges `@theme`
blocks and later CSS wins, so an append is order-safe and a re-sync cannot
clobber it.

Mobile is app-local in every `--wyscan` mode. The shared design-system package
(`wyscan-react-native`) is declared in `mobile/package.json` and aliased in
`metro.config.js` but **imported by nothing**, and it must stay that way:
`wyscan.mjs` strips the metro alias in `registry` and `standalone`, deletes the
dependency in `standalone` (it is not in `STUBBED`), and in `registry` leaves it
as a bare version range for a package published nowhere. So an import resolves
only in `local` and breaks the mobile build in the other two — and the mode that
breaks is never the one the author is working in. `components/ui/` reimplements
what is needed; `test/design.test.mjs` fails on any import of the package.

Not to be confused with `<scope>/core-react-native`, which *is* imported
(`createI18n` in `mobile/lib/i18n/engine.ts`) and *is* stubbed in `standalone`,
so it works in all three modes.

Copy shared by web and mobile lives in `src/generate/authStrings.mjs` under two
namespaces — `auth` and `nav` — reshaped per consumer (nested for next-intl,
flat `auth_*` / `nav_*` for mobile), so a string cannot land on one and go
missing on the other.

`templates/authored.json` has grown past hand-editing; `npm run manifest`
reconciles it with the file tree and `npm run manifest:check` fails when they
drift. It only adds and removes entries — every field of an existing entry is
left exactly as written.

## Invariants worth preserving

- **Rollback removes only what the run wrote.** `--force` on a populated
  directory means deleting `targetDir` wholesale is data loss; `create.mjs`
  tracks written files and prunes only those (plus the directory itself when it
  did not pre-exist).
- **Modes are restored from the manifest.** `writeFileSync` drops the exec bit,
  and ~21 shipped files are 0755 — every Claude hook and dev script depends on it.
- **`raw: true` files are copied byte-for-byte.** Only lockfiles qualify;
  substituting them would corrupt integrity hashes.
- **The generated root `CLAUDE.md` is built, not templated** — `claudemd.mjs`
  overrides the reference copy in `transform()`, because the reference's is stale
  and imports none of its own always-apply rules.
- **No secret ever enters a template.** The extractor is driven by `git ls-files`,
  so untracked `.env` files and the 302 MB `mobile/ios` prebuild are excluded by
  construction; authored templates ship `.env.example` only.
