# `templates/authored/` — hand-maintained templates

Everything here is written and maintained **by hand in this repo**. It is the
counterpart to `templates/tree/`, which is machine-extracted from the reference
project.

|  | `templates/tree/` | `templates/authored/` |
|---|---|---|
| Source | `scripts/sync-from-reference.mjs` from `../botonistas` | hand-written |
| Manifest | `templates/manifest.json` (regenerated) | `templates/authored.json` (hand-edited) |
| `npm run sync` | **deleted and rebuilt** | untouched |
| Edit directly? | No — edit the reference, then re-sync | Yes |

## Why this exists

`scripts/sync-from-reference.mjs` does `rmSync(templates/tree)` and rewrites
`templates/manifest.json` wholesale on every run. So a file hand-added under
`templates/tree/` is silently deleted by the next `npm run sync`, and
`sync:check` — which compares the full `manifest.files` JSON against a fresh
extraction — would report drift forever.

Some content simply has no reference to extract from.

**Fastlane** was the first case: the generated project already shipped
`scripts/ship-it.mjs`, the `/ship-it` command, the build-number scripts and the
Fastlane `.gitignore` block, but the reference project has no `mobile/fastlane/`
at all — so `make ship-it` called `make mobile-beta-select`, a target that did
not exist.

**Auth** is the largest case. The reference has no authentication whatsoever —
only the holes left for it: `mobile/app/(auth)/README.md` ("Screens land with
the auth feature"), `web/_app/src/proxy.ts` ("Session gating plugs in here once
auth lands"), and an `api/.env.example` that already declares `JWT_SECRET` and
the OAuth client ids. The whole feature therefore lives here, across
`api/`, `mobile/`, `web/_app/` and `web/_admin/`.

Auth also needs to *hook into* reference files that cannot be hand-edited (the
Hono app must register the routes, the web proxy must gate sessions). Those
hooks live in `src/generate/auth.mjs` and are applied by `transform()` at write
time — anchored on a unique string, and throwing if the anchor is gone, so a
re-sync that reshapes one of those files fails loudly instead of silently
producing a project whose auth was never wired. `test/auth.test.mjs` asserts
every anchor still exists.

`authored/` gives that content a home that survives a re-sync. Because
`sync-from-reference.mjs` only ever writes `templates/tree/` and
`templates/manifest.json`, it needs no knowledge of this directory and
`npm run sync:check` stays green.

**Design system and navigation** followed auth for the same reason: the
reference has tokens but no components, no admin shell and no mobile tab bar.
The mobile navigation was additionally *specified* by a shipped rule
(`.claude/rules/mobile-safe-area.md`) that named components which did not exist.

## Adding a file

Run `npm run manifest` after adding or deleting anything here — it reconciles
`authored.json` with the file tree. It only adds and removes entries; group,
mode and raw on an existing entry are never touched, so hand-set values survive.
`npm run manifest:check` fails when the two have drifted.


1. Put it under `templates/authored/`, mirroring its path in the generated project.
   Dot-prefixed path segments are stored `_`-prefixed, exactly as in `tree/`
   (`mobile/fastlane/_env.example` → `mobile/fastlane/.env.example`).
2. Add an entry to `templates/authored.json` — same schema as `manifest.json`
   (`src` / `dest` / `group` / `mode` / `raw` / `dotEscaped`). `src` is relative to
   `templates/`, so it starts with `authored/`.
3. Use `mode: 755` for anything that must be executable — `write.mjs` restores the
   bit, `writeFileSync` alone would not.
4. Tokens work exactly as in `tree/`: contents and paths both go through
   `render()`, and an unresolved `__SENTINEL__` aborts generation with a rollback.
   Prefer an existing token from `src/tokens/catalog.mjs` over a new one.
5. Never commit a real credential. Ship a `.env.example` and let the generated
   `.gitignore` cover the real file.

## Don't "fix" this by moving it into `tree/`

That is the one change that breaks it. These files have no upstream counterpart;
moving them makes them casualties of the next sync.
