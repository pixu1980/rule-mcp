# Execution Plan — Remediation completa post mega-review

**Origine:** `docs/reports/claude-compliance-mega-review.md` + `docs/reports/gpt-5.6-sol-compliance-mega-review.md`  
**Data piano:** 2026-07-15  
**Commit baseline:** `4d9764b`  
**Totale finding da chiudere:** 8 P0 + 12 P1 + 8 P2 (GPT) + 3 P0 + 6 P1 + 1 P3 (Claude)

## Legenda severità

| Tag | Significato |
|---|---|
| 🔴 P0 | Bloccante: release, sicurezza o integrità dati a rischio immediato |
| 🟠 P1 | Alto: funzionalità core rotta o garanzia debole |
| 🟡 P2 | Medio: manutenzione, drift, mancata conformità |
| 🟢 P3 | Basso: miglioramento progressivo, ottimizzazione |

---

## Fase 1 — Sicurezza file-system e superficie d'attacco (P0)

- [ ] **1.1** 🔴 Sandbox `pix_fix mode=generate` — `src/tools/fix.js:58-79`, `src/core/file-tree.js:560-599`
  - [ ] `resolve()` + `relative()` prima di ogni `writeFileSync`/`mkdirSync`; rifiutare path assoluti, `..`, symlink escape
  - [ ] `dryRun` realmente read-only: nessuna scrittura quando `dryRun !== false`
  - [ ] File esistenti: politica di collisione esplicita (skip/backup/error), no overwrite silenzioso
  - [ ] Tag custom element con trattino obbligatorio (`customElements.define("my-component", …)`, non `"mycomponent"`)
  - [ ] Test: `dryRun: true` non scrive file; `baseDir: "../outside"` lancia errore; file esistente non sovrascritto senza flag
  - [ ] File interessati: `src/tools/fix.js`, `src/core/file-tree.js`, `src/core/template-data.js`

- [ ] **1.2** 🔴 Auth + CORS + body limit su SSE — `src/transport/sse.js:38`, `src/cli/daemon.js`
  - [ ] Token bearer random generato all'avvio, stampato su stderr; health endpoint escluso
  - [ ] `Access-Control-Allow-Origin` → deny-by-default o allowlist; validazione `Origin` header
  - [ ] `Content-Length` max body POST (es. 1 MB) prima di accumulare `Buffer.concat`
  - [ ] Nuova sessione SSE non deve chiudere forzatamente sessioni esistenti senza avviso
  - [ ] Test: CSRF-like da browser (fetch cross-origin → 403); body oversize → 413

- [ ] **1.3** 🔴 Disabilitare `previousPassed` pubblico — `src/core/guardrails.js:93-100`
  - [ ] Rimuovere il parametro `previousPassed` dallo schema Zod pubblico di `pix_check`
  - [ ] Oppure: emettere ricevuta `{ receipt: hmacSha256(code + context + guardrailVersion), expiresAt }` e richiederla nel pass successivo
  - [ ] Il pass finale deve sempre rieseguire **tutti** i check, non saltarne nessuno
  - [ ] Test: passando `previousPassed` con tutti gli ID + codice non conforme → `allPass: false`

---

## Fase 2 — Conformità protocollo MCP (P0)

- [ ] **2.1** 🔴 Correggere `prompts/get` — `src/server.js:150-154`, `src/prompts/index.js`
  - [ ] Shape: `{ description, messages }` al top level (non `{ prompt: {…} }`)
  - [ ] Ruolo: `"user"` o `"assistant"` (non `"system"`); convertire ogni messaggio sistema in `role: "user"`
  - [ ] Test: `GetPromptResultSchema.safeParse(result).success === true` per tutti i 5 prompt
  - [ ] Validazione: `node -e 'import {GetPromptResultSchema} from "@modelcontextprotocol/sdk/types.js"; …'`

- [ ] **2.2** 🔴 Rimuovere o correggere MCP completion — `src/server.js:96-130`
  - [ ] `ref.type === "ref"` non esiste nello spec. Usare `ref/prompt` o `ref/resource` se applicabile
  - [ ] In alternativa: rimuovere l'handler `CompleteRequestSchema` e la capability `completions` finché non serve
  - [ ] Test: `complete/list` restituisce capability vuota o corretta

---

## Fase 3 — Build, release, CI e packaging (P0 + P1)

- [ ] **3.1** 🔴 Rendere `embed-skills.mjs` riproducibile — `scripts/embed-skills.mjs`
  - [ ] **Mai** leggere `$HOME` durante build/release
  - [ ] Il repository è la sorgente canonica: le skill in `skills/` vanno copiate, non distrutte
  - [ ] Validazione pre-publish: conteggio + hash delle skill; fallire se < N attese
  - [ ] Test: build in `/tmp` con `HOME=/tmp/empty` conserva tutte le skill (69 SKILL.md + pix)

- [ ] **3.2** 🔴 Riparare pipeline CI e release — `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `package.json`
  - [ ] Rimuovere riferimenti a file inesistenti: `test/galaxy.test.mjs`, `scripts/package.mjs`
  - [ ] `lint` e `format`: aggiungere `eslint` e `prettier` come devDependencies, rimuovere `|| echo`
  - [ ] `test:all` in `package.json`: escludere `add-once.test.mjs` e `architect-ui.test.mjs` (o eseguirli con `pnpm exec playwright test`)
  - [ ] `ci` script: allineare con i file esistenti; includere `test/skills-docs.test.mjs` e `test/docs-architect.test.mjs` solo dopo fix
  - [ ] Aggiungere `LICENSE` file (MIT) nella root
  - [ ] Dockerfile: rimuovere `COPY LICENSE` se non esiste; usare multi-stage per non dipendere da `$HOME`

- [ ] **3.3** 🔴 Correggere `package.json` metadata e self-dependency
  - [ ] Rimuovere `"pix-galaxy-mcp": "link:"` da `dependencies`
  - [ ] Allineare versioni `package.json` (1.0.0) e `server.json` (`packages[0].version`)
  - [ ] `server.json`: `"source": "github"` non `"gitlab"`
  - [ ] `description`: rimuovere "Zero npm dependencies" o qualificare (SDK + Zod sono deps)
  - [ ] README: aggiornare conteggio tool (76 non 71) e risorse; aggiungere link al report
  - [ ] `scripts/package.sh`: non sovrascrivere gli installer universali; fallire esplicitamente se `npm pack` fallisce

---

## Fase 4 — Guardrail, enforcement e ricevute (P0 + P1)

- [ ] **4.1** 🔴 Correggere parser CSS/JSX nei guardrail — `src/core/guardrail-defs.js`
  - [ ] `extractRealCSS()`: aggiungere strategia per CSS raw (non fenced, non sheet, no `<style>`)
  - [ ] Regex classi: riconoscere `.foo:hover`, `.foo > span`, `.foo.bar`, `[class*="…"]`, attributi `className`
  - [ ] Inline style: riconoscere `style={{…}}` in JSX/TSX (React, Solid)
  - [ ] Import CSS: accettare `import "./foo.css"` e `import styles from "./foo.module.css"` per React/Solid
  - [ ] Test: `rawCss → no-css-classes fail`, `reactStyle → no-inline-styles fail`, `reactImport → external-css pass`

- [ ] **4.2** 🔴 Validazione `pix_check` con ricevuta opzionale
  - [ ] `checkCode()` restituisce `{ allPass, failed, receipt?, artifactHash? }`
  - [ ] `receipt` opzionale via `crypto.createHmac("sha256", serverSecret).update(sha256(code) + context).digest("hex")`
  - [ ] Documentare che senza host extension, la ricevuta è fiduciaria e non binding sul testo finale del modello

- [ ] **4.3** 🟠 Correggere terminologia enforcement — README, `docs/`, `src/core/enforcement.js`
  - [ ] Sostituire "enforced" / "mandatory" con "advisory" / "strongly recommended" dove appropriato
  - [ ] Aggiungere disclaimer: "Nessun meccanismo MCP può forzare un modello a chiamare un tool prima di rispondere"
  - [ ] Mantenere il contratto testuale PIX ENFORCEMENT CONTRACT come nudge utile, ma declassarlo a reminder

---

## Fase 5 — Router, detection e ranking (P0 + P1 + P2)

- [ ] **5.1** 🔴 Separare dominio da framework nel routing — `src/tools/ai.js`
  - [ ] Step 1: classificare dominio (backend / frontend / data / devops / process / styleguide)
  - [ ] Step 2: solo dentro il dominio pertinente, applicare bias framework da `pix_detect`
  - [ ] `pix_detect` su questo repo non deve forzare route frontend per prompt backend
  - [ ] Test: prompt "proteggi servizio backend" con path di questo repo → primo risultato `pix-backend-security`, non `pix-frontend-vanilla-reactive`

- [ ] **5.2** 🟠 Score confidence assoluto + soglia unknown
  - [ ] Rinominare `confidence` in `relativeScore`; aggiungere `absoluteScore`
  - [ ] Threshold: se `absoluteScore < minThreshold`, rispondere `{ route: "unknown", suggestion: "rephrase" }`
  - [ ] Test: "Build a secure API" non restituisce `pix-platform-library` con score 1

- [ ] **5.3** 🟡 Alias multilingua
  - [ ] Aggiungere mappa sinonimi IT/FR/ES/DE per i termini dominio più frequenti (rate limiting, sicurezza, abusi, database, ecc.)
  - [ ] Alternativa: embeddings leggeri (es. `fasttext-lid` + mappa statica) se il BM25 puro non basta
  - [ ] Test: prompt IT/FR per sicurezza backend → `pix-backend-security` come prima scelta

- [ ] **5.4** 🟡 Correggere TLDR top-k globale → `src/tools/skill.js:104`
  - [ ] Filtrare il corpus per skill **prima** di applicare `search(query, N)`, non dopo
  - [ ] Test: query canonica per le 30 skill che ora restituiscono vuoto → almeno una sezione trovata

- [ ] **5.5** 🔴 Separare plugin dal corpus ufficiale — `src/core/skills.js`, `src/tools/router.js`
  - [ ] `loadAllSkills()`: flag `includePlugins` (default `false`)
  - [ ] Plugin in registry separato; mai esposti automaticamente in `tools/list` di default
  - [ ] `loadPluginJs()`: allowlist o firma; no `import()` arbitrario senza consenso
  - [ ] Test: ambiente isolato (HOME=/tmp/empty) → 76 tool; ambiente reale → 76 + plugin solo se flag esplicito

---

## Fase 6 — Template, generatori e componenti (P0 + P1)

- [ ] **6.1** 🔴 Rendere `pix_component` framework-aware — `src/core/templates.js`, `src/core/template-data.js`
  - [ ] React: output con JSDoc obbligatorio
  - [ ] Svelte: output con `css-comments-required` soddisfatto
  - [ ] Angular/Astro/Solid: generare codice specifico del framework, non HTML generico con `{{ label }}`
  - [ ] Tutti i framework: `<button type="button">`; modal con `<dialog>` + `.showModal()` + `aria-label` su close
  - [ ] Guardrail: ogni output deve passare `pix_check` per il framework corrispondente
  - [ ] Test: matrice 6 componenti × 7 framework = 42 output, tutti `allPass: true`

- [ ] **6.2** 🔴 Correggere `pix_fix generate` — `src/core/file-tree.js:560-599`
  - [ ] Aggiungere case espliciti per Angular e Astro (non cadere nel default custom element)
  - [ ] Naming: `formField` → folder `FormField` non `Formfield` (rispetta camelCase→PascalCase)
  - [ ] Usare estensione `.jsx` per React, `.vue` per Vue, `.svelte` per Svelte, `.ts` per Angular
  - [ ] Rimuovere `customElements.define("button", …)` — tag senza trattino è invalido

- [ ] **6.3** 🟡 Rimuovere asset duplicati `assets/assets` — `skills/pix-backend-node/`, `skills/pix-devops-docker/`, `skills/pix-devops-gitlab-ci/`, `skills/pix-platform-expo/`
  - [ ] Verificare se `assets/assets/templates` è intenzionale o bug di copia
  - [ ] Correggere `copySkill()` in `src/cli/skills-install.js` che usa `parentPath` assoluto duplicando il path

---

## Fase 7 — Installer, uninstaller e gestione configurazioni (P1)

- [ ] **7.1** 🟠 Rendere installer lossless — `src/cli/install.js`
  - [ ] `parseJson()` fail-closed: non trasformare JSON invalido in `{}`; restituire errore
  - [ ] `backupFile()` chiamato automaticamente prima di ogni `writeText()` su file esistente
  - [ ] Write atomica: `writeFileSync(tmpPath)` + `renameSync(tmpPath, target)`
  - [ ] Test round-trip: install → reinstall (idempotente) → uninstall per tutti i 23 agenti

- [ ] **7.2** 🟠 Correggere `skills install --all` per ambienti non-TTY — `src/cli/skills-install.js`
  - [ ] Se `--all` e stdin non è TTY: installazione non-interattiva, no `setRawMode()`
  - [ ] `copySkill()`: usare `entry.parentPath ?? source` correttamente
  - [ ] Test: `--all --scope project` in pipe CI → termina senza crash; directory `assets/assets` non create

- [ ] **7.3** 🟠 Rimuovere raccolta API key dall'installer shell — `scripts/install.sh:400-450`
  - [ ] Eliminare il prompt API key interattivo (il server MCP non usa chiavi API)
  - [ ] Se serve per comodità, usare `read -s` (silent) e `chmod 600`; mai scrivere in shell rc
  - [ ] Rimuovere `$HOME/.config/pix-galaxy-mcp/openai-key`

---

## Fase 8 — Server, SSE e sicurezza runtime (P0 + P1)

- [ ] **8.1** 🟠 Rendere SSE port configurabile da CLI — `src/index.js:296`, `src/cli/commands.js:178`
  - [ ] `serveCommand` accetti `port` da `getArg("--port")`
  - [ ] `src/cli/commands.js` passi `port` a `startSseServer`
  - [ ] Test: `serve --transport sse --port 3099` ascolta su 3099, non 37999

- [ ] **8.2** 🟠 Sandbox timeout con `AbortController` — `src/utils/sandbox.js`
  - [ ] `withTimeout`: accettare `AbortSignal`; la Promise interna deve rispettarlo
  - [ ] Per tool mutanti: `AbortError` deve prevenire scritture parziali
  - [ ] Test: timeout scatta → nessun file creato

- [ ] **8.3** 🟠 Correggere resource list/read per plugin — `src/resources/index.js`
  - [ ] `listResources()`: non esporre URI per skill plugin se non risolvibili
  - [ ] `readResource()`: accettare URI plugin (es. `pix://caveman`) o non pubblicizzarli
  - [ ] `pix://skills`: non esporre path assoluti del filesystem; usare path relativi al progetto

---

## Fase 9 — Architect e wizard (P0 + P1)

- [ ] **9.1** 🔴 Risolvere la migrazione pix-architect — `skills/pix-architect/`, `skills/pix-architect-cli/`, `skills/pix-architect-web/`, `src/tools/architect.js`
  - [ ] **Opzione A:** completare la migrazione a `pix-architect-cli`/`pix-architect-web` come unico wizard
  - [ ] **Opzione B:** ripristinare `skills/pix-architect/assets/context-server.mjs` e rimuovere i fork untracked
  - [ ] In entrambi i casi: un solo wizard attivo; `pix_architect` tool funzionante in tutte le modalità
  - [ ] Aggiornare test `docs-architect.test.mjs` e `architect-ui.test.mjs`

- [ ] **9.2** 🔴 Sanitizzare il wizard web — `skills/pix-architect-web/interview.js`, `server.mjs`, `index.html`
  - [ ] Sostituire `innerHTML` con `textContent` o escaping esplicito prima dell'interpolazione
  - [ ] Sostituire `onclick`/`oninput` inline con `addEventListener`
  - [ ] Rimuovere `style=` inline
  - [ ] `server.listen(PORT, "127.0.0.1")` — binding loopback obbligatorio
  - [ ] Validazione `Origin` e token sessione
  - [ ] `Content-Length` max body
  - [ ] Test: input `<script>alert(1)</script>` → non eseguito

---

## Fase 10 — Documentazione, skill e manutenzione (P1 + P2 + P3)

- [ ] **10.1** 🟡 Aggiungere `See also` alle skill mancanti — `skills/pix-data-duckdb/SKILL.md`, `skills/pix-data-indexed-db/SKILL.md`, `skills/pix-data-sqlite/SKILL.md`
  - [ ] Sezione `## See also` con link a `pix-data-sql`, `pix-data-postgresql`, `pix-data-mongodb`
  - [ ] Test: `test/skills-docs.test.mjs` passa

- [ ] **10.2** 🟡 Correggere documentazione interna obsoleta — `docs/01-product-architecture.md`, `docs/02-tools-operations.md`
  - [ ] 32 token name obsoleti (`pix_react` → `pix_frontend_react`, `pix_angular` → `pix_frontend_angular`, `pix_docker` → `pix_devops_docker`, ecc.)
  - [ ] Sostituire tutti i riferimenti con i nomi tool attuali
  - [ ] `README.md`: aggiornare conteggi e rimuovere claim inaccurate

- [ ] **10.3** 🟡 Aggiungere `annotations` a tutti i tool — `src/tools/router.js`, `src/tools/skill.js`, `src/tools/ai.js`
  - [ ] `readOnlyHint: true` per `pix`, `pix_search`, `pix_check`, `pix_detect`, `pix_scaffold`, skill-tool
  - [ ] `destructiveHint: true` per `pix_fix`, `pix_process_adr`
  - [ ] `idempotentHint: false` per `pix_fix`

- [ ] **10.4** 🟡 Correggere handoff — `src/tools/handoff.js`
  - [ ] `projectDir` passato come `cwd` per `execSync("git …")`
  - [ ] `git status` con `--porcelain` per includere untracked
  - [ ] Redact: mai inviare path assoluti o secret nel contesto

- [ ] **10.5** 🟢 Migliorare `doctor` — `src/cli/doctor.js`
  - [ ] Fallire (o warning) se prompt MCP non validi, build assente, file chiave mancanti
  - [ ] Verificare versione lockfile, conteggio skill consistente

- [ ] **10.6** 🟢 Auto-ADR opt-in — `src/tools/adr.js:327`
  - [ ] Disabilitare l'hook wildcard di default
  - [ ] Abilitare solo se `PIX_AUTO_ADR=1` o flag esplicito nella richiesta
  - [ ] Aggiungere lock/atomic rename per evitare race condition

- [ ] **10.7** 🟢 Fix `test:all` in `package.json`
  - [ ] Separare test Node (`test/*.test.mjs`) da test Playwright (`test/add-once.test.mjs`, `test/architect-ui.test.mjs`)
  - [ ] `test:all`: solo test Node; `test:e2e`: Playwright

- [ ] **10.8** 🟢 Risolvere dipendenze cicliche — `src/tools/router.js` ↔ `src/tools/skill.js` ↔ `src/core/skills.js`
  - [ ] Identificare i 3-4 cicli principali e romperli con factory, lazy import o event emitter
  - [ ] Garantire ordine di inizializzazione deterministico

---

## Fase 11 — Integrazione nativa Claude Skills e multi-agente (P1 + P3)

- [ ] **11.1** 🟠 Ponte verso `.claude/skills/` — `src/cli/skills-install.js`, `scripts/install.sh`
  - [ ] Opzione `--agent claude --format native-skills`: scrivere `SKILL.md` con frontmatter YAML in `.claude/skills/`
  - [ ] La scoperta automatica nativa di Claude si attiva senza bisogno di tool MCP
  - [ ] Test: installazione Claude → `ls ~/.claude/skills/pix-*/SKILL.md` contiene le skill principali

- [ ] **11.2** 🟠 Documentare `allowedTools` raccomandato per ogni host
  - [ ] README: esempio `mcp.json` con `allowedTools: ["pix", "pix_check", "pix_search", "pix_scaffold", …]`
  - [ ] Per Claude Code: nota su Tool Search attivo di default e superficie totale

- [ ] **11.3** 🟢 Migliorare 59/70 descrizioni skill con "Use when…" formula
  - [ ] Template: `"Use when <condition> to <action>. Covers <topics>."`
  - [ ] Aggiornare `SKILL.md` frontmatter di tutte le skill che non seguono già il pattern

---

## Riepilogo dipendenze tra fasi

```
Fase 1 (Sicurezza)          ← nessuna dipendenza, priorità massima
Fase 2 (MCP protocol)       ← nessuna dipendenza
Fase 3 (Build/CI/release)   ← dipende da Fase 1.3 (embed-skills) e Fase 2.1 (prompts)
Fase 4 (Guardrail)          ← dipende da Fase 1.3 (previousPassed)
Fase 5 (Router)             ← nessuna dipendenza, ma va dopo Fase 1 per sicurezza
Fase 6 (Template/generatori) ← dipende da Fase 4 (guardrail fissati) e Fase 5 (router)
Fase 7 (Installer)          ← nessuna dipendenza forte
Fase 8 (SSE/server)         ← dipende da Fase 1.2 (auth CORS)
Fase 9 (Architect)          ← può essere parallela
Fase 10 (Documentazione)    ← può essere parallela, ultima per conteggi aggiornati
Fase 11 (Claude nativo)     ← dipende da Fase 7 (installer)
```

## Gate di accettazione finale

- [ ] `pnpm test` → ✅
- [ ] `pnpm run ci` → ✅ (con test mancanti aggiunti)
- [ ] `pnpm build` in `/tmp` con `HOME=/tmp/empty` → skills preservate, tarball creato
- [ ] `PIX_DISABLE_AUTO_ADR=1` → nessun ADR creato automaticamente
- [ ] `pix_check` su codice non conforme → `allPass: false`
- [ ] `pix_fix` con `dryRun: true` → nessun file scritto
- [ ] `pix_fix` con `baseDir: "../outside"` → errore, no scrittura
- [ ] `pix` con prompt backend su questo repo → route `pix-backend-security` o `pix-backend-*`, non frontend
- [ ] SSE avviato con `--port N` → ascolta su N
- [ ] SSE senza token → 401; richiesta cross-origin → 403
- [ ] `prompts/get` restituisce shape e ruoli validi per SDK
- [ ] `server.json` versioni coerenti con `package.json`
- [ ] Tutti i 23 agenti installano e disinstallano senza perdita di configurazioni preesistenti
