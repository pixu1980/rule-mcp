# Handoff Fase 9 — Architect e wizard

**Per:** deepseek-v4-flash  
**Da:** gpt-5.6-sol (audit + remediation fasi 1-6)  
**Data:** 2026-07-15  
**File interessati:** `skills/pix-architect/`, `skills/pix-architect-cli/`, `skills/pix-architect-web/`, `src/tools/architect.js`

---

## Contesto (cosa è già successo)

Il working tree ha subito una migrazione parziale del wizard architect:

- `skills/pix-architect/assets/context-server/` è stato **cancellato** (38 file deleted)
- Sono comparsi nuovi file **untracked:** `skills/pix-architect-cli/`, `skills/pix-architect-web/`, `skills/pix-architect/generator.mjs`, `skills/pix-architect/validators.mjs`, `skills/pix-architect/wizard-spec.json`, `skills/pix-architect/placeholders.json`, `skills/pix-architect/templates.json`
- Il tool `pix_tool_architect` punta ancora al vecchio `context-server.mjs` (non esiste più)
- `pix_tool_architect check` è l'unica modalità che crasha nella matrice 402-call

**⚠️ IMPORTANTE:** Non cancellare né sovrascrivere i file untracked dell'autore. Completare la migrazione o documentare lo stato.

---

## Cosa fare

### 9.1 — Completare la migrazione wizard

Due opzioni:

**Opzione A — Completare il nuovo wizard (consigliata):**

1. Agganciare `src/tools/architect.js` al nuovo `pix-architect-cli` (CLI) o `pix-architect-web` (browser)
2. Aggiornare `pix_tool_architect` tool in tutte le modalità (full, summary, search, guardrails, check, tldr)
3. Rimuovere riferimenti al vecchio `context-server.mjs`

**Opzione B — Ripristinare il vecchio wizard:**

1. `git checkout HEAD -- skills/pix-architect/assets/`
2. Rimuovere i file untracked del nuovo wizard

**In entrambi i casi:** il tool `pix_tool_architect` deve funzionare in tutte le 6 modalità.

### 9.2 — Sanitizzare il wizard web (`skills/pix-architect-web/`)

Se si sceglie Opzione A, il wizard web ha problemi di sicurezza bloccanti:

**Problemi trovati dall'audit (P1-09):**

- `innerHTML` senza escaping → XSS
- `onclick`/`oninput` inline (viola i principi pix)
- `style=` inline (viola i principi pix)
- `server.listen(PORT)` senza host → ascolta su tutte le interfacce
- CORS `*`
- Nessun body limit
- Nessuna autenticazione

**Fix minimi:**

```js
// server.mjs: binding loopback
server.listen(PORT, "127.0.0.1", () => { ... });

// interview.js: sanitize before innerHTML
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}
// Usare textContent per dati, innerHTML solo per template trusted

// Sostituire onclick/oninput con addEventListener
```

### 9.3 — Aggiornare test

- `test/docs-architect.test.mjs` → crasha perché `templates.json` non esiste più. Aggiornare per il nuovo wizard.
- `test/architect-ui.test.mjs` → test Playwright, aggiornare per il nuovo wizard web.

---

## Comandi di verifica

```bash
# Verificare che pix_tool_architect funzioni in tutte le modalità
HOME=/tmp/pix-audit-home PIX_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node -e 'import{loadAllSkills}from"./src/core/skills.js";import{callTool}from"./src/tools/router.js";await loadAllSkills();
  for(const m of["full","summary","search","guardrails","check","tldr"]){
    const r=await callTool("pix_tool_architect",{mode:m,query:"test"});
    console.log(m,r.isError?"FAIL":"PASS");
  }'

# I test esistenti devono passare (dopo fix)
node test/docs-architect.test.mjs
npx playwright test test/architect-ui.test.mjs
```

---

## File da NON toccare (modifiche dell'autore)

- `skills/pix-architect/generator.mjs`
- `skills/pix-architect/validators.mjs`
- `skills/pix-architect/wizard-spec.json`
- `skills/pix-architect/placeholders.json`
- `skills/pix-architect/templates.json`
- `skills/pix-architect/knowledge/wizard-reborn-plan.md`
- Tutta `skills/pix-architect-cli/`
- Tutta `skills/pix-architect-web/`

Questi sono work-in-progress dell'autore. Vanno integrati, non cancellati.
