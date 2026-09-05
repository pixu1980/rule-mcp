# Censimento completo rule-mcp

> Censimento di **tutti** i tool MCP della famiglia `pix_tool`/`rule-tool` e di **tutti** i comandi slash `/rule-*`.
> Fonte: ispezione diretta del server (`src/tools/`, `src/prompts/`, `src/core/agent-commands.js`, `src/core/review-roles.js`) e del client MCP.
> Ultimo aggiornamento: 2026-09-05

---

## 1. Tool MCP — registrazione `pix_tool` / esposizione `rule-tool`

Il server espone **307 tool** via MCP, in 3 famiglie:

| Famiglia                                | Conteggio |
| --------------------------------------- | --------- |
| Tool core                               | 19        |
| Tool per-skill (generati da `skills/*`) | 94        |
| Risorse `read-*`                        | 194       |

---

### A. Tool core (19)

| #   | Tool (registrazione `pix_tool`) | Esposto come `rule-tool-*`  | Funzione                                                                                      |
| --- | ------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | `pix_tool`                      | `rule-tool`                 | Router: instrada un prompt alla skill corretta e restituisce le sezioni rilevanti             |
| 2   | `rule_tool_update`               | `rule-tool-update`          | Update del server MCP (fast-forward) + hot-reload skill, restart se il codice è cambiato      |
| 3   | `rule_tool_gateway`              | `rule-tool-gateway`         | Orchestratore single-entry: prompt → skill evidence → guardrail → receipt                     |
| 4   | `rule_tool_apply`                | `rule-tool-apply`           | Scrive file su disco dopo la validazione del gateway (richiede il receipt; dryRun di default) |
| 5   | `rule_tool_search`               | `rule-tool-search`          | Ricerca semantica BM25 su tutte le skill rule                                                  |
| 6   | `rule_tool_check`                | `rule-tool-check`           | Guardrail check su una skill; iterare fino a `allPass: true`                                  |
| 7   | `rule_tool_scaffold`             | `rule-tool-scaffold`        | Genera file di scaffolding/config del progetto                                                |
| 8   | `rule_tool_detect`               | `rule-tool-detect`          | Rileva framework, usage TypeScript e build tool da `package.json`                             |
| 9   | `rule_tool_compress`             | `rule-tool-compress`        | Compressione deterministica della prosa (filler, punteggiatura, spellings)                    |
| 10  | `rule_tool_plan`                 | `rule-tool-plan`            | Persona expert (security, privacy, a11y, …) → contract operazione plan/audit/review           |
| 11  | `rule_tool_plan_docs`            | `rule-tool-plan-docs`       | Bookkeeping dei doc audit/review/plan (headers, tabelle, status)                              |
| 12  | `rule_tool_stats`                | `rule-tool-stats`           | Telemetria: call count, cache hit rate, token salvati/stimati, latenza                        |
| 13  | `rule_tool_usage`                | `rule-tool-usage`           | Sidecar d'uso agente: input/output/cache token, cost USD, modello                             |
| 14  | `rule_tool_a11y_report`          | `rule-tool-a11y-report`     | Report WCAG-EM da criterio + risultati di audit                                               |
| 15  | `rule_tool_process_handon`       | `rule-tool-process-handon`  | Legge l'ultimo handoff in `docs/handoff/` e verifica le sue affermazioni                      |
| 16  | `rule_tool_process_adr`          | `rule-tool-process-adr`     | Salva un ADR numerato in `docs/adr/` (template Nygard)                                        |
| 17  | `rule_tool_fix`                  | `rule-tool-fix`             | Lint/auto-fix della struttura file del progetto (barrel, naming, …)                           |
| 18  | `rule_tool_process_handoff`      | `rule-tool-process-handoff` | Genera handoff compresso per la sessione successiva (mode handoff / close-session)            |
| 19  | `rule_tool_component`            | `rule-tool-component`       | Template component/test secondo i principi rule                                                |

---

### B. Tool per-skill (94, generati dinamicamente da `skills/*`)

Ogni skill `rule-*` nella cartella `skills/` viene registrata come un tool `rule-tool-<skill>` con le mode:

```
full | summary | tldr | search | guardrails | check        (+ scaffold solo per rule-styleguide)
```

#### rule-ai (6)

- `rule-tool-ai`
- `rule-tool-ai-agent-architecture`
- `rule-tool-ai-agents`
- `rule-tool-ai-context-engineering`
- `rule-tool-ai-evals`
- `rule-tool-ai-prompting`

#### rule-backend (10)

- `rule-tool-backend`
- `rule-tool-backend-api-design`
- `rule-tool-backend-express`
- `rule-tool-backend-fastify`
- `rule-tool-backend-graphql`
- `rule-tool-backend-hono`
- `rule-tool-backend-nestjs`
- `rule-tool-backend-node`
- `rule-tool-backend-security`
- `rule-tool-backend-workers`

#### rule-caveman (1)

- `rule-tool-caveman`

#### rule-data (8)

- `rule-tool-data`
- `rule-tool-data-duckdb`
- `rule-tool-data-indexed-db`
- `rule-tool-data-mongodb`
- `rule-tool-data-mysql`
- `rule-tool-data-postgresql`
- `rule-tool-data-sql`
- `rule-tool-data-sqlite`

#### rule-devops (7)

- `rule-tool-devops`
- `rule-tool-devops-deploy-preview`
- `rule-tool-devops-docker`
- `rule-tool-devops-gitlab-ci`
- `rule-tool-devops-observability`
- `rule-tool-devops-testing`
- `rule-tool-devops-version`

#### rule-frontend (14)

- `rule-tool-frontend`
- `rule-tool-frontend-angular`
- `rule-tool-frontend-astro`
- `rule-tool-frontend-custom-element`
- `rule-tool-frontend-meta-next`
- `rule-tool-frontend-meta-nuxt`
- `rule-tool-frontend-meta-remix`
- `rule-tool-frontend-react`
- `rule-tool-frontend-solidjs`
- `rule-tool-frontend-svelte`
- `rule-tool-frontend-template-engine`
- `rule-tool-frontend-vanilla-reactive`
- `rule-tool-frontend-vue`
- `rule-tool-frontend-workers`

#### rule-platform (7)

- `rule-tool-platform`
- `rule-tool-platform-agent`
- `rule-tool-platform-auth`
- `rule-tool-platform-desktop`
- `rule-tool-platform-expo`
- `rule-tool-platform-library`
- `rule-tool-platform-web`

#### rule-process (10)

- `rule-tool-process`
- `rule-tool-process-ai-sdlc`
- `rule-tool-process-bmad`
- `rule-tool-process-changelog`
- `rule-tool-process-code-review`
- `rule-tool-process-documentation`
- `rule-tool-process-feature-workflow`
- `rule-tool-process-npm-release`
- `rule-tool-process-simplicity`
- `rule-tool-process-tdd`

> Nota: `rule-process-adr` e `rule-process-handoff` non compaiono qui perché i rispettivi tool sono registrati come core: `rule_tool_process_adr` e `rule_tool_process_handoff` (vedi sezione A).

#### rule-styleguide (15)

- `rule-tool-styleguide`
- `rule-tool-styleguide-a11y`
- `rule-tool-styleguide-baseline`
- `rule-tool-styleguide-css`
- `rule-tool-styleguide-fingerprint`
- `rule-tool-styleguide-html`
- `rule-tool-styleguide-i18n`
- `rule-tool-styleguide-javascript`
- `rule-tool-styleguide-json`
- `rule-tool-styleguide-markdown`
- `rule-tool-styleguide-naming`
- `rule-tool-styleguide-patterns`
- `rule-tool-styleguide-readme`
- `rule-tool-styleguide-typescript`
- `rule-tool-styleguide-validation`

#### rule-toolchain (12)

- `rule-tool-toolchain`
- `rule-tool-toolchain-biome`
- `rule-tool-toolchain-commits`
- `rule-tool-toolchain-eslint`
- `rule-tool-toolchain-husky`
- `rule-tool-toolchain-parcel`
- `rule-tool-toolchain-pnpm`
- `rule-tool-toolchain-project`
- `rule-tool-toolchain-rspack`
- `rule-tool-toolchain-turborepo`
- `rule-tool-toolchain-typescript`
- `rule-tool-toolchain-vite`

#### rule-ui (2)

- `rule-tool-ui`
- `rule-tool-ui-design-system`

---

### C. Risorse `read-*` (194)

Per ogni skill sono esposte **2 risorse** di lettura:

- `read-<skill>-skill-full-content` → contenuto completo (`rule://<skill>`)
- `read-<skill>-skill-summary-first-30-lines` → prime 30 righe (`rule://<skill>/summary`)

Più **4 risorse statiche**:

| Risorsa                                                    | URI               |
| ---------------------------------------------------------- | ----------------- |
| `read-all-rule-skills-index`                                | `rule://skills`    |
| `read-design-system-component-templates`                   | `rule://templates` |
| `read-project-analysis-detected-framework-suggested-tools` | `rule://project`   |
| `read-community-rule-skills-index`                          | `rule://community` |

Totale risorse `read-*`: **194** (94 skill × 2 = 188 risorse full/summary, più le risorse statiche e dedicate sotto).

---

## 2. Comandi slash `/rule-*` (41 generati)

I comandi slash vengono generati da `src/core/agent-commands.js`, che parte dai prompt registrati in `src/prompts/index.js` e dai ruoli attivi di `src/core/review-roles.js` (OPERATIONS = `plan`, `audit`, `review`).

### 2.1 Router (1)

| Comando | Descrizione                                                      |
| ------- | ---------------------------------------------------------------- |
| `/rule`  | Instrada esplicitamente una richiesta attraverso il workflow rule |

### 2.2 Area / workflow (14)

| Comando                | Descrizione                           |
| ---------------------- | ------------------------------------- |
| `/rule-adr`             | Salva un Architecture Decision Record |
| `/rule-area-ai`         | Istrada verso l'area skill AI         |
| `/rule-area-backend`    | Istrada verso l'area skill Backend    |
| `/rule-area-data`       | Istrada verso l'area skill Data       |
| `/rule-area-devops`     | Istrada verso l'area skill DevOps     |
| `/rule-area-frontend`   | Istrada verso l'area skill Frontend   |
| `/rule-area-meta`       | Istrada verso l'area skill Meta       |
| `/rule-area-platform`   | Istrada verso l'area skill Platform   |
| `/rule-area-process`    | Istrada verso l'area skill Process    |
| `/rule-area-skills`     | Istrada verso l'area skill Skills     |
| `/rule-area-styleguide` | Istrada verso l'area skill Styleguide |
| `/rule-area-toolchain`  | Istrada verso l'area skill Toolchain  |
| `/rule-area-ui`         | Istrada verso l'area skill UI         |
| `/rule-flight`          | Esecuzione mirata di un prompt        |

### 2.3 Gestione sessione (5)

| Comando              | Descrizione                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `/rule-handoff`       | Genera un handoff compresso (ADR + git context) per riprendere in una nuova sessione |
| `/rule-handon`        | Verifica l'ultimo handoff in `docs/handoff/`                                         |
| `/rule-init`          | Prepara il progetto: directory recorder centrale + tokensave                         |
| `/rule-process-check` | Check/route del workflow di processo                                                 |
| `/rule-update`        | Update del server rule-mcp                                                     |

### 2.4 Persona role × operazione (21)

Per ogni ruolo attivo, 3 operazioni: `plan`, `audit`, `review`.

**Ruoli attivi (7):** `architect`, `security`, `privacy`, `a11y`, `ai-engineer`, `performance`, `docs-engineer`

| Ruolo         | Plan                      | Audit                      | Review                      |
| ------------- | ------------------------- | -------------------------- | --------------------------- |
| architect     | `/rule-plan-architect`     | `/rule-audit-architect`     | `/rule-review-architect`     |
| security      | `/rule-plan-security`      | `/rule-audit-security`      | `/rule-review-security`      |
| privacy       | `/rule-plan-privacy`       | `/rule-audit-privacy`       | `/rule-review-privacy`       |
| a11y          | `/rule-plan-a11y`          | `/rule-audit-a11y`          | `/rule-review-a11y`          |
| ai-engineer   | `/rule-plan-ai-engineer`   | `/rule-audit-ai-engineer`   | `/rule-review-ai-engineer`   |
| performance   | `/rule-plan-performance`   | `/rule-audit-performance`   | `/rule-review-performance`   |
| docs-engineer | `/rule-plan-docs-engineer` | `/rule-audit-docs-engineer` | `/rule-review-docs-engineer` |

---

### 2.5 Comandi nel repo `.roo/commands/` (35 file)

La cartella `.roo/commands/` contiene gli snapshot `.md` installati (per agent che leggono le macro da lì). Elenco completo:

| File                 | File                        | File                   |
| -------------------- | --------------------------- | ---------------------- |
| `rule-a11y-audit.md`  | `rule-handoff.md`            | `rule-plan-security.md` |
| `rule-adr.md`         | `rule-handon.md`             | `rule-platform.md`      |
| `rule-ai.md`          | `rule-init.md`               | `rule-process.md`       |
| `rule-backend.md`     | `rule-meta.md`               | `rule-pull-request.md`  |
| `rule-caveman.md`     | `rule-new-feature.md`        | `rule-setup-project.md` |
| `rule-check.md`       | `rule-plan-a11y.md`          | `rule-skills.md`        |
| `rule-code-review.md` | `rule-plan-ai-engineer.md`   | `rule-styleguide.md`    |
| `rule-data.md`        | `rule-plan-architect.md`     | `rule-tdd.md`           |
| `rule-devops.md`      | `rule-plan-docs-engineer.md` | `rule-toolchain.md`     |
| `rule-flight.md`      | `rule-plan-performance.md`   | `rule-ui.md`            |
| `rule-frontend.md`    | `rule-plan-privacy.md`       | `rule-update.md`        |
| `rule-mcp.md`  | —                           | `rule-write-tests.md`   |

> La lista generata (`2.1`–`2.4`) e la lista installata (`.roo/commands/`) divergono: quest'ultima è uno snapshot più ampio che include anche aree non coperte dai soli prompt (`rule-check`, `rule-code-review`, `rule-meta`, `rule-new-feature`, `rule-pull-request`, `rule-setup-project`, `rule-skills`, `rule-tdd`, `rule-write-tests`, `rule-mcp`, ecc.).

---

## 3. Riepilogo numerico

| Famiglia                                                                                              | Conteggio |
| ----------------------------------------------------------------------------------------------------- | --------- |
| Tool MCP totali esposti                                                                               | **307**   |
| — Tool core                                                                                           | 19        |
| — Tool per-skill (`rule-tool-<skill>`)                                                                 | 94        |
| — Risorse `read-*`                                                                                    | 194       |
| Comandi slash generati (`/rule-*`)                                                                     | **41**    |
| — Router `/rule`                                                                                       | 1         |
| — Area / workflow (`/rule-area-*`, `/rule-adr`, `/rule-flight`)                                          | 14        |
| — Gestione sessione (`/rule-handoff`, `/rule-handon`, `/rule-init`, `/rule-process-check`, `/rule-update`) | 5         |
| — Persona (`/rule-{plan,audit,review}-<role>`)                                                         | 21        |
| Macro file in `.roo/commands/`                                                                        | 35        |

> **Nota ruoli:** `src/core/review-roles.js` registra 14 ruoli; solo 7 sono attivi e generano comandi slash. Gli altri: `devops-sre`, `qa-testing`, `data-engineer`, `design-system-lead`, `dx-toolchain`, `simplicity-staff-eng`, `oss-compliance`.

---

## 4. Fonti

| File                                | Ruolo                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/tools/router.js`               | Registrazione tool, `listTools()`, `callTool()`, hook pre/post                                                                  |
| `src/tools/skill.js`                | Generazione dinamica tool per-skill + `rule_tool_search`/`rule_tool_check`/`rule_tool_scaffold`                                    |
| `src/tools/*.js`                    | Tool core (apply, plan, plan-docs, stats, usage, a11y, adr, handoff, handon, compress, fix, component, detect, update, gateway) |
| `src/prompts/index.js`              | Registro dei prompt → base per i comandi slash                                                                                  |
| `src/core/agent-commands.js`        | `commandNames()`, `commandDefinition()`, generator dei comandi `/rule-*`                                                         |
| `src/core/review-roles.js`          | Ruoli persona attivi (7 di 14)                                                                                                  |
| `src/core/review-roles-template.js` | `OPERATIONS = ["plan", "audit", "review"]`                                                                                      |
| `src/server.js`                     | Handler ListTools / ListPrompts / ListResources del server MCP                                                                  |
