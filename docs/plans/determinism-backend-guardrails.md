# Execution Plan — Determinismo + Guardrail Backend/Data

**Origine:** Richiesta esplicita post mega-review  
**Data:** 2026-07-15  
**Principio:** Il sistema deve garantire che codice non validato non possa essere consegnato. I guardrail devono coprire backend, database e DevOps, non solo frontend.

---

## Asse A — Determinismo: gateway + receipt

Il problema: MCP non può forzare l'ordine di chiamata dei tool. Il modello può saltare `pix_tool`, chiamare direttamente skill-tool, o mentire sull'esito di `rule_tool_check`.

La soluzione: un **unico entrypoint orchestratore** che fa tutto server-side e restituisce una ricevuta verificabile.

### A.1 — Nuovo tool `rule_tool_gateway`

- [ ] **A.1.1** Creare `rule_tool_gateway` in `src/tools/gateway.js`
  - Input: `{ prompt, code?, path?, framework? }`
  - Step 1 (server-side): routing via BM25 → skill primaria + secondarie
  - Step 2 (server-side): caricamento evidenza dalle skill (full/summary in base alla dimensione)
  - Step 3 (server-side): se `code` è fornito, esegue `checkCode()` contro la skill primaria
  - Step 4: restituisce `{ route, evidence, checkResult?, sessionReceipt }`
  - Il modello riceve TUTTO in una risposta sola. Non può "dimenticare" di chiamare il prossimo tool.

- [ ] **A.1.2** `sessionReceipt` firmato server-side
  - `crypto.createHmac("sha256", serverSecret).update(sha256(code) + skillName + timestamp).digest("hex")`
  - Il server mantiene un set in-memory delle receipt valide per la sessione
  - `rule_tool_apply` (tool di scrittura) richiede `receipt` valida per gli stessi byte

- [ ] **A.1.3** `rule_tool_apply` — l'unico tool che scrive file
  - Input: `{ files: [{ path, content }], receipt }`
  - Verifica che la receipt corrisponda all'hash del contenuto
  - Rifiuta se `rule_tool_check` non era `allPass: true`
  - Applica sandbox (path traversal, dry-run, atomic write)

- [ ] **A.1.4** Feature flag `RULE_MCP_STRICT_MODE=1`
  - In strict mode: i tool `rule_tool_fix`, `rule_tool_process_adr` e le skill-tool in modalità check sono disabilitati
  - Solo `rule_tool_gateway` + `rule_tool_apply` + tool read-only sono esposti
  - Questo rende il workflow deterministico per costruzione (non per convenzione)

### A.2 — ricevuta nell'enforcement contract

- [ ] **A.2.1** `postprocessToolResult` per `rule_tool_gateway` allega receipt firmata
- [ ] **A.2.2** `rule_tool_apply` valida receipt prima di scrivere
- [ ] **A.2.3** Test: codice modificato dopo check → receipt non corrisponde → `rule_tool_apply` rifiuta

---

## Asse B — Guardrail backend, database, devops, security

Principio: stesso pattern di `SHARED_GUARDRAILS` ma con check specifici per ogni dominio. Regex-based, deterministici, testabili.

### B.1 — BACKEND_GUARDRAILS (SQL, API, Express, NestJS, Fastify, Hono)

- [ ] **B.1.1** `sql-injection` — Rileva query concatenate
  - Pattern: `"SELECT" + var`, `` `SELECT ${var}` ``, `"INSERT INTO" +`
  - Passa se tutte le query usano `$1`/`?` placeholders o ORM methods

- [ ] **B.1.2** `parameterized-queries` — Verifica uso placeholder
  - Express: `db.query("SELECT ... WHERE id = $1", [id])` → pass
  - Raw: `db.query("SELECT ... WHERE id = " + id)` → fail

- [ ] **B.1.3** `error-sanitization` — Nessun stack trace in produzione
  - `console.error(err.stack)` → warning
  - `res.status(500).json({ error: err.message })` → fail (esponi dettagli)
  - `res.status(500).json({ error: "Internal server error" })` → pass

- [ ] **B.1.4** `input-validation` — Zod/Joi/class-validator presente
  - Express/Fastify/Hono: `z.object(...).parse(...)` o middleware validation
  - NestJS: `@Body() dto: CreateUserDto` con `class-validator`

- [ ] **B.1.5** `rate-limiting` — Rate limiter configurato
  - Express: `express-rate-limit` importato e usato
  - Fastify: `@fastify/rate-limit` registrato
  - NestJS: `ThrottlerModule` importato

- [ ] **B.1.6** `cors-explicit` — CORS configurato con origini esplicite
  - NO `origin: "*"` o `origin: true` senza allowlist
  - Pattern: `origin: ["https://..."]` o funzione di validazione

- [ ] **B.1.7** `helmet-security-headers` — Security headers attivi
  - Express: `helmet()` chiamato
  - Fastify: `@fastify/helmet` registrato
  - NestJS: `helmet()` in `main.ts`

### B.2 — DATABASE_GUARDRAILS (PostgreSQL, MySQL, MongoDB, SQL generico)

- [ ] **B.2.1** `migration-safety` — DDL con `IF NOT EXISTS` / `IF EXISTS`
  - `CREATE TABLE` senza `IF NOT EXISTS` → fail
  - `DROP TABLE` senza `IF EXISTS` → fail
  - `ALTER TABLE ... ADD COLUMN` senza `IF NOT EXISTS` → fail

- [ ] **B.2.2** `index-strategy` — Indici su foreign keys e colonne di query
  - Tabella con FK → avvisa se manca `CREATE INDEX`
  - `WHERE` clause su colonna non indicizzata → avvisa

- [ ] **B.2.3** `transaction-safety** — Operazioni multiple in transazione
  - Più `INSERT`/`UPDATE`/`DELETE` senza `BEGIN`/`COMMIT` → fail
  - Pattern: `db.transaction(async (tx) => { ... })` → pass

- [ ] **B.2.4** `connection-pooling** — Pool configurato
  - PostgreSQL: `pg.Pool` con `max` definito
  - MySQL: `mysql2/promise` con `connectionLimit`
  - MongoDB: `maxPoolSize` in connection string

- [ ] **B.2.5** `mongodb-injection** — No `$where` con input utente
  - Pattern: `{ $where: "this.field == '" + input + "'" }` → fail
  - Pattern: `Model.find({ field: input })` → pass (Mongoose sanitizza)

- [ ] **B.2.6** `mongodb-index** — Indici per collection queries comuni
  - `Model.find({ field: ... })` senza `ModelSchema.index({ field: 1 })` → warning

### B.3 — DEVOPS_GUARDRAILS (Docker, CI, Testing)

- [ ] **B.3.1** `docker-non-root` — Container non esegue come root
  - `USER node` o `USER 1001` presente → pass
  - Nessuna istruzione `USER` → warning
  - `USER root` senza successivo `USER` → fail

- [ ] **B.3.2** `docker-healthcheck` — HEALTHCHECK definito
  - `HEALTHCHECK` instruction presente → pass

- [ ] **B.3.3** `docker-multi-stage** — Build multi-stage per immagini più piccole
  - Più istruzioni `FROM` → pass
  - `FROM ... AS builder` + `FROM ... AS production` → pass

- [ ] **B.3.4** `ci-cache** — Cache per dependencies in CI
  - `actions/cache` o `cache: "pnpm"` in setup-node → pass

- [ ] **B.3.5** `test-coverage** — Comando coverage negli script
  - `"test:coverage"` o `"coverage"` in `package.json` scripts → pass

- [ ] **B.3.6** `env-file-exclusion** — `.env` in `.gitignore`
  - `.gitignore` contiene `.env` → pass

### B.4 — SECURITY_GUARDRAILS (già in parte coperti da B.1)

- [ ] **B.4.1** `secret-detection** — Nessun secret hardcoded
  - Pattern: `password\s*=\s*["'][^"']+["']`, `apiKey\s*=\s*["'][^"']+["']`
  - `process.env.SECRET` → pass
  - `const SECRET = "abc123"` → fail

- [ ] **B.4.2** `https-enforcement** — HTTPS in produzione
  - `app.listen()` senza HTTPS in produzione → warning
  - `https.createServer()` o reverse proxy config → pass

- [ ] **B.4.3** `dependency-pinning** — Versioni esatte in `package.json`
  - `"express": "^4.18.0"` → warning
  - `"express": "4.18.0"` → pass

### B.5 — Mappatura guardrail → skill

| Guardrail set | Skill triggerate |
|---|---|
| `SHARED_GUARDRAILS` | Tutte (esistente) |
| `FRAMEWORK_GUARDRAILS` | react, vue, angular, svelte, solid (esistente) |
| `BACKEND_GUARDRAILS` | express, fastify, nestjs, hono, backend-node, backend-api-design |
| `DATABASE_GUARDRAILS` | postgresql, mysql, mongodb, sqlite, duckdb, indexed-db, sql |
| `DEVOPS_GUARDRAILS` | docker, gitlab-ci, testing, version |
| `SECURITY_GUARDRAILS` | backend-security, platform-agent |

---

## Asse C — Integrazione gateway + guardrail

- [ ] **C.1** `getGuardrails(skillName)` ampliato per includere backend/database/devops/security
  - Mapping dichiarativo in `guardrail-defs.js`: `{ "rule-backend-express": "backend", "rule-data-postgresql": "database", ... }`

- [ ] **C.2** `rule_tool_gateway` usa `getGuardrails` internamente
  - Riceve `skill` dalla route, carica i guardrail corretti
  - Se `code` presente, esegue `checkCode(skill, code, context)` con i guardrail del dominio

- [ ] **C.3** Test per ogni categoria
  - SQL injection: query concatenata → fail
  - Migration safety: `CREATE TABLE` senza `IF NOT EXISTS` → fail
  - Docker: `USER root` senza switch → fail
  - Secret: password hardcoded → fail
  - Express: no helmet → fail
  - PostgreSQL: no connection pool → warning

---

## Priorità e dipendenze

```
A.1 (gateway)        ← nessuna dipendenza, da fare subito
A.2 (receipt)        ← dipende da A.1
A.3 (strict mode)    ← dipende da A.1 + A.2
B.1 (backend)        ← indipendente, può essere parallelo ad A
B.2 (database)       ← indipendente
B.3 (devops)         ← indipendente
B.4 (security)       ← indipendente
C.1 (mapping)        ← dipende da B.1-B.4
C.2 (integrazione)   ← dipende da A.1 + C.1
C.3 (test)           ← dipende da tutto
```

## Gate di accettazione

- [ ] `rule_tool_gateway({ prompt: "Crea API Express con PostgreSQL" })` → route `rule-backend-express` + evidence caricata + checkResult se code presente
- [ ] `rule_tool_gateway({ prompt, code: "db.query('SELECT * FROM users WHERE id = ' + req.params.id)" })` → `checkResult.allPass: false`, failed contiene `sql-injection`
- [ ] `rule_tool_apply` con receipt valida → file scritto
- [ ] `rule_tool_apply` con receipt per codice diverso → rifiutato
- [ ] `RULE_MCP_STRICT_MODE=1` → solo `rule_tool_gateway` + tool read-only esposti
- [ ] Backend guardrail: almeno 3 check per dominio, tutti con test avversariali
