# Handoff Phase 11 - Native Claude Skills integration and multi-agent

**To:** deepseek-v4-flash  
**From:** gpt-5.6-sol (audit + remediation phases 1-6)  
**Date:** 2026-07-15  
**Files affected:** `src/cli/skills-install.js`, `scripts/install.sh`, 70 `skills/*/SKILL.md`, `README.md`

---

## Context

Currently the 70 skills live in `~/.agents/skills/` (rule convention) and are accessible only via MCP tools. Claude Code has a **native** auto-discovery mechanism: folders in `.claude/skills/<name>/SKILL.md` with YAML frontmatter, discovered and invoked automatically by Claude based on the `description`.

The project **does not use this mechanism.** The installer only writes to `~/.agents/skills/`, not to `.claude/skills/`.

---

## What to do

### 11.1 - Generate skills also in `.claude/skills/` (~30 min)

**Fix:** Add a `--format native-skills` option to the installer that also writes to `.claude/skills/`:

```js
// src/cli/skills-install.js
const CLAUDE_SKILLS_DIR = join(homedir(), ".claude", "skills");

// For each installed skill, create symlink or copy in .claude/skills/
// Claude format: YAML frontmatter with name + description
// Example SKILL.md for Claude:
/*
---
name: rule-frontend-react
description: React best practices aligned with rule-styleguide. Zero CSS classes, semantic HTML, barrel file tree. Use when building React components or applications.
---
*/
```

**Verification:**

```bash
# After installation:
ls ~/.claude/skills/rule-*/SKILL.md | wc -l  # must be > 0
```

### 11.2 - Rewrite 59/70 skill descriptions with "Use when..." (~2 hours)

The audit found that 59 out of 70 skills don't have an explicit "Use when..." formula in the `description`. This is critical for Claude's native auto-discovery, which matches the `description` against the user prompt.

**Template:**

```yaml
description: >-
  Use when <condition> to <action>. Covers <topics>.
```

**Correct examples (already present):**

```yaml
# rule-backend-express
description: >-
  Express.js 5+ best practices: middleware patterns, error handling,
  routing, performance optimization, security headers, and production deployment.

# rule-data-postgresql
description: >-
  PostgreSQL 16+ complete reference: DDL scripts, indexing strategies,
  performance tuning, replication, connection pooling, JSONB patterns,
  full-text search, and production maintenance.
```

**Examples to improve (too vague):**

```yaml
# rule-backend (current)
description: >-
  Backend application development umbrella - index of all backend skills.
  Routes to specific framework, database, and deployment skills.

# rule-backend (suggested)
description: >-
  Use when designing or building backend services to route to the correct
  backend framework or database skill. Covers Express, Fastify, NestJS,
  Hono, and database integrations.
```

**Files to modify:** all 70 `skills/*/SKILL.md` that don't already have "Use when" or equivalent formula in the description.

**Verification:**

```bash
# Count how many skills have "Use when" in the description
grep -rl '^description:.*Use when' skills/*/SKILL.md | wc -l
# Target: 70/70
```

### 11.3 - Document `allowedTools` for each host (~15 min)

**Fix:** Add a "Recommended tool filter" section to README with examples for Claude Code, Cursor, Pi, etc.

```json
// mcp.json with recommended filter
{
  "mcpServers": {
    "rule_tool_ai_mcp": {
      "command": "node",
      "args": ["bin/rule-mcp.js", "serve"],
      "allowedTools": [
        "rule_tool_gateway",
        "rule_tool_apply",
        "rule",
        "rule_tool_search",
        "rule_tool_check",
        "rule_tool_detect",
        "rule_tool_scaffold"
      ]
    }
  }
}
```

### 11.4 - Update README counts (~10 min)

The README declares 71 tools, but there are 78 (normal mode) or 9 (strict mode). And resources are no longer 146 - they need to be counted with `rule://skills`.

**Fix:**

```bash
# Get real counts
HOME=/tmp/rule-audit-home RULE_MCP_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node -e 'import{loadAllSkills}from"./src/core/skills.js";import{listTools}from"./src/tools/router.js";import{listResources}from"./src/resources/index.js";await loadAllSkills();console.log("Tools:",listTools().length,"Resources:",listResources().length)'
# Update README.md with correct numbers
```

---

## Verification commands

```bash
pnpm test
node test/repository-contract.test.mjs

# Verify counts
grep -c '^description:.*Use when' skills/*/SKILL.md

# Verify Claude-compatible descriptions
node -e 'const fs=require("fs");for(const d of fs.readdirSync("skills")){const c=fs.readFileSync(`skills/${d}/SKILL.md`,"utf8");const desc=c.match(/^description:\s*(.+)$/m)?.[1]||"";if(desc.length>1024)console.log(d,"TOO_LONG",desc.length);if(!desc)console.log(d,"MISSING")}'
```
