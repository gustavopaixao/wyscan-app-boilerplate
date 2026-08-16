---
name: ci-cd
description: When setting up Jenkins pipelines, adjusting workflows, managing deployments, or when code changes may require pipeline updates
---

# CI/CD Skill
**When to apply:** When setting up Jenkins pipelines, adjusting workflows, managing deployments, or when code changes may require pipeline updates.

### CRITICAL RULES

1. **ALWAYS suggest before making changes** - Never modify Jenkinsfiles without explaining proposed changes first
2. **Detect pipeline-affecting changes** - When reviewing code changes, identify if they require pipeline updates
3. **Prioritize security** - Never expose secrets, always use Jenkins Credentials Manager
4. **Maintain documentation** - Keep deployment docs updated with any pipeline changes

### Pipeline-Affecting Changes

Detect if code changes require pipeline updates:
- New dependencies added
- Node.js/Swift version changes
- New test files or test configuration changes
- Docker configuration changes
- Environment variable additions
- New deployment targets

### Best Practices

- Use caching for dependencies
- Parallelize builds when possible
- Store artifacts properly
- Use proper secret management
- Implement proper error handling
- Add notifications for build status
