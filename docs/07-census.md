# Censimento completo pix-galaxy-mcp

> Censimento di **tutti** i tool MCP della famiglia `pix_tool`/`pix-tool` e di **tutti** i comandi slash `/pix-*`.
> Fonte: ispezione diretta del server (`src/tools/`, `src/prompts/`, `src/core/agent-commands.js`, `src/core/review-roles.js`) e del client MCP.
> Ultimo aggiornamento: 2026-09-05

---

## 1. Tool MCP — registrazione `pix_tool` / esposizione `pix-tool`

Il server espone **307 tool** via MCP, in 3 famiglie:

| Famiglia                                | Conteggio |
| --------------------------------------- | --------- |
| Tool core                               | 19        |
| Tool per-skill (generati da `skills/*`) | 94        |
| Risorse `read-*`                        | 194       |

---

### A. Tool core (19)

| #   | Tool (registrazione `pix_tool`) | Esposto come `pix-tool-*`  | Funzione                                                                                      |
| --- | ------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | `pix_tool`                      | `pix-tool`                 | Router: instrada un prompt alla skill corretta e restituisce le sezioni rilevanti             |
| 2   | `pix_tool_update`               | `pix-tool-update`          | Update del server MCP (fast-forward) + hot-reload skill, restart se il codice è cambiato      |
| 3   | `pix_tool_gateway`              | `pix-tool-gateway`         | Orchestratore single-entry: prompt → skill evidence → guardrail → receipt                     |
| 4   | `pix_tool_apply`                | `pix-tool-apply`           | Scrive file su disco dopo la validazione del gateway (richiede il receipt; dryRun di default) |
| 5   | `pix_tool_search`               | `pix-tool-search`          | Ricerca semantica BM25 su tutte le skill pix                                                  |
| 6   | `pix_tool_check`                | `pix-tool-check`           | Guardrail check su una skill; iterare fino a `allPass: true`                                  |
| 7   | `pix_tool_scaffold`             | `pix-tool-scaffold`        | Genera file di scaffolding/config del progetto                                                |
| 8   | `pix_tool_detect`               | `pix-tool-detect`          | Rileva framework, usage TypeScript e build tool da `package.json`                             |
| 9   | `pix_tool_compress`             | `pix-tool-compress`        | Compressione deterministica della prosa (filler, punteggiatura, spellings)                    |
| 10  | `pix_tool_plan`                 | `pix-tool-plan`            | Persona expert (security, privacy, a11y, …) → contract operazione plan/audit/review           |
| 11  | `pix_tool_plan_docs`            | `pix-tool-plan-docs`       | Bookkeeping dei doc audit/review/plan (headers, tabelle, status)                              |
| 12  | `pix_tool_stats`                | `pix-tool-stats`           | Telemetria: call count, cache hit rate, token salvati/stimati, latenza                        |
| 13  | `pix_tool_usage`                | `pix-tool-usage`           | Sidecar d'uso agente: input/output/cache token, cost USD, modello                             |
| 14  | `pix_tool_a11y_report`          | `pix-tool-a11y-report`     | Report WCAG-EM da criterio + risultati di audit                                               |
| 15  | `pix_tool_process_handon`       | `pix-tool-process-handon`  | Legge l'ultimo handoff in `docs/handoff/` e verifica le sue affermazioni                      |
| 16  | `pix_tool_process_adr`          | `pix-tool-process-adr`     | Salva un ADR numerato in `docs/adr/` (template Nygard)                                        |
| 17  | `pix_tool_fix`                  | `pix-tool-fix`             | Lint/auto-fix della struttura file del progetto (barrel, naming, …)                           |
| 18  | `pix_tool_process_handoff`      | `pix-tool-process-handoff` | Genera handoff compresso per la sessione successiva (mode handoff / close-session)            |
| 19  | `pix_tool_component`            | `pix-tool-component`       | Template component/test secondo i principi pix                                                |

---

### B. Tool per-skill (94, generati dinamicamente da `skills/*`)

Ogni skill `pix-*` nella cartella `skills/` viene registrata come un tool `pix-tool-<skill>` con le mode:

```
full | summary | tldr | search | guardrails | check        (+ scaffold solo per pix-styleguide)
```

#### pix-ai (6)

- `pix-tool-ai`
- `pix-tool-ai-agent-architecture`
- `pix-tool-ai-agents`
- `pix-tool-ai-context-engineering`
- `pix-tool-ai-evals`
- `pix-tool-ai-prompting`

#### pix-backend (10)

- `pix-tool-backend`
- `pix-tool-backend-api-design`
- `pix-tool-backend-express`
- `pix-tool-backend-fastify`
- `pix-tool-backend-graphql`
- `pix-tool-backend-hono`
- `pix-tool-backend-nestjs`
- `pix-tool-backend-node`
- `pix-tool-backend-security`
- `pix-tool-backend-workers`

#### pix-caveman (1)

- `pix-tool-caveman`

#### pix-data (8)

- `pix-tool-data`
- `pix-tool-data-duckdb`
- `pix-tool-data-indexed-db`
- `pix-tool-data-mongodb`
- `pix-tool-data-mysql`
- `pix-tool-data-postgresql`
- `pix-tool-data-sql`
- `pix-tool-data-sqlite`

#### pix-devops (7)

- `pix-tool-devops`
- `pix-tool-devops-deploy-preview`
- `pix-tool-devops-docker`
- `pix-tool-devops-gitlab-ci`
- `pix-tool-devops-observability`
- `pix-tool-devops-testing`
- `pix-tool-devops-version`

#### pix-frontend (14)

- `pix-tool-frontend`
- `pix-tool-frontend-angular`
- `pix-tool-frontend-astro`
- `pix-tool-frontend-custom-element`
- `pix-tool-frontend-meta-next`
- `pix-tool-frontend-meta-nuxt`
- `pix-tool-frontend-meta-remix`
- `pix-tool-frontend-react`
- `pix-tool-frontend-solidjs`
- `pix-tool-frontend-svelte`
- `pix-tool-frontend-template-engine`
- `pix-tool-frontend-vanilla-reactive`
- `pix-tool-frontend-vue`
- `pix-tool-frontend-workers`

#### pix-platform (7)

- `pix-tool-platform`
- `pix-tool-platform-agent`
- `pix-tool-platform-auth`
- `pix-tool-platform-desktop`
- `pix-tool-platform-expo`
- `pix-tool-platform-library`
- `pix-tool-platform-web`

#### pix-process (10)

- `pix-tool-process`
- `pix-tool-process-ai-sdlc`
- `pix-tool-process-bmad`
- `pix-tool-process-changelog`
- `pix-tool-process-code-review`
- `pix-tool-process-documentation`
- `pix-tool-process-feature-workflow`
- `pix-tool-process-npm-release`
- `pix-tool-process-simplicity`
- `pix-tool-process-tdd`

> Nota: `pix-process-adr` e `pix-process-handoff` non compaiono qui perché i rispettivi tool sono registrati come core: `pix_tool_process_adr` e `pix_tool_process_handoff` (vedi sezione A).

#### pix-styleguide (15)

- `pix-tool-styleguide`
- `pix-tool-styleguide-a11y`
- `pix-tool-styleguide-baseline`
- `pix-tool-styleguide-css`
- `pix-tool-styleguide-fingerprint`
- `pix-tool-styleguide-html`
- `pix-tool-styleguide-i18n`
- `pix-tool-styleguide-javascript`
- `pix-tool-styleguide-json`
- `pix-tool-styleguide-markdown`
- `pix-tool-styleguide-naming`
- `pix-tool-styleguide-patterns`
- `pix-tool-styleguide-readme`
- `pix-tool-styleguide-typescript`
- `pix-tool-styleguide-validation`

#### pix-toolchain (12)

- `pix-tool-toolchain`
- `pix-tool-toolchain-biome`
- `pix-tool-toolchain-commits`
- `pix-tool-toolchain-eslint`
- `pix-tool-toolchain-husky`
- `pix-tool-toolchain-parcel`
- `pix-tool-toolchain-pnpm`
- `pix-tool-toolchain-project`
- `pix-tool-toolchain-rspack`
- `pix-tool-toolchain-turborepo`
- `pix-tool-toolchain-typescript`
- `pix-tool-toolchain-vite`

#### pix-ui (2)

- `pix-tool-ui`
- `pix-tool-ui-design-system`

---

### C. Risorse `read-*` (194)

Per ogni skill sono esposte **2 risorse** di lettura:

- `read-<skill>-skill-full-content` → contenuto completo (`pix://<skill>`)
- `read-<skill>-skill-summary-first-30-lines` → prime 30 righe (`pix://<skill>/summary`)

Più **4 risorse statiche**:

| Risorsa                                                    | URI               |
| ---------------------------------------------------------- | ----------------- |
| `read-all-pix-skills-index`                                | `pix://skills`    |
| `read-design-system-component-templates`                   | `pix://templates` |
| `read-project-analysis-detected-framework-suggested-tools` | `pix://project`   |
| `read-community-pix-skills-index`                          | `pix://community` |

Totale risorse `read-*`: **194** (94 skill × 2 = 188 risorse full/summary, più le risorse statiche e dedicate sotto).

---

## 2. Comandi slash `/pix-*` (41 generati)

I comandi slash vengono generati da `src/core/agent-commands.js`, che parte dai prompt registrati in `src/prompts/index.js` e dai ruoli attivi di `src/core/review-roles.js` (OPERATIONS = `plan`, `audit`, `review`).

### 2.1 Router (1)

| Comando | Descrizione                                                      |
| ------- | ---------------------------------------------------------------- |
| `/pix`  | Instrada esplicitamente una richiesta attraverso il workflow pix |

### 2.2 Area / workflow (14)

| Comando                | Descrizione                           |
| ---------------------- | ------------------------------------- |
| `/pix-adr`             | Salva un Architecture Decision Record |
| `/pix-area-ai`         | Istrada verso l'area skill AI         |
| `/pix-area-backend`    | Istrada verso l'area skill Backend    |
| `/pix-area-data`       | Istrada verso l'area skill Data       |
| `/pix-area-devops`     | Istrada verso l'area skill DevOps     |
| `/pix-area-frontend`   | Istrada verso l'area skill Frontend   |
| `/pix-area-meta`       | Istrada verso l'area skill Meta       |
| `/pix-area-platform`   | Istrada verso l'area skill Platform   |
| `/pix-area-process`    | Istrada verso l'area skill Process    |
| `/pix-area-skills`     | Istrada verso l'area skill Skills     |
| `/pix-area-styleguide` | Istrada verso l'area skill Styleguide |
| `/pix-area-toolchain`  | Istrada verso l'area skill Toolchain  |
| `/pix-area-ui`         | Istrada verso l'area skill UI         |
| `/pix-flight`          | Esecuzione mirata di un prompt        |

### 2.3 Gestione sessione (5)

| Comando              | Descrizione                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `/pix-handoff`       | Genera un handoff compresso (ADR + git context) per riprendere in una nuova sessione |
| `/pix-handon`        | Verifica l'ultimo handoff in `docs/handoff/`                                         |
| `/pix-init`          | Prepara il progetto: directory recorder centrale + tokensave                         |
| `/pix-process-check` | Check/route del workflow di processo                                                 |
| `/pix-update`        | Update del server pix-galaxy-mcp                                                     |

### 2.4 Persona role × operazione (21)

Per ogni ruolo attivo, 3 operazioni: `plan`, `audit`, `review`.

**Ruoli attivi (7):** `architect`, `security`, `privacy`, `a11y`, `ai-engineer`, `performance`, `docs-engineer`

| Ruolo         | Plan                      | Audit                      | Review                      |
| ------------- | ------------------------- | -------------------------- | --------------------------- |
| architect     | `/pix-plan-architect`     | `/pix-audit-architect`     | `/pix-review-architect`     |
| security      | `/pix-plan-security`      | `/pix-audit-security`      | `/pix-review-security`      |
| privacy       | `/pix-plan-privacy`       | `/pix-audit-privacy`       | `/pix-review-privacy`       |
| a11y          | `/pix-plan-a11y`          | `/pix-audit-a11y`          | `/pix-review-a11y`          |
| ai-engineer   | `/pix-plan-ai-engineer`   | `/pix-audit-ai-engineer`   | `/pix-review-ai-engineer`   |
| performance   | `/pix-plan-performance`   | `/pix-audit-performance`   | `/pix-review-performance`   |
| docs-engineer | `/pix-plan-docs-engineer` | `/pix-audit-docs-engineer` | `/pix-review-docs-engineer` |

---

### 2.5 Comandi nel repo `.roo/commands/` (35 file)

La cartella `.roo/commands/` contiene gli snapshot `.md` installati (per agent che leggono le macro da lì). Elenco completo:

| File                 | File                        | File                   |
| -------------------- | --------------------------- | ---------------------- |
| `pix-a11y-audit.md`  | `pix-handoff.md`            | `pix-plan-security.md` |
| `pix-adr.md`         | `pix-handon.md`             | `pix-platform.md`      |
| `pix-ai.md`          | `pix-init.md`               | `pix-process.md`       |
| `pix-backend.md`     | `pix-meta.md`               | `pix-pull-request.md`  |
| `pix-caveman.md`     | `pix-new-feature.md`        | `pix-setup-project.md` |
| `pix-check.md`       | `pix-plan-a11y.md`          | `pix-skills.md`        |
| `pix-code-review.md` | `pix-plan-ai-engineer.md`   | `pix-styleguide.md`    |
| `pix-data.md`        | `pix-plan-architect.md`     | `pix-tdd.md`           |
| `pix-devops.md`      | `pix-plan-docs-engineer.md` | `pix-toolchain.md`     |
| `pix-flight.md`      | `pix-plan-performance.md`   | `pix-ui.md`            |
| `pix-frontend.md`    | `pix-plan-privacy.md`       | `pix-update.md`        |
| `pix-galaxy-mcp.md`  | —                           | `pix-write-tests.md`   |

> La lista generata (`2.1`–`2.4`) e la lista installata (`.roo/commands/`) divergono: quest'ultima è uno snapshot più ampio che include anche aree non coperte dai soli prompt (`pix-check`, `pix-code-review`, `pix-meta`, `pix-new-feature`, `pix-pull-request`, `pix-setup-project`, `pix-skills`, `pix-tdd`, `pix-write-tests`, `pix-galaxy-mcp`, ecc.).

---

## 3. Riepilogo numerico

| Famiglia                                                                                              | Conteggio |
| ----------------------------------------------------------------------------------------------------- | --------- |
| Tool MCP totali esposti                                                                               | **307**   |
| — Tool core                                                                                           | 19        |
| — Tool per-skill (`pix-tool-<skill>`)                                                                 | 94        |
| — Risorse `read-*`                                                                                    | 194       |
| Comandi slash generati (`/pix-*`)                                                                     | **41**    |
| — Router `/pix`                                                                                       | 1         |
| — Area / workflow (`/pix-area-*`, `/pix-adr`, `/pix-flight`)                                          | 14        |
| — Gestione sessione (`/pix-handoff`, `/pix-handon`, `/pix-init`, `/pix-process-check`, `/pix-update`) | 5         |
| — Persona (`/pix-{plan,audit,review}-<role>`)                                                         | 21        |
| Macro file in `.roo/commands/`                                                                        | 35        |

> **Nota ruoli:** `src/core/review-roles.js` registra 14 ruoli; solo 7 sono attivi e generano comandi slash. Gli altri: `devops-sre`, `qa-testing`, `data-engineer`, `design-system-lead`, `dx-toolchain`, `simplicity-staff-eng`, `oss-compliance`.

---

## 4. Fonti

| File                                | Ruolo                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/tools/router.js`               | Registrazione tool, `listTools()`, `callTool()`, hook pre/post                                                                  |
| `src/tools/skill.js`                | Generazione dinamica tool per-skill + `pix_tool_search`/`pix_tool_check`/`pix_tool_scaffold`                                    |
| `src/tools/*.js`                    | Tool core (apply, plan, plan-docs, stats, usage, a11y, adr, handoff, handon, compress, fix, component, detect, update, gateway) |
| `src/prompts/index.js`              | Registro dei prompt → base per i comandi slash                                                                                  |
| `src/core/agent-commands.js`        | `commandNames()`, `commandDefinition()`, generator dei comandi `/pix-*`                                                         |
| `src/core/review-roles.js`          | Ruoli persona attivi (7 di 14)                                                                                                  |
| `src/core/review-roles-template.js` | `OPERATIONS = ["plan", "audit", "review"]`                                                                                      |
| `src/server.js`                     | Handler ListTools / ListPrompts / ListResources del server MCP                                                                  |
