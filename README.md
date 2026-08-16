# wyscan-app-boilerplate

Scaffold a full-stack monorepo — Hono API, three Next.js apps, an Expo mobile app,
a Docker dev stack, a Make-based orchestrator, and Claude/Cursor tooling —
without checking this repo out.

```bash
npx github:<owner>/wyscan-app-boilerplate my-app
```

## Status

| Phase | State |
|---|---|
| 1. Template extraction from the reference project | done |
| 2. Makefile / compose decomposition | not started |
| 3. CLI core (flags, config, dry-run) | done (prompts pending) |
| 4. Shared-package modes, generated `CLAUDE.md`, `.cursor` mirror | partial |
| 5. git init + post-scaffold | not started |
| 6. Ship | not started |

Today the CLI is flag- and config-file-driven. Interactive prompts land in Phase 3.

## Usage

```bash
node bin/create.mjs --slug my-app --owner my-org ./my-app

  --slug <name>        lowercase, hyphens, 3-44 chars
  --name <display>     default: title-cased slug
  --owner <handle>     GitHub owner/org
  --domain <host>      default: <slug>.com
  --bundle-id <id>     default: com.<slug-without-hyphens>.app
  --workspaces <list>  api,web:site,web:app,web:admin,mobile
  --ai <list>          claude,cursor,github
  --wyscan <mode>      local | registry | standalone
  --config <file>      JSON answers file
  --print-config       resolve and print config, then exit
  --dry-run            show the file plan without writing
  --force              allow a non-empty target directory
```

## How it works

`templates/` is a **vendored, tokenized copy** of the reference project. Every
project-specific literal is replaced by a `__SENTINEL__` drawn from an ordered
catalog (`src/tokens/catalog.mjs`), so the templates contain no reference
identity in either file contents or path names.

```
scripts/sync-from-reference.mjs   reference repo -> templates/  (re-runnable)
src/tokens/catalog.mjs            the ordered literal <-> sentinel table
src/generate/plan.mjs             config + manifest -> FileOp[]  (pure)
src/generate/write.mjs            FileOp[] -> disk, restoring file modes
bin/create.mjs                    argv -> config -> plan -> write
```

### Re-syncing from the reference

```bash
npm run sync          # rebuild templates/ from ../botonistas
npm run sync:check    # fail if templates/ has drifted
```

The extractor is driven by `git ls-files`, so untracked material — `node_modules`,
`.next`, the 302 MB `mobile/ios` prebuild, and `mobile/.env` (which holds a real
Apple Team ID) — is excluded by construction rather than by an ignore list.

Two guards run on every sync and fail the build:

- **predecessor residue** — the reference still names *its* own predecessor
  project in comments; those are rewritten by `src/tokens/patches.mjs`, and any
  new occurrence aborts the sync.
- **completeness** — if any reference identity survives tokenization, the
  catalog is incomplete and the sync aborts rather than shipping it.

## Tests

```bash
npm test
```

Generates projects into temp dirs and asserts the properties that matter:
zero reference identity in contents or paths, no unresolved tokens, the
executable bit restored on all 21 scripts (every Claude hook depends on it),
valid JSON throughout, correct directory renaming, no secrets or native build
output, and correct pruning when workspaces or AI tooling are deselected.
