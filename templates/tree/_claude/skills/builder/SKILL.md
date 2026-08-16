---
name: builder
description: After code changes to verify all targets compile correctly
---

# Builder Skill
**When to apply:** After code changes to verify all targets compile correctly.

### Project Targets

1. **API** (Hono + TypeScript)
   - Path: `api/`
   - Build command: `cd api && pnpm build`
   - Lint command: `cd api && pnpm lint`

2. **Mobile** (Expo / React Native)
   - Path: `mobile/`
   - Typecheck: `cd mobile && pnpm exec tsc --noEmit`
   - Native debug build (requires Xcode): `cd mobile && pnpm exec expo run:ios`
   - Native debug build (requires Android SDK): `cd mobile && pnpm exec expo run:android`

### Build Process

1. **Pre-build**: Check for uncommitted changes in target directories
2. **Build**: Execute build commands
3. **Report**: Summarize results with errors if any

### Error Handling

When a build fails:
1. Parse the error output to identify the issue
2. Suggest specific fixes based on error type:
   - **TypeScript errors**: Show file, line, and suggested fix
   - **Swift / Kotlin native errors**: When adding custom native modules
   - **Missing dependencies**: Suggest install commands
   - **Configuration issues**: Point to relevant config files

### Best Practices

- Always build after modifying shared code (models, DTOs, configs)
- Run API lint before build to catch issues early
- For native debug builds, use Expo; run API lint before merging shared contracts
- If one target fails, continue building others to get full report
