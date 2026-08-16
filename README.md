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
| 2. Makefile / compose decomposition | done |
| 3. CLI, including interactive prompts | done |
| 4. Shared-package modes, generated `CLAUDE.md`, defect fixes | done |
| 5. git init + post-scaffold | done |
| 6. Ship (own CI, push to a remote) | not started |

Deferred: generating `.cursor/` from `.claude/`. The vendored copies work; only
maintenance drift between the two trees is unaddressed.

## Usage

Run it with no arguments for an interactive setup, or drive it entirely by flag:

```bash
node bin/create.mjs --slug my-app --owner my-org ./my-app

  --slug <name>        lowercase, hyphens, 3-44 chars
  --name <display>     default: title-cased slug
  --owner <handle>     GitHub owner/org
  --domain <host>      default: <slug>.com
  --bundle-id <id>     default: com.<slug-without-hyphens>.app
  --workspaces <list>  api,web:site,web:app,web:admin,mobile
  --make-groups <list> Make target groups to include
  --services <list>    compose services to include
  --ai <list>          claude,cursor,github
  --wyscan <mode>      local | registry | standalone
  --config <file>      JSON answers file
  --print-config       resolve and print config, then exit
  --dry-run            show the file plan without writing
  --no-git             skip git init and the initial commit
  --install            run pnpm install per workspace afterwards
  --gh-repo            create a GitHub repo via gh and push
  --force              allow a non-empty target directory
  -y, --yes            accept all defaults, ask nothing
```

Prompts are numbered rather than arrow-driven, so they work over pipes and in
terminals that mishandle raw mode. A non-TTY run falls back to defaults and
errors on a required field instead of hanging.

## Shared-package modes

The reference project's `api/` and `mobile/` consume a sibling repo pair through
pnpm `file:` links — fine on the author's machine, fatal anywhere else. Pick one:

| Mode | Behaviour |
|---|---|
| `standalone` (default) | Linkage removed; local stubs under `packages/stubs/` stand in. Installs from public npm alone. |
| `local` | Unchanged from the reference; `make wyscan-dev-setup` clones the siblings. |
| `registry` | `file:` specs become version ranges resolved from a scoped registry. |

Import specifiers are never rewritten, so moving from `standalone` to `local`
later is a dependency swap, not a code change.

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
