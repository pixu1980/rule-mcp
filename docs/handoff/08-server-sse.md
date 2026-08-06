# Handoff Fase 8 — Server, SSE e sicurezza runtime

**Per:** deepseek-v4-flash  
**Da:** gpt-5.6-sol (audit + remediation fasi 1-6)  
**Data:** 2026-07-15  
**File interessati:** `src/transport/sse.js`, `src/cli/commands.js`, `src/index.js`, `src/utils/sandbox.js`

---

## Contesto (cosa è già stato risolto in Fase 1.2)

- ✅ Bearer token generato all'avvio, stampato su stderr (`src/transport/sse.js:generateToken`)
- ✅ `/health` pubblico, `/sse` e `/message` richiedono `Authorization: Bearer <token>`
- ✅ CORS deny-by-default (solo origini in `ALLOWED_ORIGINS`)
- ✅ Body limit 1MB su POST `/message`
- ✅ `--port` CLI flag inoltrato a `startSseServer`
- ✅ Cross-origin bloccato con 403

**Cosa resta da fare:**

---

## 8.1 — Sandbox timeout con AbortController (`src/utils/sandbox.js`)

**Problema:** `withTimeout` restituisce errore al chiamante ma la Promise sottostante continua l'esecuzione. Una scrittura può completare dopo il timeout.

**Fix:**

```js
// src/utils/sandbox.js
export function withTimeout(promise, ms, signal) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        signal?.abort?.(); // notifica alla Promise di fermarsi
        reject(new Error(`Timeout after ${ms}ms`));
      }, ms);
      // cleanup
      promise.finally(() => clearTimeout(timer));
    }),
  ]);
}
```

Per tool mutanti (`rule_tool_fix`, `rule_tool_process_adr`): accettare `AbortSignal`, rispettarlo, prevenire scritture parziali dopo abort.

**Verifica:**

```bash
node test/sandbox.test.mjs  # deve passare senza regressioni
```

---

## 8.2 — Resource list/read coerenti per plugin (`src/resources/index.js`)

**Problema:** `listResources()` pubblica URI per skill plugin (es. `rule://caveman`) ma `readResource()` le rifiuta perché il regex accetta solo nomi che iniziano con `pix_tool`.

**Fix:** Due opzioni:

1. **Opzione A (consigliata):** `listResources()` non pubblica skill plugin. Solo skill ufficiali.
2. **Opzione B:** `readResource()` accetta anche skill plugin.

```js
// In listResources(): filtrare getSkillNames() per escludere plugin
for (const name of getSkillNames()) {
  if (name === "rule" || isPluginSkill(name)) continue;
  // ...
}
```

Inoltre `rule://skills` espone path assoluti del filesystem. Usare path relativi:

```js
// resources/index.js ~riga 80: usare relative(root, sp) invece di sp
```

**Verifica:**

```bash
# Verificare che risorse plugin non siano pubblicizzate
HOME=/tmp/rule-audit-home RULE_MCP_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node -e 'import{loadAllSkills}from"./src/core/skills.js";import{listResources}from"./src/resources/index.js";await loadAllSkills();const r=listResources();console.log(r.filter(x=>x.uri.includes("caveman")).length)' # deve essere 0
```

---

## 8.3 — Reload idempotente (`src/core/skills.js`, `src/tools/router.js`)

**Problema:** `loadAllSkills(force=true)` non svuota `_tools`. Una seconda chiamata raddoppia il registry: 76 → 152 tool.

**Fix:**

```js
// src/tools/router.js — clearTools deve essere chiamato all'inizio di loadAllSkills(force=true)
export function clearTools() {
  _tools.length = 0;
}

// src/core/skills.js — già chiama skillCache.clear(), aggiungere clearTools()
export async function loadAllSkills(force = false) {
  if (loaded && !force) return;
  if (force) {
    skillCache.clear();
    clearTools(); // ← aggiungere questa riga
  }
  // ...
}
```

**Verifica:** Chiamare `loadAllSkills()` due volte → stesso numero di tool.

---

## Comandi di verifica

```bash
pnpm test
node test/sandbox.test.mjs
node test/sse.test.mjs
node test/https.test.mjs

# Verifica reload idempotente
HOME=/tmp/rule-audit-home RULE_MCP_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node -e 'import{loadAllSkills}from"./src/core/skills.js";import{listTools}from"./src/tools/router.js";await loadAllSkills();console.log(listTools().length);await loadAllSkills(true);console.log(listTools().length)' # devono essere uguali
```
