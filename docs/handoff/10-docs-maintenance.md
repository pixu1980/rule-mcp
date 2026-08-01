# Handoff Fase 10 — Documentazione, skill e manutenzione

**Per:** deepseek-v4-flash  
**Da:** gpt-5.6-sol (audit + remediation fasi 1-6)  
**Data:** 2026-07-15  
**File interessati:** `skills/rule-data-*/SKILL.md`, `docs/`, `README.md`, `src/core/guardrail-defs.js`, `src/tools/handoff.js`, `src/tools/adr.js`, `src/cli/doctor.js`, `package.json`

---

## Contesto (cosa è già stato risolto)

- ✅ `package.json`: self-dependency rimossa, descrizione "Zero npm dependencies" rimossa
- ✅ `server.json`: source=github, version=1.0.0
- ✅ `LICENSE` aggiunto
- ✅ prompt template: "mandatory/enforced" → "recommended/advisory"
- ✅ Enforcement contract: "ENFORCEMENT" → "WORKFLOW REMINDER"

---

## Cosa fare

### 10.1 — `See also` nelle skill mancanti (3 file, ~5 min)

Le skill `rule-data-duckdb`, `rule-data-indexed-db`, `rule-data-sqlite` non hanno sezione `## See also`. Questo rompe `test/skills-docs.test.mjs`.

**Fix:** Aggiungere alla fine di ogni `SKILL.md`:
```markdown
## See also

- [rule-data-sql](../rule-data-sql/SKILL.md) — SQL fundamentals
- [rule-data-postgresql](../rule-data-postgresql/SKILL.md) — PostgreSQL reference
```

File da modificare:
- `skills/rule-data-duckdb/SKILL.md`
- `skills/rule-data-indexed-db/SKILL.md`
- `skills/rule-data-sqlite/SKILL.md`

**Verifica:**
```bash
node test/skills-docs.test.mjs  # deve passare
```

### 10.2 — Documentazione obsoleta (32 token name, ~30 min)

`docs/01-product-architecture.md` e `docs/02-tools-operations.md` contengono ~32 riferimenti a nomi tool obsoleti:
- `pix_react` → `rule_tool_frontend_react`
- `pix_vue` → `rule_tool_frontend_vue`
- `pix_angular` → `rule_tool_frontend_angular`
- `pix_svelte` → `rule_tool_frontend_svelte`
- `pix_docker` → `rule_tool_devops_docker`
- `rule_tool_testing` → `rule_tool_devops_testing`
- ...e altri 26

**Fix:** Sostituzione massiva con sed o modifica manuale.

**Verifica:**
```bash
# Estrarre i riferimenti e verificare contro il registry attuale
HOME=/tmp/rule-audit-home RULE_MCP_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node -e 'import{loadAllSkills}from"./src/core/skills.js";import{listTools}from"./src/tools/router.js";await loadAllSkills();const t=new Set(listTools().map(x=>x.name));const fs=require("fs");for(const f of["docs/01-product-architecture.md","docs/02-tools-operations.md"]){const c=fs.readFileSync(f,"utf8");for(const m of c.matchAll(/\bpix_[a-z0-9_]+\b/g)){if(!t.has(m[0]))console.log(f,m[0])}}'
# Output deve essere vuoto
```

### 10.3 — Aggiungere `annotations` ai tool (~10 min)

Nessun tool ha `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`).

**Fix:** In `src/tools/router.js` `registerTool()`, aggiungere supporto per `annotations`. Poi in ogni `registerTool` call:

```js
// Tool read-only:
registerTool({ name: "rule_tool_search", ..., annotations: { readOnlyHint: true } });
// Tool distruttivi:
registerTool({ name: "rule_tool_fix", ..., annotations: { destructiveHint: true } });
```

### 10.4 — Fix handoff (`src/tools/handoff.js`, ~15 min)

**Problema:** Usa `process.cwd()` per il nome progetto anche quando `projectDir` punta altrove. Git diff non include untracked files.

**Fix:**
```js
// Usare projectDir come cwd per execSync
execSync("git log ...", { cwd: projectDir });
// Includere untracked: git status --porcelain
execSync("git status --porcelain", { cwd: projectDir });
```

### 10.5 — Auto-ADR opt-in (`src/tools/adr.js:327`, ~5 min)

**Problema:** Hook wildcard `addAfterToolHook("*", autoLog)` crea ADR automaticamente per ogni chiamata tool.

**Fix:**
```js
// Disabilitare di default. Abilitare solo se RULE_MCP_AUTO_ADR=1
if (process.env.RULE_MCP_AUTO_ADR === "1") {
  addAfterToolHook("*", autoLog);
}
```

### 10.6 — `test:all` corretto (`package.json`, ~5 min)

Già fatto in Fase 3.2 ma verificare che `pnpm run ci` passi:
```bash
pnpm run ci
# Deve eseguire smoke + ai + detector + framework-routing + skills-docs + docs-architect + daemon-wrapper + doctor-ui + cli-tui
# skills-docs e docs-architect devono passare dopo i fix 10.1 e 9.3
```

### 10.7 — `doctor` migliorato (`src/cli/doctor.js`, ~10 min)

`doctor` restituisce `ok: true` anche con prompt MCP invalidi o build rotta.

**Fix:** Aggiungere check per:
- `prompts/get` risposta valida (chiamata MCP interna)
- `skills/` contiene almeno 60 SKILL.md
- `LICENSE` esiste

### 10.8 — Dipendenze cicliche (`src/tools/router.js` ↔ `src/core/skills.js`)

Identificare e rompere i cicli di import. Priority bassa (P2), non blocca la release.

---

## Comandi di verifica finale

```bash
pnpm test
pnpm run ci
node test/skills-docs.test.mjs
node test/docs-architect.test.mjs
pnpm audit --prod
```
