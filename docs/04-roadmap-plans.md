# Roadmap and plans

Execution plans and refactor roadmap consolidated into one dependency-aware planning file.

## Source preservation

Every source document below is preserved verbatim under its own heading so no project knowledge is lost during consolidation.

## Preserved source: `plans/execution-plan.md`

> Original path: `docs/plans/execution-plan.md`  
> SHA-256: `4d75abac2a4bda7c62b99dc6e9b00eba5c8c8e559e8960374a3b6de3e786d00b`

# Execution Plan — Phase 3: Token-Saving Tools

> Started: 2026-06-27

## Steps (TDD: RED → GREEN → REFACTOR)

### 3.1 Context-aware skill routing
- [x] **T1** `pix` returns structured JSON with `route`, `confidence`, `sections`, `next_tools`
- [x] **T2** Returns only relevant sections (not full skill file)
- [x] **T3** Supports multi-skill queries (e.g. "React accessibility" → react + styleguides)
  - Fixed YAML frontmatter parser to handle multi-line descriptions (`|` literal block scalars)
  - Added metadata-based scoring fallback for skills without matching section headings
  - Removed frontmatter from section extraction to avoid false positive matches
  - Changed section scoring from average to max for more precise routing
  - Added additional stopwords to reduce noise from generic words

### 3.2 Project framework auto-detector (`src/core/detector.js`)
- [x] **T4** `pix_detect` reads package.json and returns framework
- [x] **T5** Detects TypeScript vs JavaScript
- [x] **T6** `pix` biases routing based on detected framework
  - Added `framework` parameter to `pix` for explicit framework hints
  - Added `path` parameter for auto-detection via `detectProject()`
  - Matching skills get 2.0x boost; universally relevant skills (styleguides, web) get 1.15x
  - Non-matching skills get 0.85x penalty

### 3.3 Template engine — multi-file generation
- [x] **T7** `pix_component` generates multi-file output: `_Component.jsx` + `_Component.css` + `index.js`
- [x] **T8** Variable interpolation: component name, props, data-part attributes

### 3.4 Semantic search with BM25
- [x] **T9** BM25 search returns ranked results with relevance scores
- [x] **T10** Inverted index built on skill load, cleared on `skills reload`

### 3.5 Smart guardrail iteration
- [x] **T11** `pix_check` accepts previous errors, skips already-passed checks
- [x] **T12** Returns only NEW issues

### 3.6 Module size cleanup (ROADMAP P1 compliance)
- [x] Split `src/core/guardrails.js` (780→136 lines) + new `src/core/guardrail-defs.js`
- [x] Split `src/core/skills.js` (598→285 lines) + new `src/tools/ai.js` (255 lines)
- [x] Split `src/core/templates.js` (535→163 lines) + new `src/core/template-data.js`
- [x] Compact `src/tools/skill.js` (328→282 lines)

### 3.7 Fail-closed anti-hallucination enforcement
- [x] Mandatory preprocessing before every handler with payload/depth/key/control validation.
- [x] Mandatory postprocessing after every handler with MCP shape and router registry validation.
- [x] Blocking `pix_check` failures plus unfinished-code, suppressed-error, and verified-dependency guardrails.
- [x] Model-visible enforcement contract and `_meta.pixEnforcement` audit metadata.
- [x] Reusable command installation for Pi, Claude Code, Gemini CLI, Cursor, and Copilot CLI agent selection.
- [x] Dispatcher skill renamed from `pix-galaxy` to `pix`.
- [x] Architecture decision recorded through `pix_process_adr`.

## Preserved source: `plans/refactor-roadmap.md`

> Original path: `docs/plans/refactor-roadmap.md`  
> SHA-256: `57940d22e47b5a763fc9d275d86380ddb5910f781411053b2858f2eebd99e3d9`

# pix-galaxy-mcp — Refactor Roadmap

> **Author**: Enterprise Architecture Review  
> **Scope**: 36 skills → audit, merge, split, redesign pix-architect, create pix-process-adr  
> **Status**: Draft v1.0

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Skill-by-Skill Audit](#2-skill-by-skill-audit)
3. [Merge Proposals](#3-merge-proposals)
4. [Split Proposals](#4-split-proposals)
5. [New Skill: pix-process-adr](#5-new-skill-pix-process-adr)
6. [Redesign: pix-architect Interview](#6-redesign-pix-architect-interview)
7. [Target Taxonomy (post-refactor)](#7-target-taxonomy-post-refactor)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Executive Summary

Current: **36 skills**, some too small (<80 lines), some near the limit (>500 lines), with evident functional overlaps.

Target: **32 skills** after 4 merges, plus 1 new skill (`pix-process-adr`), with a cleaner taxonomy and clear separation of responsibilities.

### Refactoring principles

1. **Each skill must be ≤500 lines.** If it exceeds, split or delegate content to a sub-skill.
2. **Each skill must have a single responsibility.** If a skill covers two unrelated topics (e.g., Visual Studio Code configuration + documentation workflows), split.
3. **Framework-specific content stays in the skill.** Shared content goes into `pix-styleguide` which is referenced by all skills.
4. **Skills are building blocks.** Agents route to a main skill, which may reference sub-skills via MCP tool calls.
5. **ADR becomes a first-class skill.** The ad-hoc ADR system becomes `pix-process-adr` with full CLI + MCP integration.

---

## 2. Skill-by-Skill Audit

### Legend

| Icon | Meaning |
|------|---------|
| ✅ Keep as-is | Good size, clear scope |
| 🔀 Merge | Merge into another skill |
| ✂️ Split | Split into multiple skills |
| 📦 New | Create new skill |
| 📏 Oversized | Exceeds 500 lines — split |
| 📐 Undersized | Below 100 lines — merge |

### Audit table

| # | Skill | Lines | Verdict | Action |
|---|-------|-------|---------|--------|
| 1 | pix-galaxy | ~190 | ✅ | Keep — ai router |
| 2 | pix-architect | ~320 | ✅ | Keep — architecture wizard |
| 4 | pix-backend | ~180 | ✅ | Keep — backend rules |
| 5 | pix-backend-api-design | ~150 | ✅ | Keep — API design |
| 6 | pix-backend-node | ~130 | ✅ | Keep — Backend scaffold |
| 7 | pix-backend-security | ~150 | ✅ | Keep — security |
| 8 | pix-coverage-gates | ~80 | 🔀 | Merge into pix-devops-testing |
| 9 | pix-devops-docker | ~170 | ✅ | Keep — Docker rules |
| 10 | pix-devops-docker-standards | ~60 | 🔀 | Merge into pix-devops-docker |
| 11 | pix-devops-gitlab-ci | ~160 | ✅ | Keep — CI rules |
| 12 | pix-devops-testing | ~180 | ✅ | Keep — testing |
| 13 | pix-devops-version | ~100 | ✅ | Keep — versioning |
| 14 | pix-frontend-angular | ~280 | ✅ | Keep — Angular-specific rules |
| 15 | pix-frontend-astro | ~250 | ✅ | Keep — Astro-specific |
| 16 | pix-frontend-forms | ~220 | ✅ | Keep — forms rules |
| 17 | pix-frontend-forms-validation | ~80 | 🔀 | Merge into pix-frontend-forms |
| 18 | pix-frontend-meta-next | ~220 | ✅ | Keep — Next.js |
| 19 | pix-frontend-meta-nuxt | ~190 | ✅ | Keep — Nuxt |
| 20 | pix-frontend-meta-remix | ~160 | ✅ | Keep — Remix |
| 21 | pix-frontend-react | ~380 | ✅ | Keep — React rules |
| 22 | pix-frontend-react | ~100 | ✅ | Keep — React+ Vite scaffold |
| 23 | pix-frontend-solidjs | ~240 | ✅ | Keep — SolidJS |
| 24 | pix-frontend-svelte | ~260 | ✅ | Keep — Svelte |
| 25 | pix-frontend-vanilla-reactive | ~340 | ✅ | Keep — vanilla reactive |
| 26 | pix-frontend-vue | ~300 | ✅ | Keep — Vue |
| 27 | pix-platform-desktop | ~200 | ✅ | Keep — desktop rules |
| 28 | pix-platform-expo | ~180 | ✅ | Keep — Expo rules |
| 29 | pix-platform-expo | ~100 | ✅ | Keep — Expo scaffold |
| 30 | pix-platform-library | ~170 | ✅ | Keep — library rules |
| 31 | pix-platform-web | ~140 | ✅ | Keep — web platform |
| 32 | pix-process-documentation | ~140 | ✅ | Keep — docs practices |
| 33 | pix-process-feature-workflow | ~110 | ✅ | Keep — workflow |
| 34 | pix-process-handoff | ~120 | 📦 | Extract from pix-architect |
| 35 | pix-scaffolding | ~90 | 🔀 | Merge into pix-architect |
| 36 | pix-styleguide | ~480 | ✅ | Keep (at limit) — main styleguide |

### Summary

| Verdict | Count | Skills |
|---------|-------|--------|
| ✅ Keep | 28 | Core skills at right size |
| 🔀 Merge | 4 | coverage-gates → testing, docker-standards → docker, forms-validation → forms, scaffolding → architect |
| ✂️ Split | 0 | None required |
| 📦 New | 1 | pix-process-adr (extract from architect) |

---

## 3. Merge Proposals

### M1: coverage-gates → pix-devops-testing

**Rationale**: coverage gates are a testing enforcement rule. They belong as a section in the testing skill, not as a standalone 80-line skill.

**Action**: Move content from `pix-coverage-gates/SKILL.md` into `pix-devops-testing/SKILL.md` under a new `## Coverage Gates` section.

**Loss**: None — all rules preserved.

### M2: docker-standards → pix-devops-docker

**Rationale**: Docker standards are best practices that complement the Docker skill. Both are container-related and always referenced together.

**Action**: Merge `pix-devops-docker-standards/SKILL.md` into `pix-devops-docker/SKILL.md` under a new `## Standards` section.

**Loss**: None.

### M3: forms-validation → pix-frontend-forms

**Rationale**: Field validation is part of forms. Keeping them separate requires two tool calls when one suffices.

**Action**: Merge validation rules into `pix-frontend-forms/SKILL.md` under `## Field Validation`.

**Loss**: None.

### M4: scaffolding → pix-architect

**Rationale**: Project scaffolding is an architectural concern. The scaffolding router (`pix-scaffolding`) only dispatches to sub-scaffolders. This belongs in the architect skill as a section.

**Action**: Move scaffolding section into `pix-architect/SKILL.md`. Keep sub-scaffolders as standalone.

**Loss**: None.

---

## 4. Split Proposals

No skills exceed the 500-line threshold with sufficient margin. `pix-styleguide` is at 480 lines — monitored but not split.

---

## 5. New Skill: pix-process-adr

**Rationale**: The ADR system was prototyped in `pix-architect`. It deserves to be a first-class skill with dedicated features.

**Scope**:
- CLI: `pix-galaxy-mcp adr new --title "..." [--status accepted] [--tags a,b,c]`
- MCP Tool: `pix_process_adr` with schema validation
- Auto-ADR: Logger for architect/scaffold/detect calls
- Index: Auto-generated `docs/adr/README.md`
- Template: Michael Nygard format

**Status code in pix-process-adr**: `proposed | accepted | deprecated | superseded`

---

## 6. Redesign: pix-architect Interview

The context interview is currently a 16-step wizard. Proposed improvements:

1. **Progressive depth**: step 0 asks for depth (starter/standard/deep) and shows different step counts
2. **Filtered tech stacks**: choosing a project type filters available frameworks, databases, API styles
3. **Wizard UI**: two-column layout (form + live JSON preview)
4. **Context generation**: writes `.context/` files directly to disk
5. **Repeatable groups**: add/remove personas, features, entities with one click

---

## 7. Target Taxonomy (post-refactor)

```
pix-*
├── pix             # Skill router
├── pix-architect          # Architecture + scaffolding router
├── pix-backend            # Backend patterns
├── pix-backend-api-design # API design + OpenAPI
├── pix-backend-node
├── pix-backend-security    # Security
├── pix-devops-docker             # Docker + standards
├── pix-devops-gitlab-ci          # GitLab CI/CD
├── pix-devops-testing            # Testing + coverage gates
├── pix-devops-version # Versioning
├── pix-frontend-angular            # Angular standalone
├── pix-frontend-astro              # Astro islands
├── pix-frontend-forms              # Forms + validation
├── pix-frontend-meta-next               # Next.js
├── pix-frontend-meta-nuxt               # Nuxt
├── pix-frontend-meta-remix              # Remix
├── pix-frontend-react              # React 18+
├── pix-frontend-react
├── pix-frontend-solidjs            # SolidJS
├── pix-frontend-svelte             # Svelte 5
├── pix-frontend-vanilla-reactive   # Vanilla JS reactive
├── pix-frontend-vue                # Vue 3
├── pix-platform-desktop            # Desktop (Electron)
├── pix-platform-expo    # Expo/EAS
├── pix-platform-expo
├── pix-platform-library            # Library authoring
├── pix-platform-web                # Web platform
├── pix-process-documentation      # Documentation practices
├── pix-process-feature-workflow   # Feature workflow
├── pix-process-handoff            # Context handoff
└── pix-styleguide        # HTML, CSS, JS, a11y
```

Total: **32 skills** (36 − 4 merges + 1 new = 33, minus 1 scaffolding removal → 32).

---

## 8. Implementation Roadmap

### Phase 1: Merge (1 day)
- [x] Merge coverage-gates → testing — verified in `pix-devops-testing`
- [x] Merge docker-standards → docker — verified in `pix-devops-docker`
- [x] Merge forms-validation → forms — validation lives in framework/styleguide coverage
- [x] Merge scaffolding → architect — verified in `pix-architect`
- [x] Remove merged skill directories — stale directories are absent

### Phase 2: pix-process-adr (1 day)
- [x] Create `skills/pix-process-adr/SKILL.md` with ADR template
- [x] Implement CLI `adr new` handler
- [x] Register MCP tool `pix_process_adr`
- [x] Implement auto-ADR logging
- [x] Write `docs/adr/README.md` index

### Phase 3: architect interview redesign (2 days)
- [x] Add interview depth selector (starter/standard/deep)
- [x] Implement tech stack filtering
- [x] Build two-column wizard UI
- [x] Implement context file generation

### Phase 4: Testing & verification (1 day)
- [x] Run smoke tests
- [x] Verify MCP tool listing — current taxonomy exposes 71 MCP tools
- [x] Verify CLI commands
- [x] Remove migration guide requirement — package has not been released yet

---

## 9. Final pix-architect UI/UX Implementation Plan

This plan defines the definitive mirrored UX for `pix-architect` in CLI and Web modes. The two interfaces must expose the same information architecture, step order, validation rules, preview output, generation behavior, and handoff flow.

### 9.1 Product principles

- **One flow, two shells**: CLI and Web share the same step schema from `skills/pix-architect/wizard-spec.json`.
- **Same state model**: both shells read/write the same `values` object and generate from `skills/pix-architect/templates.json`.
- **Progressive depth**: Starter, Standard, and Deep expose the same subsets in both shells.
- **Deterministic output**: generated `.context/` files are byte-equivalent for the same input values.
- **LLM-ready handoff**: both shells end with validation status, generated file list, ADR reminders, and `pix_process_handoff` guidance.

### 9.2 Shared information architecture

| Order | Step | CLI behavior | Web behavior | Acceptance |
|-------|------|--------------|--------------|------------|
| 0 | Analysis depth | arrow/select prompt | tier cards | identical tier key saved |
| 1 | Project type and stack | filtered select prompts | filtered cards/selects | invalid combos blocked |
| 2 | Stack versions | version prompts/defaults | version fields/defaults | defaults match |
| 3 | Project identity | text/textarea prompts | text/textarea fields | required fields enforced |
| 4 | Product and users | repeatable prompt groups | repeatable groups | same array serialization |
| 5 | Domain model | entity/glossary prompts | entity/glossary editor | same placeholder keys |
| 6 | Architecture decisions | ADR-oriented prompts | ADR-oriented panels | output maps to `ARCHITECTURE_DECISIONS` |
| 7 | Quality gates | checklist prompts | checklist panel | output maps to `QUALITY_GATES` |
| 8 | pix routing | skill/tool selectors | skill/tool selectors | exact tool names saved |
| 9 | Preview | file diff/list preview | file tabs/diff preview | same generated content |
| 10 | Generate | write `.context/` | write/download `.context/` | same files and counts |
| 11 | Handoff | print next commands | completion summary | same handoff guidance |

### 9.3 CLI implementation milestones

- [ ] CLI-1 Extract a shared `architect-schema` module from `placeholders.json` and `templates.json`.
- [ ] CLI-2 Add `pix-galaxy-mcp architect interview --mode cli --tier <starter|standard|deep>`.
- [ ] CLI-3 Implement keyboard-first prompts with the same visible/required rules as Web.
- [ ] CLI-4 Add `--dry-run`, `--json`, `--answers <file>`, and `--output <dir>`.
- [ ] CLI-5 Add preview mode showing generated files, unfilled placeholders, and changed paths.
- [ ] CLI-6 Add validation summary and suggested next MCP tools.

### 9.4 Web implementation milestones

- [ ] WEB-1 Refactor `interview.js` to consume the shared schema without duplicating flow logic.
- [ ] WEB-2 Make the stepper, forms, preview, generation, and completion screens match CLI steps exactly.
- [ ] WEB-3 Add deterministic preview tabs for every generated `.context` file.
- [ ] WEB-4 Add validation summary with missing required fields and unfilled placeholders.
- [ ] WEB-5 Add export/import of answer JSON compatible with CLI `--answers`.
- [ ] WEB-6 Add completion screen with ADR, handoff, and quality-gate next actions.

### 9.5 Shared validation and tests

- [ ] UX-1 Unit-test visible step filtering by tier and project type.
- [ ] UX-2 Unit-test placeholder coverage: every template placeholder exists in the schema.
- [ ] UX-3 Snapshot-test generated `.context/` output for fixed answer fixtures.
- [ ] UX-4 Contract-test CLI and Web generation for byte-equivalent output.
- [ ] UX-5 E2E-test Web interview starter/standard/deep flows.
- [ ] UX-6 CLI smoke-test `--dry-run`, `--json`, `--answers`, and `--output`.

### 9.6 Done definition

- [ ] CLI and Web expose the same step order and labels.
- [ ] CLI and Web produce identical files from identical answers.
- [ ] Both modes report filled/unfilled placeholder counts.
- [ ] Both modes expose the same skill/tool recommendations.
- [ ] Both modes end with ADR and handoff guidance.
- [ ] `pnpm run ci` passes.

