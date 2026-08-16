---
name: git
description: When handling git operations, commits, branches, merges, or pull requests
model: sonnet
---

# Git Skill
**When to apply:** When handling git operations, commits, branches, merges, or pull requests.

### Safety Rules

**NEVER do these without explicit user request:**
- `git push --force` (destructive)
- `git reset --hard` (loses uncommitted work)
- `git rebase` on shared branches
- Amend commits already pushed to remote
- Delete remote branches

**ALWAYS do these:**
- Check `git status` before committing
- Verify branch before push
- Create descriptive commit messages
- Use conventional commits format

### Commit Message Format

```
<type>(<scope>): <subject>

<body>
```

**Types:** feat, fix, docs, style, refactor, test, chore

**NO trailers:** Do NOT add Co-Authored-By, Signed-off-by, or any other `--trailer` options. No AI attribution in commits.

### Smart Commit Process - MANDATORY

**⚠️ CRITICAL: YOU MUST FOLLOW ALL STEPS. SKIPPING LINT/TEST = BREAKING CI/CD**

#### Step 1: Check Status
```bash
git status
```

#### Step 2: Detect API Changes (MANDATORY CHECK)
```bash
git diff --name-only | grep "^api/"
```
If this returns any files, you MUST run steps 3 and 4.

#### Step 3: Run Biome Lint (MANDATORY if api/ changed)
```bash
cd api && pnpm lint
```
- ❌ **IF LINT FAILS**: Fix ALL linting errors, run `pnpm lint` again, DO NOT proceed until lint passes
- ✅ **ONLY PROCEED when lint output shows "No errors found"**
- Return to root: `cd ..`

#### Step 4: Run Tests (MANDATORY if api/ changed)
```bash
cd api && pnpm test
```
- ❌ **IF TESTS FAIL**: Fix ALL failing tests, run `pnpm test` again, DO NOT proceed until all tests pass
- ✅ **ONLY PROCEED when test output shows "Tests: X passed, X total"**
- Return to root: `cd ..`

#### Step 5: Detect Web __PROJECT_SLUG__-site Changes (MANDATORY CHECK)
```bash
git diff --name-only | grep "^web/__PROJECT_SLUG__-site/"
```
If this returns any files, you MUST run steps 6 and 6b.

#### Step 6: Run Lint (MANDATORY if web/__PROJECT_SLUG__-site/ changed)
```bash
cd web/__PROJECT_SLUG__-site && pnpm lint
```
- ❌ **IF LINT FAILS**: Fix ALL linting errors, run `pnpm lint` again, DO NOT proceed until lint passes
- ✅ **ONLY PROCEED when lint passes**
- Return to root: `cd ../..`

#### Step 6b: Run Type Check (MANDATORY if web/__PROJECT_SLUG__-site/ changed)
```bash
cd web/__PROJECT_SLUG__-site && pnpm type-check
```
- ❌ **IF TYPE CHECK FAILS**: Fix ALL type errors, run `pnpm type-check` again, DO NOT proceed until it passes
- ✅ **ONLY PROCEED when type-check passes**
- Return to root: `cd ../..`

#### Step 7: Detect Web __PROJECT_SLUG__-admin Changes (MANDATORY CHECK)
```bash
git diff --name-only | grep "^web/__PROJECT_SLUG__-admin/"
```
If this returns any files, you MUST run steps 8, 8b, and 8c.

#### Step 8: Run Lint (MANDATORY if web/__PROJECT_SLUG__-admin/ changed)
```bash
cd web/__PROJECT_SLUG__-admin && pnpm lint
```
- ❌ **IF LINT FAILS**: Fix ALL linting errors, run `pnpm lint` again, DO NOT proceed until lint passes
- ✅ **ONLY PROCEED when lint passes**
- Return to root: `cd ../..`

#### Step 8b: Run Type Check (MANDATORY if web/__PROJECT_SLUG__-admin/ changed)
```bash
cd web/__PROJECT_SLUG__-admin && pnpm type-check
```
- ❌ **IF TYPE CHECK FAILS**: Fix ALL type errors, run `pnpm type-check` again, DO NOT proceed until it passes
- ✅ **ONLY PROCEED when type-check passes**
- Return to root: `cd ../..`

#### Step 8c: Run Tests (MANDATORY if web/__PROJECT_SLUG__-admin/ changed)
```bash
cd web/__PROJECT_SLUG__-admin && pnpm test
```
- ❌ **IF TESTS FAIL**: Fix ALL failing tests, run `pnpm test` again, DO NOT proceed until all tests pass
- ✅ **ONLY PROCEED when test output shows all tests passing**
- Return to root: `cd ../..`

#### Step 8d: Detect mobile/ Changes (Expo)
```bash
git diff --name-only | grep "^mobile/"
```
If this returns any files, run:
```bash
cd mobile && pnpm exec tsc --noEmit
```
- Fix all type errors before commit.

#### Step 9-12: Review Diff → Stage → Commit → Push

**🚨 ABSOLUTE RULES (NEVER VIOLATE):**
- ⛔ **NEVER commit if api/ files changed WITHOUT running lint**
- ⛔ **NEVER commit if web/__PROJECT_SLUG__-site/ files changed WITHOUT running lint and type-check**
- ⛔ **NEVER commit if web/__PROJECT_SLUG__-admin/ files changed WITHOUT running lint, type-check, and tests**
- ⛔ **NEVER commit if mobile/ files changed WITHOUT running `pnpm exec tsc --noEmit` in mobile/**
- ⛔ **NEVER commit if type-check has ANY errors**
- ⛔ **NEVER commit if tests have ANY failures**
- ⛔ **NEVER push without running lint, type-check, and tests first**

### Branch Naming

- `feature/<name>` - New features
- `fix/<name>` - Bug fixes
- `refactor/<name>` - Code refactoring
- `docs/<name>` - Documentation
- `chore/<name>` - Maintenance tasks
