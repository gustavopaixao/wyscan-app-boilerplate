---
name: release-manager-tech-writer
description: When a new iOS or Android build is generated, after bumping build version, or when the user asks for release notes, TestFlight notes, or Play Store what's new
---

# Release Manager Tech Writer Skill

**When to apply:** When a new mobile build is about to ship, after bumping `buildNumber`, or when
the user (or the **ship-it** agent) asks for release notes, TestFlight notes, or Play Store
"what's new".

__PROJECT_NAME__ is an **Expo (React Native)** app — one codebase ships iOS and Android. There is **no**
`project.pbxproj` `CURRENT_PROJECT_VERSION` or `build.gradle.kts` `versionCode` to read by hand:
the marketing version and build counter both come from **`mobile/package.json`** (`version` and
`buildNumber`), and the native files are generated from it at build time.

## Where release notes live

```
docs/runbooks/release-notes/{buildNumber}/
  ios.md       # TestFlight → App Store  (Promotional Text + What's New)
  android.md   # Internal testing → Play (condensed Release notes)
```

One directory per build/versionCode (they share the same number). Examples: `27/`, `28/`.

## Workflow

1. **Determine target build + version.**
   - `BUILD` (target): the build being shipped. Default = `mobile/package.json` `buildNumber` **+ 1**
     (ship-it bumps the counter at build time), unless the caller passes an explicit number.
   - `VERSION`: `mobile/package.json` `version` (e.g. `1.2.0`).
   - **Previous build:** the highest existing numbered directory under
     `docs/runbooks/release-notes/` (e.g. if `24/ 26/ 27/ 28/` exist, previous = `28`). Read it for
     the "Previous production" line and to avoid repeating already-shipped copy.

2. **Find the change range.** Use the **same marker** ship-it uses:
   ```bash
   git log --grep="chore(mobile): bump buildNumber" --format=%H -n 1   # last mobile marker
   git log <marker>..HEAD --oneline                                    # changes since it
   ```
   If no marker exists, fall back to `origin/main..HEAD` (then `main..HEAD`).

3. **Categorize** commits into user-facing buckets — Features (`feat`), Improvements
   (`refactor`/`style`/polish), Bug fixes (`fix`). Keep feature IDs (e.g. `0134`) for the internal
   section only. Drop backend/admin/ops-only changes from store copy (they go in the internal table).

4. **Write both files** following the template below. Generate **8 store-copy languages** — the same
   set the app ships in `mobile/locales/*.json`, so store copy never lags in-app translation:

   | App locale | iOS (App Store Connect locale) | Android (Play listing code) |
   |------------|--------------------------------|-----------------------------|
   | `en`    | English (U.S.)          | `en-US` |
   | `pt-BR` | Portuguese (Brazil)     | `pt-BR` |
   | `pt-PT` | Portuguese (Portugal)   | `pt-PT` |
   | `es`    | Spanish (Mexico/Spain)  | `es-ES` |
   | `fr`    | French                  | `fr-FR` |
   | `de`    | German                  | `de-DE` |
   | `it`    | Italian                 | `it-IT` |
   | `nl`    | Dutch                   | `nl-NL` |

   If a new locale is added to `mobile/locales/`, add it here too. Leave files **uncommitted** for
   review unless told otherwise.

## Output format

### `ios.md`

````markdown
# Palpite PRO — iOS release notes (version {VERSION}, build {BUILD})

| Field | Value |
|-------|--------|
| Version | {VERSION} |
| Build | {BUILD} |
| Previous production | {PREV_VERSION} (build {PREV_BUILD}) |
| Platform | iOS |
| Track | TestFlight → App Store |

**Status:** Ready to build. …

**API compatibility:** … (state whether the current API is backward-compatible with the previous
build; note any version gating / required-field changes; remind to deploy the API first).

**Commit range:** `<prev-marker-sha>` (bump buildNumber to {PREV_BUILD}) → `HEAD` ({VERSION} build {BUILD})

---

## English (en-US)

### Promotional Text (170 chars max)

```
<one-line promo>
```

| Chars | ~NNN / 170 |

### What's New (4000 chars max)

```
What's New

• <feature bullet>
…
```

| Chars | ~NNN / 4000 |

---

## Portuguese (Brazil) (pt-BR)
## Portuguese (Portugal) (pt-PT)
## Spanish (es)
## French (fr)
## German (de)
## Italian (it)
## Dutch (nl)

<!-- each language: localized Promotional Text (≤170) + What's New (≤4000), with char counts -->

---

## App Store Connect — paste map

| Field | Locale | Section above |
|-------|--------|----------------|
| Promotional Text | English (U.S.) | English — Promotional Text |
| What's New in This Version | English (U.S.) | English — What's New |
| … one row per locale per field, all 8 locales, field names in that locale … |

### Manual steps after upload

1. App Store Connect → create version **{VERSION}**.
2. Select **build {BUILD}** (wait for processing if needed).
3. Paste Promotional Text and What's New per locale from sections above.
4. **App Privacy:** confirm data categories vs build {PREV_BUILD}.
5. Submit for review.

> **Store localizations:** per `docs/runbooks/stores/listings.md`, listings currently exist for
> **en, pt-BR, es, fr, de** only. Still write copy for **pt-PT, it and nl**, but flag in the manual
> steps that those locales need their localization created in App Store Connect / Play Console
> before the copy has anywhere to be pasted — otherwise those regions fall back to English.

---

## Internal — changes since build {PREV_BUILD}

User-facing (included above):

| Area | Summary |
|------|---------|
| … | … (with feature IDs) |

Not in store copy (backend / admin / ops):

- … (migrations, admin settings, site changes, API compatibility note)
````

### `android.md`

Same header/metadata (use **Version name** / **Version code** / "Internal testing → Production"),
add the parity + API-compatibility notes, then:

```markdown
> Google Play "What's new" is limited to **500 characters per language** — the notes below are the
> condensed version of the iOS What's New.
```

Then a single **Release notes — Play Console paste block** that wraps every language in Google
Play's per-locale `<locale>…</locale>` tags, so the whole block pastes into the "What's new" field
at once. Use BCP-47 listing codes: `en-US`, `pt-BR`, `pt-PT`, `es-ES`, `fr-FR`, `de-DE`, `it-IT`,
`nl-NL`. Each language stays ≤500 chars. Follow the block with a char-count table (one row per
locale — all 8), then the same
**Internal — changes since versionCode {PREV_BUILD}** section.

````markdown
## Release notes — Play Console paste block

Paste this whole block into the Play Console "What's new" field (release notes accept per-locale
`<locale>…</locale>` tags). Each language stays under the **500-char** limit.

```
<en-US>
• <bullet>
…
</en-US>
<pt-BR>
• <bullet>
…
</pt-BR>
<pt-PT>
…
</pt-PT>
<es-ES>
…
</es-ES>
<fr-FR>
…
</fr-FR>
<de-DE>
…
</de-DE>
<it-IT>
…
</it-IT>
<nl-NL>
…
</nl-NL>
```

| Locale | Chars |
|--------|-------|
| en-US | ~NNN / 500 |
| pt-BR | ~NNN / 500 |
| pt-PT | ~NNN / 500 |
| es-ES | ~NNN / 500 |
| fr-FR | ~NNN / 500 |
| de-DE | ~NNN / 500 |
| it-IT | ~NNN / 500 |
| nl-NL | ~NNN / 500 |
````

## Style

- Active voice, present tense. User-facing benefit, not implementation.
- **No** PR numbers or internal jargon in store copy (feature IDs only in the internal table).
- iOS What's New ≤ **4000** chars/language; Android Release notes ≤ **500** chars/language;
  Promotional Text ≤ **170**. Always show the `~NNN / limit` char count.
- Every limit is **per language** — check all 8. German and Dutch run noticeably longer than
  English and are the ones most likely to blow the 500-char Play limit: **condense the bullet**,
  never truncate mid-sentence.
- **Translate the benefit, don't transliterate the English bullet.** Each locale should read as if
  written by a native speaker of that market.
- **pt-PT is not a copy of pt-BR.** Use European Portuguese vocabulary and verb forms
  (*utilizador*, *ecrã*, *telemóvel*, *a fazer* over *fazendo*, and prefer the impersonal/second
  person over *você*). Keep `es` neutral enough to work in both Spain and Latin America.
- Match the tone and bullet style of the most recent existing build directory.

## Reference

- Latest examples: `docs/runbooks/release-notes/28/ios.md` and `docs/runbooks/release-notes/28/android.md`.
- A build that was never released is marked **Superseded** at the top, pointing to the build that
  replaced it (see `docs/runbooks/release-notes/26/`).
- Invoked automatically by the **ship-it** agent (`.claude/agents/ship-it.md`) during its plan phase.
