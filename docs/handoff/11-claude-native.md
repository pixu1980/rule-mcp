# Handoff Fase 11 — Integrazione nativa Claude Skills e multi-agente

**Per:** deepseek-v4-flash  
**Da:** gpt-5.6-sol (audit + remediation fasi 1-6)  
**Data:** 2026-07-15  
**File interessati:** `src/cli/skills-install.js`, `scripts/install.sh`, 70 `skills/*/SKILL.md`, `README.md`

---

## Contesto

Attualmente le 70 skill vivono in `~/.agents/skills/` (convenzione rule) e sono accessibili solo via tool MCP. Claude Code ha un meccanismo **nativo** di auto-discovery: cartelle in `.claude/skills/<name>/SKILL.md` con frontmatter YAML, scoperte e invocate automaticamente da Claude in base alla `description`.

Il progetto **non usa questo meccanismo.** L'installer scrive solo in `~/.agents/skills/`, non in `.claude/skills/`.

---

## Cosa fare

### 11.1 — Generare skill anche in `.claude/skills/` (~30 min)

**Fix:** Aggiungere un'opzione `--format native-skills` all'installer che scrive anche in `.claude/skills/`:

```js
// src/cli/skills-install.js
const CLAUDE_SKILLS_DIR = join(homedir(), ".claude", "skills");

// Per ogni skill installata, creare symlink o copia in .claude/skills/
// Formato Claude: YAML frontmatter con name + description
// Esempio SKILL.md per Claude:
/*
---
name: rule-frontend-react
description: React best practices aligned with rule-styleguide. Zero CSS classes, semantic HTML, barrel file tree. Use when building React components or applications.
---
*/
```

**Verifica:**

```bash
# Dopo installazione:
ls ~/.claude/skills/rule-*/SKILL.md | wc -l  # deve essere > 0
```

### 11.2 — Riscrivere 59/70 descrizioni skill con "Use when..." (~2 ore)

L'audit ha rilevato che 59 skill su 70 non hanno una formula esplicita "Use when..." nella `description`. Questo è critico per l'auto-discovery nativo di Claude, che matcha la `description` contro il prompt utente.

**Template:**

```yaml
description: >-
  Use when <condition> to <action>. Covers <topics>.
```

**Esempi corretti (già presenti):**

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

**Esempi da migliorare (troppo vaghi):**

```yaml
# rule-backend (attuale)
description: >-
  Backend application development umbrella — index of all backend skills.
  Routes to specific framework, database, and deployment skills.

# rule-backend (suggerito)
description: >-
  Use when designing or building backend services to route to the correct
  backend framework or database skill. Covers Express, Fastify, NestJS,
  Hono, and database integrations.
```

**File da modificare:** tutti i 70 `skills/*/SKILL.md` che non hanno già "Use when" o formula equivalente nella description.

**Verifica:**

```bash
# Contare quante skill hanno "Use when" nella description
grep -rl '^description:.*Use when' skills/*/SKILL.md | wc -l
# Target: 70/70
```

### 11.3 — Documentare `allowedTools` per ogni host (~15 min)

**Fix:** Aggiungere al README una sezione "Recommended tool filter" con esempi per Claude Code, Cursor, Pi, ecc.

```json
// mcp.json con filtro consigliato
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

### 11.4 — Aggiornare conteggi README (~10 min)

Il README dichiara 71 tool, ma sono 78 (normal mode) o 9 (strict mode). E le risorse non sono più 146 — vanno contate con `rule://skills`.

**Fix:**

```bash
# Ottenere conteggi reali
HOME=/tmp/rule-audit-home RULE_MCP_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node -e 'import{loadAllSkills}from"./src/core/skills.js";import{listTools}from"./src/tools/router.js";import{listResources}from"./src/resources/index.js";await loadAllSkills();console.log("Tools:",listTools().length,"Resources:",listResources().length)'
# Aggiornare README.md con i numeri corretti
```

---

## Comandi di verifica

```bash
pnpm test
node test/repository-contract.test.mjs

# Verifica conteggi
grep -c '^description:.*Use when' skills/*/SKILL.md

# Verifica descrizioni Claude-compatibili
node -e 'const fs=require("fs");for(const d of fs.readdirSync("skills")){const c=fs.readFileSync(`skills/${d}/SKILL.md`,"utf8");const desc=c.match(/^description:\s*(.+)$/m)?.[1]||"";if(desc.length>1024)console.log(d,"TOO_LONG",desc.length);if(!desc)console.log(d,"MISSING")}'
```
