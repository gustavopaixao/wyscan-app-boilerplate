---
name: deployment
description: When preparing releases, running build validation, checking migrations, or deploying to staging/production
---

# Deployment Skill
**When to apply:** When preparing releases, running build validation, checking migrations, or deploying to staging/production.

### Pre-Deployment Checklist

**Code Quality**
- [ ] Linter passes
- [ ] Tests pass
- [ ] No TypeScript errors
- [ ] No security vulnerabilities

**Build**
- [ ] Production build succeeds
- [ ] Docker image builds
- [ ] Environment variables set

**Database**
- [ ] Migrations reviewed
- [ ] Backup created
- [ ] Rollback tested

### Environments

- **development**: Local Docker environment
- **staging**: Pre-production testing
- **production**: Live environment
