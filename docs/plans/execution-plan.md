# Execution plan — riorganizzazione `scripts/`, `src/`, `test/` e copertura ≥95%

> Stato: avviato. Analisi completata (2026-09-06). Baseline copertura misurata con
> `node --experimental-test-coverage` (Node 24, line+branch).

## Analisi (fatti)

### Copertura test — risposta: NO, oggi non è ≥95% (nemmeno sui branch)

- **Grafo (tokensave)**: 918 funzioni, solo 237 (26%) raggiunte da test visibili nel call graph.
  È un *lower bound*: molti test lanciano subprocessi (CLI, installer, daemon) invisibili al grafo.
- **Node nativo (line+branch) sul batch unit `test:foundations`**: `71.57%` righe / `80.91%` branch / `72.66%` funzioni
  (misurato sui file caricati: src + scripts + bin; i file test sono esclusi dal report).
- **Buchi principali (line% / branch%)**:
  - `src/tools/gateway.js` 87.9/43.3, `src/tools/adr.js` 43.1/76.7, `src/tools/fix.js` 21.6, `src/tools/handoff.js` 15.3,
  - `src/core/file-tree.js` 26.2, `src/core/block-spacing.js` 15.3, `src/core/agent-integrations.js` 38.5, `src/core/agent-commands.js` 61.5,
  - `src/cli/commands.js` 23.2, `src/cli/completions.js` 8.7, `src/cli/doctor.js` 19.9, `src/cli/daemon.js` 38.5, `src/cli/skills-install.js` 25.9, `src/cli/tui.js` 33.2, `src/cli/agent-installers.js` 59.6,
  - `src/tools/a11y.js` 38.4, `src/tools/apply.js` 38.2, `src/tools/plan.js` 50.5.
- Completamento: CLI/installer/transport sono coperti *black-box* via subprocess; la copertura reale è più alta di 71.57% ma
  **ancora sotto 95% sui branch**. Serve strumentazione c8 (per i subprocess) + test mirati.

### Dimensione file — regola 100 righe (+50 tolleranza = 150)

File `src/` oltre 150 righe (i 24 peggiori, totale 32993 righe / 108 file):

| righe | file |
| ----: | ---- |
| 1089 | src/cli/agent-installers.js |
|  971 | src/core/guardrails/framework.js |
|  850 | src/core/guardrails/quality.js |
|  831 | src/tools/router.js |
|  807 | src/cli/commands.js |
|  792 | src/tools/ai.js |
|  789 | src/core/bm25.js |
|  779 | src/core/wcag-data.js |
|  740 | src/core/docs-numbering.js |
|  737 | src/tools/handon.js |
|  720 | src/core/tool-cache.js |
|  686 | src/core/file-tree.js |
|  660 | src/tools/handoff.js |
|  655 | src/core/guardrails/shared.js |
|  629 | src/prompts/index.js |
|  583 | src/core/agent-transcripts.js |
|  548 | src/cli/daemon-platform.js |
|  530 | src/tools/gateway.js |
|  525 | src/tools/adr.js |
|  501 | src/cli/program.js |
|  499 | src/cli/daemon.js |
|  494 | src/core/fingerprint.js |
|  483 | src/core/self-update.js |
|  478 | src/cli/doctor.js |

`test/`: 147 file flat (solo `fixtures/`), totale 18540 righe; `scripts/`: 23 file, totale 6145 righe
(installer shell: install.sh 1098, uninstall.sh 982, install.ps1 726 — gli installer restano esenti dalla regola linee,
si splittano in moduli `source` condivisi solo dove sicuro).

### Struttura attuale

- `src/`: già tematico (cli, core, core/guardrails, prompts, resources, roles, tools, transport, utils) ma con file-torero.
- `test/`: piatta → va rinominata in `tests/` e raggruppata per dominio.
- `scripts/`: 23 file, no sottocartelle.

## Skill rule per il code splitting — raccomandazione

Il requisito "file ≤100 righe (+50 tolleranza)" **non è imposto da nessuna skill rule per JS server**.
Skill candidate e ruolo:

1. **rule-frontend-custom-element → Code-splitting rules** (la più adatta): regola di organizzazione
   del sorgente in moduli per responsabilità (`ComponentName.js`, `.consts.js`, `.utils.js`, `.events.js`, …),
   anti-pattern espliciti (niente helper inline nel file principale). È il pattern da adottare per ogni split.
2. **rule-styleguide-css** (modello di soglia): "each file should stay roughly between 50 and 100 lines… split into sub files".
3. **rule-platform-web → Code Splitting** (runtime/bundle: route/component/vendor chunk) — non applicabile a questo server (no bundler).

> Decisione: adottare il pattern module-per-concern di rule-frontend-custom-element + regola di soglia 150 righe
> codificata come guardrail/test di repo (stile `tool-surface-budget`), con riferimento alla skill nel CLAUDE.md.

## Fasi

### Fase 0 — Baseline di copertura misurabile
- [x] Misurare coverage line+branch con Node nativo (fatto: 71.57/80.91/72.66 su foundations).
- [x] Script npm `test:coverage` (wrapper sul batch unit con `--experimental-test-coverage`) — `scripts/test-coverage.mjs`.
- [x] Baseline registrata nel piano e in ADR 060 (no nuovo doc numerato, la numerazione docs è vincolata dal census).

### Fase 1 — `test/` → `tests/` + sottocartelle tematiche
- [x] `git mv test tests`
- [x] Sottocartelle per dominio:
  - `tests/cli/` — install*, cli-*, doctor*, daemon*, vscode*, pi-install, skills-install, uninstall*, self-update*
  - `tests/core/` — guardrails*, cache*, flight*, telemetry*, token-*, fingerprint, bm25, ascii-box, block-spacing, caveman*, enforcement, lifecycle, detector, directive, cifra…
  - `tests/tools/` — adr, ai, gateway, handon, handoff, fix, a11y, skill, plan, apply, router, a11y
  - `tests/transport/` — sse*, http, https, stdio-guard, auth-rate-limit, docker-mode, daemon-wrapper
  - `tests/roles/` — persona-catalog, review-roles*, roles-cli
  - `tests/prompts/` — prompts, reminder-diet, prompt-*
  - `tests/docs/` — docs-*, census-generated, changelog, skills-docs, repository-contract, adr-*
  - `tests/fixtures/` (già esistente) + aggegatori in radice (`smoke.mjs`, `routing-corpus.mjs`, …)
- [x] Aggiornare `package.json`, `.github/workflows/ci.yml`, `docs/*`, `README.md` (mapping token 142 file).
- [x] Fix path relativi post-move (`../` → `../../`, fixtures → `../fixtures`, `new URL("..")` → `new URL("../..")`); fix `auto-adr-flag` (doc rinominata 06→05).
- [x] `pnpm test:foundations` 298/299 (1 pre-esistente) + `pnpm test:installer` 0 fail + lint 0 errori.
- [x] **porting-parity rimosso completamente**: test, `rule-porting-baseline.json`, ADR 053/054 + indice, blocco ROADMAP (piano porting) in docs/01, refs README.

### Fase 2 — Code splitting `src/` (regola 100/150)
- [x] Split dei file-torero per responsabilità — completati e verificati (test verdi + self-guardrails + lint):
  - [x] `src/cli/agent-installers.js` (1089 → barrel 73) → `installers/` (9 moduli, livello 3)
  - [x] `src/core/guardrails/framework.js` (971 → barrel 1) → `guardrails/framework/` (10 moduli, livello 3)
  - [x] `src/core/wcag-data.js` (779 → barrel 1) → `wcag-data/` (meta + 13 per-guideline, livello 4)
  - [x] fix corollari: esenzioni CATALOGS per cartelle in self-guardrails, refs doc rinumerate (css-flex-first, auto-adr-flag)
- [x] `src/core/guardrails/quality.js` (850 → barrel 2) → `guardrails/quality/` (8 moduli)
- [x] `src/core/bm25.js` (789 → barrel 2) → `bm25/` (11 moduli: terms, stopwords×3+union, extract, build, cache, score, state)
- [x] `src/tools/router.js` (831 → barrel 2) → `router/` (7 moduli: helpers, entry, compute, hooks, surface, call, skills) — 86/86 test surface
- [x] `src/cli/commands.js` (807 → barrel) → `commands/` (8 moduli: shared, help, daemon, lifecycle, tools, health, targets)
- [ ] Prossimi candidati (per valore): `ai.js` 792,
  `ai.js` 792, `docs-numbering.js` 740, `handon.js` 737, `tool-cache.js` 720, `file-tree.js` 686,
  `handoff.js` 660, `guardrails/shared.js` 655, `prompts/index.js` 629, `agent-transcripts.js` 583,
  `daemon-platform.js` 548, `gateway.js` 530, `adr.js` 525, `daemon.js` 499, `fingerprint.js` 494…
- [ ] Ogni split: estrazione di moduli ≥150 righe con re-export dall'entry (API pubbliche invariate) +
      test di superficie (`cli-commander-surface`, `tool-surface-budget`) verdi.
- [ ] Gradino successivo: tutti i file >200, poi >150.

### Fase 3 — Riorganizzazione tematica `src/` e `scripts/`
- [ ] `src/core/` → sub-cartelle: `telemetry/` (telemetry*, flight*), `cache/` (cache-*, tool-cache), `agents/` (agent-*), `text/` (bm25, ascii-box, fingerprint, block-spacing, directive, en-english, caveman).
- [ ] `src/tools/` → resta per modulo (già tematico).
- [ ] `scripts/` → `scripts/census/`, `scripts/installer/` (estrazione helper shell comuni: agents detection, TUI, paths) con split di install.sh/uninstall.sh solo dove sicuro.
- [ ] Verifica: `pnpm lint`, `pnpm test:all`, census invariato.

### Fase 4 — Copertura ≥95% branch
- [ ] Strumentazione cross-process completa: aggiungere `c8` (o `NODE_V8_COVERAGE` + report) così subprocess CLI/installer contano.
- [ ] Test mirati sulle aree sotto soglia: gateway (branch 43%), adr (43%), fix (21%), handoff (15%), file-tree (26%), block-spacing (15%), tui (33%), daemon (38%), doctor (20%), commands (23%), completions (8.7%).
- [ ] Gate CI: `pnpm test:coverage` con soglia branch 95% (fail sotto soglia).
- [ ] Risolvere o documentare i 2 test falliti pre-esistenti (untrusted-fence, home-recording-leak race).

### Fase 5 — Regola di guardia dimensione file
- [ ] Test/guardrail "file ≤150 righe" in stile `tool-surface-budget` (es. `test/…/file-size-budget.test.mjs`).
- [ ] Riferimento a rule-frontend-custom-element (code-splitting) nel CLAUDE.md e nella skill di riferimento.