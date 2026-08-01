# Handoff Fase 10 — Documentazione, skill e manutenzione

**Per:** deepseek-v4-flash  
**Da:** gpt-5.6-sol (audit + remediation fasi 1-6)  
**Data:** 2026-07-15  
**File interessati:** `skills/pix-data-*/SKILL.md`, `docs/`, `README.md`, `src/core/guardrail-defs.js`, `src/tools/handoff.js`, `src/tools/adr.js`, `src/cli/doctor.js`, `package.json`

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

Le skill `pix-data-duckdb`, `pix-data-indexed-db`, `pix-data-sqlite` non hanno sezione `## See also`. Questo rompe `test/skills-docs.test.mjs`.

**Fix:** Aggiungere alla fine di ogni `SKILL.md`:
```markdown
## See also

- [pix-data-sql](../pix-data-sql/SKILL.md) — SQL fundamentals
- [pix-data-postgresql](../pix-data-postgresql/SKILL.md) — PostgreSQL reference
```

File da modificare:
- `skills/pix-data-duckdb/SKILL.md`
- `skills/pix-data-indexed-db/SKILL.md`
- `skills/pix-data-sqlite/SKILL.md`

**Verifica:**
```bash
node test/skills-docs.test.mjs  # deve passare
```

### 10.2 — Documentazione obsoleta (32 token name, ~30 min)

`docs/01-product-architecture.md` e `docs/02-tools-operations.md` contengono ~32 riferimenti a nomi tool obsoleti:
- `pix_react` → `pix_frontend_react`
- `pix_vue` → `pix_frontend_vue`
- `pix_angular` → `pix_frontend_angular`
- `pix_svelte` → `pix_frontend_svelte`
- `pix_docker` → `pix_devops_docker`
- `pix_testing` → `pix_devops_testing`
- ...e altri 26

**Fix:** Sostituzione massiva con sed o modifica manuale.

**Verifica:**
```bash
# Estrarre i riferimenti e verificare contro il registry attuale
HOME=/tmp/pix-audit-home PIX_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node -e 'import{loadAllSkills}from"./src/core/skills.js";import{listTools}from"./src/tools/router.js";await loadAllSkills();const t=new Set(listTools().map(x=>x.name));const fs=require("fs");for(const f of["docs/01-product-architecture.md","docs/02-tools-operations.md"]){const c=fs.readFileSync(f,"utf8");for(const m of c.matchAll(/\bpix_[a-z0-9_]+\b/g)){if(!t.has(m[0]))console.log(f,m[0])}}'
# Output deve essere vuoto
```

### 10.3 — Aggiungere `annotations` ai tool (~10 min)

Nessun tool ha `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`).

**Fix:** In `src/tools/router.js` `registerTool()`, aggiungere supporto per `annotations`. Poi in ogni `registerTool` call:

```js
// Tool read-only:
registerTool({ name: "pix_search", ..., annotations: { readOnlyHint: true } });
// Tool distruttivi:
registerTool({ name: "pix_fix", ..., annotations: { destructiveHint: true } });
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
// Disabilitare di default. Abilitare solo se PIX_AUTO_ADR=1
if (process.env.PIX_AUTO_ADR === "1") {
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
