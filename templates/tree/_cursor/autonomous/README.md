# Autonomous Operation System

This system enables automatic agent invocation and autonomous AI operation for the __PROJECT_NAME__ project.

## Overview

The autonomous system has three components:

1. **Automatic Agent Invocation** - Agents run automatically when conditions are met
2. **Automatic Skill Application** - Skills already auto-apply (configured in `.cursor/rules/skills.mdc`)
3. **Autonomous Workflows** - AI works independently on complex tasks

## How It Works

### Automatic Agent Invocation

Agents are automatically invoked based on triggers defined in `.cursor/autonomous/config.mdc`:

**Examples:**
- Create a new UI file → UX review agent runs automatically
- Modify API route → Security scan runs automatically
- Before commit → Code review agent runs automatically
- Add dependency → Security scan runs automatically

### Automatic Skill Application

Skills in `.cursor/rules/skills.mdc` are already configured with `alwaysApply: true`, so they automatically apply based on context:

- After code changes → Builder skill verifies builds
- Git operations → Git skill enforces smart commits
- Architecture work → Architect skill checks patterns
- UI work → UX/UI skills check compliance

### Autonomous Workflows

When you ask for complex tasks, the AI will:

1. **Analyze** the task and break it down
2. **Create** a task list using `todo_write`
3. **Execute** tasks autonomously
4. **Run** relevant agents automatically
5. **Report** progress and completion
6. **Ask** for approval when needed

## Configuration

### Enable/Disable Automatic Agents

Edit `.cursor/autonomous/config.mdc` to customize triggers.

**To disable automatic agents:**
```
"Don't run agents automatically"
```

**To enable for specific agents:**
```
"Run UX review automatically after UI changes"
```

### Autonomous Mode

**Enable autonomous mode:**
```
"Work autonomously on this feature"
"Implement this feature independently"
```

**Disable autonomous mode:**
```
"Ask before doing anything"
"Guide me step by step"
```

## Workflows

Predefined workflows in `.cursor/autonomous/workflows.mdc`:

- **Feature Implementation** - Complete feature with quality checks
- **Bug Fix** - Identify and fix bugs
- **Refactoring** - Improve code structure
- **Pre-Commit** - Quality gates before commit
- **Pre-Release** - Full audits before release
- **Code Review** - Comprehensive code review
- **New Feature with UI** - UI feature with UX review
- **API Endpoint Creation** - API endpoint with security checks
- **Documentation Update** - Update docs
- **Dependency Update** - Update dependencies safely

## Examples

### Example 1: Automatic UX Review

```
You: "Add a new album editing screen"
AI: [Creates screen]
AI: [Automatically runs: /ux-review ios feature "Album editing screen"]
AI: "✅ UX review completed. Found 2 minor issues..."
```

### Example 2: Autonomous Feature Implementation

```
You: "Add user profile editing feature"
AI: [Creates task list]
AI: [Implements feature step by step]
AI: [Runs UX review automatically]
AI: [Runs code review automatically]
AI: [Verifies builds]
AI: "✅ Feature complete. Ready to commit?"
```

### Example 3: Pre-Commit Quality Checks

```
You: "Commit these changes"
AI: [Runs linter automatically]
AI: [Runs tests automatically]
AI: [Runs code review automatically]
AI: [Runs security scan if needed]
AI: "✅ All checks passed. Committing..."
```

## Customization

### Add Custom Triggers

Edit `.cursor/autonomous/config.mdc`:

```markdown
#### Custom Agent
**Auto-trigger when:**
- Condition 1
- Condition 2

**Command:** `/custom-agent {options}`
```

### Create Custom Workflow

Edit `.cursor/autonomous/workflows.mdc`:

```markdown
## Custom Workflow

**Trigger:** User asks to "..."

**Steps:**
1. Step 1
2. Step 2
...
```

## Best Practices

1. **Trust but Verify** - AI asks for approval on important actions
2. **Progress Reports** - AI reports progress during long tasks
3. **Quality Gates** - Automatic quality checks before commits
4. **Error Handling** - AI stops and reports errors clearly
5. **User Control** - User can always override automatic behavior

## Troubleshooting

### Agents Running Too Often

Edit `.cursor/autonomous/config.mdc` to adjust triggers or disable specific agents.

### AI Too Autonomous

Say: "Ask before doing anything" or "Guide me step by step"

### AI Not Autonomous Enough

Say: "Work autonomously" or "Implement this independently"

## Status

- ✅ Automatic skill application (already working)
- ✅ Automatic agent invocation (configured)
- ✅ Autonomous workflows (configured)
- ✅ Quality gates (configured)
- ✅ Progress reporting (configured)

## Next Steps

1. Test automatic agent invocation with a simple change
2. Try autonomous mode: "Implement a new feature autonomously"
3. Customize triggers in `.cursor/autonomous/config.mdc`
4. Add custom workflows as needed

The system is ready to use! Just start working and agents will run automatically when needed.
