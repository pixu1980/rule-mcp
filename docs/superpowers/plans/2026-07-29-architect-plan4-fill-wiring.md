# Architect Consolidation — Phase 4: Fill Wiring (rename + list composition)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise generated `.context/` fill from **27% (48/177)** to **≥95% of meaningful placeholders** by wiring the interview answers to the template placeholders — 5 direct key renames, a list-composition layer that expands repeatable groups into numbered placeholders, a few derived singles, and an explicit defer/exclude set for domain-overfit and junk keys.

**Architecture:** After Phases 1–2 there is one canonical `generator.mjs`, one `templates.json`, one `wizard-spec.json`. The fill gap is almost entirely a naming/shape mismatch: the wizard already COLLECTS the data (as `_SKETCH` fields and repeatable groups) but emits it under keys the templates don't use. This phase adds a **normalization step** inside `generator.mjs` — `normalizeAnswers(answers) → answers'` — run before placeholder replacement, that (a) applies the direct renames, (b) expands each repeatable group `KEY_i_sub` into the template's numbered placeholders via a declared `COMPOSITION` map, (c) derives a few singles. Domain-overfit placeholders are left to Phase 5 (conditional emit); junk placeholders are excluded from the coverage metric. No new interview questions are added in this phase.

**Tech Stack:** Node.js ESM, `node:test`, existing `generator.mjs`.

## Global Constraints

- Do NOT add new wizard questions in this phase (fill comes from wiring existing answers). Adding fields is a separate, later decision.
- The normalization is pure and lives in `skills/rule-architect/generator.mjs` (or a sibling `normalize.mjs` it imports) — used by BOTH servers + CLI automatically (they all call the generator).
- Coverage metric counts only MEANINGFUL placeholders: exclude the junk set `{X, NN}` (literal `[X]`/`[NN]` in prose) and the Phase-5 domain-overfit defer set (listed in Task 1). Target: ≥95% of the remainder resolve for the fully-answered fixture.
- Preserve Phase-1/2 behavior; the unfilled-marker format (`**[KEY]**`) is unchanged here (Phase 5 replaces it). Zero new deps. Commit trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Branch `feat/architect-context-pack`.
- Closes carry-forward F4 partially: `DEVOPS_*`/`PROCESS_*` gap is addressed here IF those keys map from existing fields; otherwise they join the Phase-5 defer set (decide in Task 1).

## Concrete mapping (from analysis — Task 1 finalizes)

**Direct renames (wizard key → template key):** `PROJECT_NAME_SKETCH→PROJECT_NAME`, `TOP_FEATURE_1→FEATURE_1`, `TOP_FEATURE_2→FEATURE_2`, `TOP_FEATURE_3→FEATURE_3`, `PRIMARY_PERSONA_SKETCH→PERSONA_1`. (Also confirm `PROJECT_PITCH_SKETCH→PROJECT_ELEVATOR_PITCH` — verify the template key exists.)

**Composition rules (repeatable group → numbered placeholders; `i` is 1-based):**

| Group (subfields) | Template placeholders produced |
|---|---|
| `KEY_VALUE_PROPS` (valueProp) | `KEY_VALUE_PROP_{i}` |
| `DOMAIN_TERMS` (term, definition) | `DOMAIN_TERM_{i}`, `DOMAIN_TERM_{i}_DEF` |
| `DOMAIN_CONSTRAINTS` (constraint, reason) | `DOMAIN_CONSTRAINT_{i}` |
| `DOMAIN_NOTES` (note) | `DOMAIN_NOTE_{i}` |
| `PRIMARY_FUNCTIONS` (name, description) | `PRIMARY_FUNCTION_{i}`, `PRIMARY_FUNCTION_{i}_DESC`, **and** `CORE_FUNCTION_{i}`, `CORE_FUNCTION_{i}_DESC` (same source — DECIDE in Task 1 if that's desired or if CORE_* is domain-overfit) |
| `ENTITIES` (name, plural, description, …) | `ENTITY_{i}`, `ENTITY_{i}_DESC`; `PRIMARY_ENTITY←ENTITIES[1].name`, `SECONDARY_ENTITY←ENTITIES[2].name` |
| `PERSONAS` (name, description, goal, pain, behavior) | `PERSONA_{i}`, `PERSONA_{i}_DESC` (from description or goal); `USER_PERSONA←PERSONAS[1].name` |
| `FEATURES` (feature, description) | `FEATURE_{i}` — RECONCILE with the `TOP_FEATURE_*→FEATURE_*` rename: decide precedence (recommend: detailed `FEATURES` wins when present, `TOP_FEATURE_*` as fallback) |
| `CORE_FLOWS` (flow) | `FLOW_{i}` |
| `USER_STORIES` (story, acceptance, priority) | `USER_STORY_{i}` |
| `SCOPE_ITEMS` (item) | `SCOPE_ITEM_{i}` |
| `OUT_OF_SCOPE_ITEMS` (item) | `OUT_OF_SCOPE_ITEM_{i}`, **and** `NON_GOAL_{i}` (same source) |
| `EXTERNAL_SERVICES` (service, purpose) | (map to whatever integration placeholders exist — verify keys in Task 1) |

**Domain-overfit → Phase-5 defer set (do NOT wire here):** `UNIT_CONVENTION_*`, `PROPERTY_TEST_FOCUS_*`, `UNIT_TEST_FOCUS_*`, `EDGE_CASE_*`, `EDGE_CASE_TEST_*`, `DOMAIN_SPECIFIC_ASSUMPTION_*`, `DOMAIN_UX_REQUIREMENT_*`, `DOMAIN_DATA_PRINCIPLE_*`, `EXPLAIN_REQ_*`, `ROBUSTNESS_REQ_*`, `PRIVACY_REQ_*`, `OPEN_QUESTION_*`, `PERF_TARGET_*`, `ADR_*`, `MVP_STEP_*`, `USER_NEED_*`, `ADVANCED_USER_NEED_*`, `CONTEXT_AND_OBJECTIVE`, `PROJECT_DISCLAIMER`, `LIST_PRIMARY_SCREENS_AND_FEATURES`, `DOMAIN_ENTITY_MANAGER`, `DOMAIN_LOGIC_AREA`. (Task 1 finalizes this list; each entry is either wired if a source exists, or explicitly deferred.)

**Junk (exclude from metric):** `X`, `NN`, and any placeholder that is a literal in template prose (Task 1 confirms by grepping context).

---

### Task 1: Field-map artifact + coverage baseline

**Files:** Create `skills/rule-architect/field-map.mjs` (exports `RENAMES`, `COMPOSITION`, `DERIVED`, `DEFER_PHASE5`, `JUNK`); Create `test/architect-fill-coverage.test.mjs`.

- [ ] **Step 1** Build a fully-answered fixture `test/fixtures/architect-full-answers.json`: every flat field set to a sample value; each repeatable group given 2–3 entries with all subfields filled. (Derive the field list from `wizard-spec.json`.)
- [ ] **Step 2** Write `field-map.mjs` encoding the tables above as data (RENAMES object, COMPOSITION array of `{group, subfield, template, descTemplate?, aliases?}`, DERIVED functions, DEFER_PHASE5 set, JUNK set). Resolve the three flagged decisions inline with a comment stating the choice: (a) CORE_FUNCTION_* fed from PRIMARY_FUNCTIONS or deferred; (b) FEATURE_* precedence (FEATURES vs TOP_FEATURE_*); (c) NON_GOAL_* fed from OUT_OF_SCOPE_ITEMS or deferred. **If any decision is genuinely ambiguous, STOP and escalate to the human** rather than guessing.
- [ ] **Step 3** Write `test/architect-fill-coverage.test.mjs`: compute the set of template placeholders (from `templates.json`), subtract `JUNK` ∪ `DEFER_PHASE5`, and assert the CURRENT coverage (pre-implementation) is ~27% — a baseline the later tasks must raise. (This test will be tightened to ≥95% in Task 3.)
- [ ] **Step 4** Commit `feat(architect): field-map + fill-coverage baseline`.

### Task 2: Apply the 5 direct renames to the canonical spec

**Files:** Modify `skills/rule-architect/wizard-spec.json` (field `key`s + any `showIf`/`prefillMap` referencing them); check `skills/rule-architect-web/interview.js` (keys drive rendering) and init-values.

- [ ] **Step 1** Rename the 5 keys in `wizard-spec.json`. Grep the repo for each old key (`showIf`, `prefillMap`, `interview.js`, `detect.mjs`, tests) and update every reference.
- [ ] **Step 2** Start a server, verify the renamed fields still render + track (Playwright focus test still passes for the renamed sketch field).
- [ ] **Step 3** Commit `refactor(architect): rename sketch fields to template placeholder keys`.

### Task 3: Normalization layer in the generator + coverage gate

**Files:** Modify `skills/rule-architect/generator.mjs` (add `normalizeAnswers` using `field-map.mjs`, call it at the top of both `generateContext` and `generateContextContent`); tighten `test/architect-fill-coverage.test.mjs`.

**Interfaces:** `normalizeAnswers(answers) → answers'` — pure; applies RENAMES, expands COMPOSITION (`answers[`${group}_${i}_${sub}`]` → `answers[template_i]`), applies DERIVED. Idempotent; never overwrites an already-present template key with empty.

- [ ] **Step 1** Write the failing coverage test at the ≥95% target (feed the fixture through `normalizeAnswers` then `generateContextContent`; assert `filled/(meaningful placeholders) ≥ 0.95`). Run → fails (~27%).
- [ ] **Step 2** Implement `normalizeAnswers` + wire it into both generator entry points.
- [ ] **Step 3** Run the coverage test → passes (≥95%). Run the Phase-1 characterization + parity tests → still pass (normalization must not break the existing single-value fills).
- [ ] **Step 4** Commit `feat(architect): normalizeAnswers — rename + list composition (27%→≥95% fill)`.

### Task 4: Verify end-to-end + close/defer DEVOPS/PROCESS + wire tests

**Files:** Modify `package.json` (`test:all`+`ci`); possibly `field-map.mjs` (DEVOPS_*/PROCESS_*).

- [ ] **Step 1** Decide `DEVOPS_*`/`PROCESS_*` (F4): if the wizard collects the source (devops-toolchain / process-delivery steps exist in `wizard-spec.json`), add them to RENAMES/COMPOSITION; else add to `DEFER_PHASE5` with a comment. Re-run coverage.
- [ ] **Step 2** Generate a real `.context/` via `/api/download` on a live server with the fixture; spot-check `README.md`, `specs/01-product.md`, `analysis/functional-analysis.md` now contain real values (not `**[KEY]**`) for the wired keys.
- [ ] **Step 3** Append `architect-fill-coverage.test.mjs` to `test:all`+`ci`. Run the three-suite chain → pass.
- [ ] **Step 4** Commit `test(architect): wire fill-coverage gate into CI`.

## Self-Review

- **Spec coverage:** S2 (rename + list composition + ≥95% gate) → Tasks 1–4; F4 → Task 4 Step 1.
- **Placeholder scan:** the mapping tables are concrete; Task 1 Step 2 explicitly escalates genuine ambiguities rather than guessing.
- **Type consistency:** `normalizeAnswers(answers)→answers'`; `field-map.mjs` exports `{RENAMES, COMPOSITION, DERIVED, DEFER_PHASE5, JUNK}` used identically in Tasks 1, 3, 4.
- **Risk:** the CORE_FUNCTION/FEATURE/NON_GOAL precedence decisions (Task 1) are the main judgment calls — escalated if ambiguous. Coverage metric honesty depends on the defer/junk sets being accurate, so Task 1 grounds them against real template prose.

## Roadmap after P4
P5 templates conditional + lean (kill `**[KEY]**`; conditional domain specs incl. the Task-1 defer set) · P6 cross-harness `AGENTS.md` entry-points · P7 UI Summary•Files panel · fast-follows F1/F5/F7.
