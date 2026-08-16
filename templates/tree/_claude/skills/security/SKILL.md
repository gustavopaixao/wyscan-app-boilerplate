---
name: security
description: When checking for vulnerabilities, scanning for secrets, auditing authentication, or reviewing security posture across API, iOS, Android, or Packages
model: inherit
---

# Security Skill
**When to apply:** When checking for vulnerabilities, scanning for secrets, auditing authentication, or reviewing security posture across API, iOS, Android, or Packages.

**Reference:** `.cursor/rules/api-architecture.mdc`, and `docs/backend/API_ARCHITECTURE.md` / `docs/security/` when present

### Scan Types

- **Full Audit**: Complete security assessment across all layers
- **Secrets Detection**: Hardcoded API keys, credentials, tokens
- **Code Analysis**: SQL/NoSQL injection, XSS, CSRF, insecure deserialization
- **Configuration Review**: Insecure defaults, debug mode, security headers, CORS
- **Layers**: Run per-layer analysis (API, iOS, Android, Packages)

### OWASP Top 10 Checklist

1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable Components
7. Authentication Failures
8. Data Integrity Failures
9. Logging Failures
10. SSRF

### Per-Layer Security Checklists

#### API (`api/`, Hono + TypeScript)

- [ ] Input validation (e.g. Zod) at HTTP boundary
- [ ] Auth / rate limits when routes are protected (Wyscan patterns when integrated)
- [ ] `CORS_ORIGIN` set in production for real-time if added later
- [ ] Sensitive data never logged

#### Mobile (`mobile/`, Expo / React Native)

- [ ] No secrets in source; use env / `EXPO_PUBLIC_*` only for non-sensitive config
- [ ] Tokens: use secure storage patterns (e.g. `expo-secure-store`) when adding auth
- [ ] TLS for API; no cleartext production endpoints
- [ ] Depend on maintained native modules; audit supply chain

#### Packages (`../__ECOSYSTEM_DIR__/Packages/packages/wyscan-*/`)

- [ ] Same API checklist for each package's `api/nextjs/` routes
- [ ] WebSocket: `corsOrigin` passed explicitly, not `*`
- [ ] Auth/validation from wyscan-core/wyscan-auth used consistently

### Security Best Practices

- Validate all user input with Zod schemas
- Use parameterized queries (never string concatenation)
- Implement rate limiting
- Use secure authentication (bcrypt for passwords)
- Verify OAuth tokens server-side
- Never expose sensitive data in logs
- Use HTTPS everywhere
- Implement proper CORS policies (no `*` in production)
- Sanitize user input (strip HTML tags)
