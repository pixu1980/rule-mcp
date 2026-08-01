# Architect Consolidation — Phase 2: Converge Spec + Interview

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the two divergent wizard front-ends to a single canonical spec (`wizard-spec.json`) and a single `interview.js` — served by both the standalone server and the MCP-served context-server — keeping the domain-sketch + analysis-depth onboarding (from architect-web) **and** the rich project-type/tech/stack card taxonomy with PROJECT_TYPE filtering (from context-server). Delete `placeholders.json` and context-server's `interview.js`.

**Architecture:** Evidence established that `placeholders.json` (context-server, 111 keys) is a strict SUBSET of `wizard-spec.json` (architect-web + CLI, 139 keys, 0 unique keys in placeholders) — the extras are the domain-sketch step + `ANALYSIS_DEPTH`. And architect-web's `/api/placeholders` is simply `{ sections: wizardSpec.steps, …flattened optionGroups }`, so `wizard-spec.json`'s `steps` already ARE the sections shape the UI consumes. The two front-ends diverged in opposite directions: architect-web has the newer SPEC but plainer `skill-card`s; context-server has the STALE spec but richer `project-type-card`/`tech-card`/`stack-card`s with `filterByProjectType`. This phase makes `wizard-spec.json` canonical, upgrades the one surviving `interview.js` (architect-web's, which already has the Phase-0 focus fix + consumes the canonical spec) with context-server's card taxonomy, and repoints context-server at both. `detectProjectValues` is byte-identical in both servers → extract once.

**Tech Stack:** Node.js ESM, zero-dep HTTP servers, rule-frontend-vanilla-reactive front-end (custom element + `adoptedStyleSheets`), `node:test`, Playwright for UI.

## Global Constraints

- **This phase intentionally changes the MCP wizard's UX** (context-server gains the domain-sketch + analysis-depth onboarding and switches to the canonical interview) — that is the approved goal, not a regression.
- Single source of truth after this phase: exactly ONE `interview.js`, ONE wizard spec (`wizard-spec.json`), NO `placeholders.json`.
- Card metadata in `wizard-spec.json` uses key `pixGalaxySkill` (NOT `pixAISkill`) and filters via an option's `projectTypes` array. There is no unified `stacks` group — frontend options live in `frontendFrameworks`/`metaFrameworks`/`backendFrameworks`.
- Front-end stays framework-free; zero CSS classes, zero inline styles, semantic HTML, external CSS via `adoptedStyleSheets`. Validate new/changed UI with `pix_check`.
- Preserve the existing focus-retention render guard (structural signature) from Phase 0.
- Zero new runtime dependencies. Commit messages end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Branch `feat/architect-context-pack`.
- Carry-forward from Phase 1 (do NOT reintroduce): the canonical `templates.json` and unified `generator.mjs` are already in place; the `DEVOPS_*`/`PROCESS_*` placeholder-schema gap and doc-drift (F1/F2/F4) are OUT OF SCOPE here.

## Canonical asset location decision

Canonical UI assets (`interview.js`, `interview.css`, `index.html`) live in `skills/rule-architect-web/`. `context-server` serves the SAME files via symlinks (`skills/rule-architect/assets/context-server/interview.js` → `../../../rule-architect-web/interview.js`, and same for css/index.html), matching the Phase-1 consolidation pattern and the project's canonical+symlink convention. Copy-fallback if the OS rejects symlinks.

---

### Task 1: Extract shared `detectProjectValues`

**Files:**
- Create: `skills/rule-architect/detect.mjs`
- Modify: `skills/rule-architect-web/server.mjs`, `skills/rule-architect/assets/context-server.mjs` (import it; delete the inline copies)
- Test: `test/architect-detect.test.mjs`

**Interfaces:**
- Produces: `export function detectProjectValues(projectDir) → Record<string,string>` — identical behavior to today's byte-identical inline copies.

- [ ] **Step 1** Write `test/architect-detect.test.mjs` (node:test): import `detectProjectValues` from `detect.mjs`; call with a temp dir containing a minimal `package.json` (`{"name":"acme"}`); assert `PROJECT_NAME === "acme"`. Run → fails (module absent).
- [ ] **Step 2** Create `skills/rule-architect/detect.mjs` by moving the inline `detectProjectValues` verbatim (it is byte-identical in both servers); export it. Do NOT de-overfit yet (TTRPG hardcoding is deferred to the C/rename phase).
- [ ] **Step 3** In both servers, replace the inline function with `import { detectProjectValues } from "…/detect.mjs";` (architect-web: `../rule-architect/detect.mjs`; context-server: `../detect.mjs`). Run the new test + both parity tests → pass. `node --check` both servers.
- [ ] **Step 4** Commit `refactor(architect): extract shared detectProjectValues into detect.mjs`.

---

### Task 2: Port the rich card taxonomy into the surviving `interview.js`

**Files:**
- Modify: `skills/rule-architect-web/interview.js` (`renderChoiceCards` + `renderField` select branch)
- Test: `test/architect-ui.test.mjs` (extend; runs against context-server after Task 3, but the card logic can be exercised against architect-web on a temp port now)

**Interfaces:**
- Consumes: option groups from `wizard-spec.json` via the flattened `ph[field.options]` mechanism already in `interview.js:290`. Each option may carry `build`, `pixGalaxySkill`, and a `projectTypes` array (filter).
- Produces: `renderChoiceCards(field, key, val, list, cfg)` that, given a `cfg`, renders `data-part="project-type-card"` / `"tech-card"` / `"stack-card"` and filters `list` by the current `PROJECT_TYPE` value.

- [ ] **Step 1** Add a `cardConfigs` map keyed by `field.options` group name (from `wizard-spec.json`), porting context-server's taxonomy but mapped to wizard-spec's group names and metadata key:

```js
// data-part styling + PROJECT_TYPE filtering per option group
const CARD_CONFIGS = {
  projectTypes:      { cardPart: "project-type-card", gridPart: "type-grid",  namePart: "type-name",  descPart: "type-desc",  buildPart: "type-build",  showBuild: true,  filterByProjectType: false },
  frontendFrameworks:{ cardPart: "tech-card",         gridPart: "tech-grid",  namePart: "stack-name", descPart: "tech-desc",  buildPart: "stack-build", showBuild: false, filterByProjectType: true },
  metaFrameworks:    { cardPart: "tech-card",         gridPart: "tech-grid",  namePart: "stack-name", descPart: "tech-desc",  buildPart: "stack-build", showBuild: false, filterByProjectType: true },
  backendFrameworks: { cardPart: "tech-card",         gridPart: "tech-grid",  namePart: "stack-name", descPart: "tech-desc",  buildPart: "stack-build", showBuild: false, filterByProjectType: true },
  databaseEngines:   { cardPart: "tech-card",         gridPart: "tech-grid",  namePart: "stack-name", descPart: "tech-desc",  buildPart: "stack-build", showBuild: false, filterByProjectType: true },
  apiStyles:         { cardPart: "tech-card",         gridPart: "tech-grid",  namePart: "stack-name", descPart: "tech-desc",  buildPart: "stack-build", showBuild: false, filterByProjectType: true },
  designSystems:     { cardPart: "tech-card",         gridPart: "tech-grid",  namePart: "stack-name", descPart: "tech-desc",  buildPart: "stack-build", showBuild: false, filterByProjectType: true },
};
```

- [ ] **Step 2** In `renderField`'s `select` branch, look up `CARD_CONFIGS[field.options]`; if present pass it as `cfg` to `renderChoiceCards`, else `{}` (generic `skill-card` fallback, unchanged).
- [ ] **Step 3** In `renderChoiceCards`, when `cfg.filterByProjectType`, filter `list` by the current `store.state.values.PROJECT_TYPE`: keep an option if it has no `projectTypes`, or its `projectTypes` array includes the selected type (mirror context-server's filter; `"other"`/empty selection shows all). Read the skill tag from `o.pixGalaxySkill`. Emit `data-part` per `cfg`. Keep the structural-signature focus guard intact (PROJECT_TYPE is a `select` → already in the signature, so a type change rebuilds the filtered cards — verified in Phase 0).
- [ ] **Step 4** Extend `test/architect-ui.test.mjs`: on the project-type step, selecting `webapp` vs `backend` changes the visible `tech-card` set (e.g. Postgres appears for backend, not webapp) — the exact assertion Phase 0 verified manually. Run against a temp architect-web server. Verify focus-retention test still passes.
- [ ] **Step 5** Run `pix_check` on the changed `interview.js` (skill `rule-frontend-vanilla-reactive`); confirm no NEW styling violations vs the file's baseline.
- [ ] **Step 6** Commit `feat(architect-web): rich project-type/tech card taxonomy with PROJECT_TYPE filtering`.

---

### Task 3: Repoint context-server at the canonical spec + interview; delete the stale artifacts

**Files:**
- Modify: `skills/rule-architect/assets/context-server.mjs` (`/api/placeholders`, `/api/init-values`, template/spec load)
- Delete: `skills/rule-architect/assets/context-server/placeholders.json`, `skills/rule-architect/assets/context-server/interview.js`
- Create (symlinks): `assets/context-server/interview.js`, `interview.css`, `index.html` → the canonical `rule-architect-web/` files
- Test: `test/context-server-spec-canonical.test.mjs`

**Interfaces:**
- Consumes: `wizard-spec.json` (`{ steps, optionGroups, phases, prefillMap }`). `/api/placeholders` must return the SAME shape architect-web returns: `{ sections: wizardSpec.steps, phases: wizardSpec.phases, …flattened optionGroups }` so the shared `interview.js` renders identically on both servers.

- [ ] **Step 1** Write `test/context-server-spec-canonical.test.mjs`: assert `assets/context-server/placeholders.json` does NOT exist; assert `assets/context-server/interview.js` is a symlink resolving to `rule-architect-web/interview.js`; assert the canonical `wizard-spec.json` has a `step-1-domain-sketch` step (the onboarding context-server previously lacked). Run → fails.
- [ ] **Step 2** Change context-server's `loadData()`/spec load to read the canonical `wizard-spec.json` (`join(__dirname, "..", "wizard-spec.json")`), mirroring architect-web. Rewrite `/api/placeholders` to return `{ sections: wizardSpec.steps, phases: wizardSpec.phases, …flattened optionGroups }` (copy architect-web's handler). Rewrite `/api/init-values` to use the shared `detectProjectValues`.
- [ ] **Step 3** `git rm` the stale `placeholders.json` and the old `context-server/interview.js`. Create symlinks for `interview.js`, `interview.css`, `index.html` → `../../../rule-architect-web/<file>` (copy-fallback if symlink creation fails). Confirm nothing else reads `placeholders.json` (grep; note `test/docs-architect.test.mjs:99` reads it for the placeholder-coverage assertion — update that read to the canonical spec's field set, coordinating with carry-forward F2/F4, or leave it: it is currently masked by the pre-existing docs-count abort — document which you did).
- [ ] **Step 4** Run the consistency test + the full `test/architect-ui.test.mjs` against context-server on :19000 (focus, repeatable, generate, and the new card-filter test must pass; the two stale step-count tests are known-failing and will need their counts updated — update them to the canonical wizard's counts as part of this task since the step set changed).
- [ ] **Step 5** `node --check` context-server.mjs; `pix_check` not needed (server, not UI).
- [ ] **Step 6** Commit `refactor(context-server): serve canonical wizard-spec + shared interview, drop placeholders.json`.

---

### Task 4: Drift guard + wire tests

**Files:**
- Create: `test/architect-single-source.test.mjs`
- Modify: `package.json` (`test:all` + `ci`)

- [ ] **Step 1** Write `test/architect-single-source.test.mjs`: assert exactly one real `interview.js` exists under `skills/` (the canonical; others are symlinks to it); assert no `placeholders.json` under `assets/context-server/`; assert both servers import `detectProjectValues` from `detect.mjs` (source grep). Run → pass.
- [ ] **Step 2** Append the new suites (`architect-detect`, `context-server-spec-canonical`, `architect-single-source`) to `test:all` and `ci` (matching Phase 1's wiring style). Run them together → pass.
- [ ] **Step 3** Commit `test(architect): single-source drift guards for spec + interview`.

---

## Self-Review

- **Spec coverage:** S1b (unify spec — canonical `wizard-spec.json`, both servers read it, drift check) → Tasks 3, 4. S1c (unify interview — one file, symlinked) → Tasks 2, 3, 4. `detectProjectValues` unification → Task 1. Card-taxonomy preservation (the "merge best of both" ruling) → Task 2.
- **Placeholder scan:** concrete files/edits/tests throughout; the `CARD_CONFIGS` map is real code; deletions are explicit.
- **Type consistency:** `detectProjectValues(projectDir)`; `/api/placeholders` shape `{ sections, phases, …optionGroups }` used identically by both servers; `renderChoiceCards(field, key, val, list, cfg)` signature preserved.
- **Known coupling:** Task 3 Step 3 must decide how to handle `test/docs-architect.test.mjs`'s `placeholders.json` read (carry-forward F2/F4) — documented as an explicit choice, not left implicit.
- **Risk:** biggest is the context-server UX change (approved) and the interview merge; the extended `architect-ui.test.mjs` (card filtering + focus) is the safety net. Stale step-count tests get their counts corrected here since the step set legitimately changes.

## Roadmap — remaining after this phase

P4 rename keys→placeholders + list composition (27%→≥95% fill; also closes F4 `DEVOPS_*`/`PROCESS_*`) · P5 templates conditional + lean · P6 cross-harness `AGENTS.md` entry-points · P7 UI Summary•Files panel · (fast follow) F1 doc-drift cleanup.
