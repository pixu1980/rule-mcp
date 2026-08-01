# Execution Plan — Prompt MCP preconfezionati (workflow + aree)

Obiettivo: estendere il registro prompt del server (`src/prompts/index.js`) da 5 a **26 prompt**
che velocizzano il lavoro dei dev, con schema argomenti rigido, stileguide invocate via tool,
baseline TDD/a11y sempre coinvolte (o richiesta esplicita all'utente), e chiusura con
**proposta di commit message con scope obbligatorio**.

Decisioni intervista (2025-08-01):
1. Prompt one-shot workflow **e** per-fase (partire dai one-shot ad alto valore) — C
2. Copertura **tutte** le 16 aree (da testare)
3. **Un prompt per area** (argomento `framework` dove serve, non per-framework)
4. **Schema argomenti rigido**
5. Stileguide invocate via tool; **TDD/a11y sempre coinvolti o chiedere all'utente**
6. Il workflow termina **proponendo il commit message con scope**
7. Top 5: `rule-setup-project`, `rule-new-feature`, `rule-pull-request` (aggiorna anche ADR), `rule-write-tests`, `rule-handoff`
8. Delivery: piano → TDD → registro prompt → completions → validazione

---

## Phase 1 — Test fallenti (TDD)

- [x] 1. Nuovo `test/prompts.test.mjs`: struttura del registro (nomi unici kebab-case, schema argomenti rigido, getPrompt non-null per ogni prompt) + copertura attesa (5 workflow + 16 aree + 5 esistenti) + regole di contenuto (commit+scope, TDD/a11y/test) → RED oggi (5 prompt, niente regole)

## Phase 2 — Registro prompt (`src/prompts/index.js`)

- [x] 2. **5 workflow one-shot** (orchestrano i tool):
  - `rule-setup-project` (detect → scaffold → toolchain → architect context)
  - `rule-new-feature` (spec → feature_workflow → gateway → implement → check → test → commit scope)
  - `rule-pull-request` (review + a11y + security + **ADR update** + commit scope + descrizione PR)
  - `rule-write-tests` (TDD + a11y tests + devops_testing)
  - `rule-handoff` (process_handoff + adr + contesto compresso)
- [x] 3. **16 prompt per area**: `rule-area-{...}` — **con tutti i 97 tool rinominati `rule_tool_*`** (decisione intervista) per evitare collisioni coi prompt — ognuno: route alla skill dell'area, baseline TDD/a11y o domanda all'utente, commit scope finale
- [x] 4. **Aggiornare i 5 esistenti** (`rule-code-review`, `rule-generate-component`, `rule-a11y-test`, `rule-a11y-review`, `rule-architect-scaffold`) per rispettare le stesse regole (commit scope + baseline)

## Phase 3 — Completions (`src/server.js`)

- [x] 5. Argument completion per i nuovi prompt (framework, area, testType, mode, tier…) — pattern già esistente

## Phase 4 — Docs

- [x] 6. README: sezione prompt aggiornata con i 26 prompt
- [x] 7. CHANGELOG

## Phase 5 — Validazione

- [x] 8. `node test/prompts.test.mjs` + `pnpm test:all` + smoke
- [x] 9. Aggiungere `test/prompts.test.mjs` a `test:all` e `ci` in package.json
- [x] 10. Verifica naming bare (`/rule-setup-project`, `/rule-area-frontend`…) — nessuna collisione coi tool
