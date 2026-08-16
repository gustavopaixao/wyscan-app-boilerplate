# Cursor Agents

Native Cursor agents that use Cursor's built-in tools and context. These agents work seamlessly within Cursor without requiring separate processes.

## How to Use

Invoke agents naturally in chat:

```
/ux-review ios "Album editing screen"
/architect-review api patterns
/security-scan api full
/code-review ios
```

Or ask naturally:

```
"Run a UX review on the iOS album screen"
"Review the API architecture for SOLID principles"
"Scan for security vulnerabilities in the API"
```

## Available Agents

### UX Senior Agent

**Command:** `/ux-review` or "run UX review"

**Options:**
- Platform: `ios`, `android`, `all`
- Type: `full`, `feature`, `accessibility`, `theming`, `consistency`

**Examples:**
```
/ux-review ios full
/ux-review ios feature "Album editing screen"
/ux-review all accessibility
```

### Architect Expert Agent

**Command:** `/architect-review` or "run architect review"

**Options:**
- Platform: `api`, `ios`, `android`, `all`
- Type: `full`, `patterns`, `clean-code`, `dependencies`, `structure`, `api-design`, `database`, `performance`, `scalability`, `security`, `technical-debt`, `best-practices`, `adr`

**Examples:**
```
/architect-review api full
/architect-review ios patterns
/architect-review all technical-debt
```

### Security Agent

**Command:** `/security-scan` or "run security scan"

**Options:**
- Platform: `api`, `ios`, `android`, `all`
- Type: `full`, `secrets`, `deps`, `code`, `config`

**Examples:**
```
/security-scan api full
/security-scan all secrets
/security-scan api code
```

### Code Review Agent

**Command:** `/code-review` or "run code review"

**Options:**
- Platform: `api`, `ios`, `android`, `all`

**Examples:**
```
/code-review api
/code-review ios
/code-review all
```

### UI Expert Agent

**Command:** `/ui-review` or "run UI review"

**Options:**
- Platform: `ios`, `android`, `all`
- Type: `full`, `patterns`, `components`, `refactor`, `accessibility`, `edge-cases`, `design-system`

**Examples:**
```
/ui-review ios full
/ui-review ios patterns
/ui-review all design-system
```

### Frontend Expert Agent

**Command:** `/frontend-dev` or `/frontend-expert` or "frontend expert"

**Purpose:** Implement React (Next.js) and React Native (Expo) UI — feature-first, reuse existing components, follow architecture rules; stops and asks when valid approaches conflict.

**Options:**
- Target: `web-admin`, `web-site`, `mobile`
- Context: feature area or task description

**Examples:**
```
/frontend-dev mobile pools add scoring-updating banner to predictions tab
/frontend-dev web-admin games reuse ScoringStatusBadge pattern for championships
/frontend-dev web-site landing update hero section
```

### Testing Agent

**Command:** `/test-agent` or "run test agent"

**Options:**
- Platform: `api`, `ios`, `android`, `all`
- Action: `run`, `generate`, `coverage`, `fix`

**Examples:**
```
/test-agent api generate
/test-agent ios coverage
/test-agent api fix
```

### Load Test Agent

**Command:** `/loadtest` or "run load test"

**Options:**
- Action: `analyze`, `generate`, `run`, `report`

**Examples:**
```
/loadtest analyze
/loadtest generate
/loadtest run
```

### Deployment Agent

**Command:** `/deploy-check` or "run deployment check"

**Options:**
- Environment: `development`, `staging`, `production`
- Action: `check`, `build`, `migrate`, `deploy`

**Examples:**
```
/deploy-check development check
/deploy-check production build
```

### Ship-it Agent

**Command:** `/ship-it` or `make ship-it`

**Purpose:** Detect API/mobile changes since release markers, pre-flight, confirmation-gated release (API image + mobile beta). Never pushes git or runs production server upgrades.

**Examples:**
```
/ship-it
/ship-it plan only
make ship-it
node scripts/ship-it.mjs --plan-only
```

### Translator Agent

**Command:** `/translator` or "run translator"

**Options:**
- Action: `check`, `translate`, `validate`

**Examples:**
```
/translator check
/translator translate pt
```

### Android Docs Agent

**Command:** `/android-docs` or "generate Android docs"

**Options:**
- Action: `generate`, `validate`, `update`
- Component: `viewmodel`, `dto`, `view`, `network`, `storage`, `navigation`, `security`

**Examples:**
```
/android-docs generate
/android-docs validate
/android-docs update viewmodel
```

### Packages Pipeline Agent

**Command:** `/packages-pipeline` or "packages pipeline check" or "add new package"

**Purpose:** Enforce WyscanPackages Jenkins and package rules; validate new packages and pipeline config. Use when adding a package under `../__ECOSYSTEM_DIR__/Packages/packages/` or changing Jenkinsfiles / publish script.

**Examples:**
```
/packages-pipeline
packages pipeline check
add new package
```

### Feature Spec Agent

**Command:** `/feature-spec` or "feature spec" (also in Command Palette via [`.cursor/commands/feature-spec.md`](../commands/feature-spec.md))

**Purpose:** Create a feature spec under `docs/features/NNNN-<slug>/spec.md` from free-text context. Researches existing specs, PRD/MVP, and code; asks numbered questions on ambiguities and edge cases; writes the spec after answers (or when context is complete). Does not create `implementation-plan.md` unless requested. Does not commit or push.

**Examples:**
```
/feature-spec Extend Explore with trending public pools filtered by sport
/feature-spec 0035 explore-trending-pools Trending pools on Explore; mobile and API only
```

### Implement Feature Agent

**Command:** `/implement-feature` or "implement feature"

**Purpose:** Implement a feature from its implementation plan. Uses feature ID (e.g. 0001); loads spec and plan from `docs/features/<ID>-<slug>/`; considers architecture; reviews codebase; stops with pending questions if unclear; otherwise implements autonomously; runs lint/tests/build for changed areas; does not commit or push.

**Examples:**
```
/implement-feature 0001
/implement-feature 0001 only API and Packages
/implement-feature 0030 only mobile
```

### Business Explorer Agent

**Command:** `/explorer` or "business explorer" or "explore idea"

**Purpose:** Product/business exploration — turn a rough idea, problem, or metric into distinct options and variants; stress-test edge cases; evaluate business & marketing impact; and shape positioning ("how to sell it"). Diverges before converging, scores options (ICE/RICE), and recommends one bet plus the cheapest way to test it. Writes `docs/explorations/NNNN-<slug>/exploration.md`. A thinking partner, not an implementer — no spec, no code, no commit/push; hands off to `/feature-spec` when a bet is worth building.

**Examples:**
```
/explorer Add prediction streaks to boost daily retention
/explorer We keep losing users after their first pool ends — what could keep them?
/explorer entry-fees Let organizers charge an entry fee for pools — upside vs integrity/store risk
```

## Agent Structure

Each agent is defined in `.cursor/agents/` with:
- **Agent definition** (prompt structure)
- **Tool usage** (which Cursor tools to use)
- **Output format** (how results are presented)

## How Agents Work

1. **Invocation**: You invoke via chat command or natural language
2. **Context Loading**: Agent loads relevant codebase context using Cursor tools
3. **Analysis**: Agent performs analysis using specialized prompts
4. **Report**: Agent generates structured report in chat

## Differences from Claude Code Agents

| Feature | Cursor Agents | Claude Code Agents |
|---------|---------------|-------------------|
| **Invocation** | Chat commands | npm scripts |
| **Tools** | Cursor built-in | Claude Code SDK |
| **Context** | Full Cursor context | Separate process |
| **Speed** | Instant | Slower |
| **Reports** | Inline in chat | HTML files |
| **Integration** | Native | External |

## Agent Definitions

See `.cursor/agents/*.mdc` files for agent definitions. Each agent includes:
- Purpose and responsibilities
- Tool requirements
- Prompt structure
- Output format
- Examples
