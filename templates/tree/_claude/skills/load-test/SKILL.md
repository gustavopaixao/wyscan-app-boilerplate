---
name: load-test
description: When performance testing, benchmarking, or analyzing API performance
---

# Load Test Skill
**When to apply:** When performance testing, benchmarking, or analyzing API performance.

### Performance Testing

- Load testing with realistic scenarios
- Stress testing to find breaking points
- Performance benchmarking
- Identify bottlenecks
- Optimize slow endpoints

### Key Metrics

- Response time (p50, p95, p99)
- Throughput (requests per second)
- Error rate
- Resource utilization (CPU, memory)

## Automatic Application

These skills are automatically applied based on context:

- **After code changes**: Builder skill (verify builds)
- **Git operations**: Git skill (smart commits with lint/test)
- **Architecture reviews**: Architect skill (SOLID, patterns, API compliance)
- **UI/UX work**: UX Senior + UI Expert skills (accessibility, theming, components)
- **Frontend UI implementation (web/mobile)**: Frontend Expert skill
- **Security concerns**: Security skill (OWASP Top 10, vulnerabilities)
- **Testing tasks**: Testing skill (test generation, coverage, fixes)
- **Deployment prep**: Deployment skill (pre-deployment checks)
- **CI/CD changes**: CI/CD skill (pipeline updates, best practices)
- **Translation work**: Translator skill (i18n, missing keys)
- **Performance**: Load Test skill (benchmarking, optimization)
- **New or cross-platform features / parity requests**: Feature Parity skill
- **New build generated / release notes requested**: Release Manager Tech Writer skill (create TestFlight/Play Store notes in `docs/ReleaseNotes/`)

## Cursor Native Agents

For deeper, specialized analysis, use Cursor-native agents (see `.cursor/agents/`):

- **UX Senior**: `/ux-review ios full` - Comprehensive UX reviews
- **Architect Expert**: `/architect-review api patterns` - Architecture analysis
- **Security**: `/security-scan api full` - Security audits
- **Code Review**: `/code-review ios` - Code quality reviews
- **UI Expert**: `/ui-review ios patterns` - Component architecture
- **Frontend Expert**: `/frontend-dev {web-admin|web-site|mobile} [context]` - React/Next.js and Expo UI implementation (feature-first, reuse, architecture)
- **Testing**: `/test-agent api generate` - Test generation
- **Load Test**: `/loadtest analyze` - Performance analysis
- **Deployment**: `/deploy-check production check` - Pre-deployment checks
- **Translator**: `/translator check` - Translation management
- **Android Docs**: `/android-docs generate` - Cross-platform docs
- **Feature Parity**: `/feature-parity` or `feature parity check` - Parity report, OpenAPI validation, implementation plan for missing platform
- **Feature Spec**: `/feature-spec {CONTEXT}` - Create `docs/features/NNNN-<slug>/spec.md`; researches existing features, asks questions, covers edge cases; then add implementation plan and `/implement-feature`
- **Implement Feature**: `/implement-feature <ID> [context]` - Implement from plan (spec + implementation plan in `docs/features/<ID>-<slug>/`); architecture-aware; stops on questions; runs tests; no commit/push

See `.cursor/agents/README.md` for complete agent documentation.
