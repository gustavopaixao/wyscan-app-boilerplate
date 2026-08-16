<!-- Ported standalone from .cursor/rules/error-handling.mdc (alwaysApply:true). -->

# Error Handling & Documentation

## Error Handling Principles

- Handle errors gracefully with user-friendly messages
- Log errors appropriately (no sensitive data)
- Provide fallback behaviors when possible
- Never expose internal implementation details to users

## Error Fix Documentation

When an error fix is requested or discovered:

1. **Document the error** in the knowledge folder (`.docs/knowledge/`)

   - Create a markdown file describing:
     - What the error was
     - What caused it
     - How it was fixed
     - How to prevent it in the future
   - Use descriptive filenames: `error-<brief-description>.md`

2. **Include context**:

   - Code snippets (before/after if applicable)
   - Error messages or symptoms
   - Platform/framework versions if relevant
   - Related files or components

3. **Update this knowledge base** to help avoid repeating the same mistakes

## Example Knowledge File Structure

```markdown
# Error: [Brief Description]

## What Happened

[Description of the error]

## Root Cause

[What caused the error]

## Solution

[How it was fixed]

## Prevention

[How to avoid this in the future]

## Related Files

- [file paths]
```

## When to Document

- Any error that required investigation to fix
- Errors that could have been prevented with better practices
- Platform-specific errors or gotchas
- Common mistakes that might be repeated
