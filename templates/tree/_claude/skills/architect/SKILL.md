---
name: architect
description: When reviewing architecture, design patterns, SOLID principles, API design, database schema, or identifying technical debt
model: inherit
---

# Architect Skill
**When to apply:** When reviewing architecture, design patterns, SOLID principles, API design, database schema, or identifying technical debt.

### Critical Reference

**IMPORTANT:** When reviewing API code, ALWAYS read the architecture guide first:
- `.cursor/rules/api-architecture.mdc` — Cursor rule for `api/`
- `docs/backend/API_ARCHITECTURE.md` — add when the API grows; keep it authoritative once it exists

### Expertise Areas

- Architecture patterns (MVVM, Clean Architecture, Repository)
- SOLID principles
- DRY, KISS, YAGNI principles
- Dependency management and coupling analysis
- API design best practices
- Database schema design
- Performance architecture
- Security architecture

### API Architecture Checklist

When reviewing API code, verify:

- [ ] Route follows standard structure (rate limit → auth → validate → logic → response)
- [ ] Zod schema defined for request validation
- [ ] Uses `authenticateWithRole()` or `requireMinimumRole()` for auth
- [ ] Uses `checkRateLimit()` with appropriate config
- [ ] Uses `Errors.*` helpers for error responses
- [ ] HTML tags stripped from user text inputs
- [ ] UUIDs validated with `isValidUUID()`
- [ ] Database connection via `connectDB()` singleton
- [ ] Uses `.lean()` for read-only queries
- [ ] Proper error logging with `logger.error()`
- [ ] Response follows standard format (id, timestamps as ISO strings)
