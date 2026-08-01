# rule-architect — Fillable Context Pack, Cross-Harness Output & Human UI

- **Date:** 2026-07-29
- **Status:** Approved design (pre-plan)
- **Scope:** `rule-architect` (engine + templates), `rule-architect-web` + `rule-architect/assets/context-server` (web front-ends), `rule-architect-cli` (terminal front-end).

## 1. Problem (evidence)

`rule-architect` runs an interview and generates a `.context/` pack for Spec-Driven / "vibe" coding. Investigation found three systemic defects (shared across web + CLI because they share `generator.mjs` + `templates.json`):

1. **Broken fill wiring — 27% coverage.** Only 48 of 177 template `[KEY]` placeholders can ever be filled. The wizard collects `PROJECT_NAME_SKETCH`, `TOP_FEATURE_1`, `PRIMARY_PERSONA_SKETCH`, `ENTITIES`, `PERSONAS`, `FEATURES`…; templates want `PROJECT_NAME`, `FEATURE_1`, `PERSONA_1`, `ENTITY_1`, `USER_STORY_1`… — same concepts, different key names, never mapped. ~70 wizard fields are collected and never emitted; 129 template placeholders have no source. Confirmed in the CLI's own committed sample (`analysis/functional-analysis.md` = 95 unfilled markers, `ROADMAP.md` = 32). A diligent full interview still yields a pack that is ~70% `**[KEY]**` noise.
2. **Templates overfit to one past project.** `specs/03-calculation-engine.md`, `specs/04-ruleset-config.md`, `schemas/ruleset.schema.json`, placeholders like `UNIT_CONVENTION_1`, `PROPERTY_TEST_FOCUS_1` — leftovers from a "rules calculator" app, shipped to every project.
3. **Nothing an IDE/agent auto-loads.** Output is a bare `.context/` folder. No `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, `.github/copilot-instructions.md`, `GEMINI.md`, `.windsurf/rules`, `.clinerules`, Pi files. For "vibe coding across all IDEs/harnesses/models" the pack is effectively invisible unless wired by hand.

Compounding structural debt:

4. **Front-end divergence.** Two wizard specs (`placeholders.json`, clean `sections[].fields[]`, used by `context-server`; `wizard-spec.json`, a different shape transformed at runtime by `architect-web`), **two** `interview.js` copies, three front-ends. Renaming keys across two divergent specs + two UIs doubles the work and re-creates drift.
5. **Placeholder UX.** Unfilled placeholders render as bold `**[KEY]**` — noise and hallucination bait for LLMs.

## 2. Goals / Non-goals

**Goals**
- A fully-answered interview fills ≥95% of the emitted pack (from 27%).
- The generated project is auto-loaded by Claude Code, Cursor, GitHub Copilot, Gemini, Windsurf, Cline, and Pi with a single canonical source of truth.
- Output is lean and high-signal for LLMs (no `**[KEY]**` noise; omit or clearly TODO-mark empty sections).
- One canonical wizard spec + one shared interview UI; CLI produces byte-identical `.context/` to web.
- Right panel keeps live update but presents human-friendly.

**Non-goals**
- No change to the SDD philosophy or the set of spec documents beyond de-overfitting.
- No new runtime dependencies (front-end stays framework-free, rule-vanilla-reactive; server stays zero-dep).
- Not redesigning the whole wizard flow/steps — only key names, output, and the right panel.

## 3. Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| A | Reconcile wizard↔template keys | **Rename wizard field keys** to the template placeholder names (+ list-composition layer for repeatables) |
| B-delivery | Entry-point production | **Canonical `AGENTS.md` + symlinks** (format-wrapper where frontmatter is required; copy fallback on Windows) |
| B-targets | Harnesses | Claude Code, Cursor, GitHub Copilot, Gemini, Windsurf, Cline, **Pi (pi.dev)** — `AGENTS.md` is the always-generated canonical base |
| C | Overfit domain specs | **Conditional emit** (only when the project domain warrants) |
| D | Right panel | **Summary • Files toggle**, live |
| S1 | Divergence | **Consolidate** to one canonical spec + one shared interview UI, keep derived artifacts in sync |

## 4. Architecture — canonical pipeline

```
canonical spec (sections[].fields[])         ← single source of truth
        │
        ├── shared interview.js  ──────┐     ← one file, served by both web servers
        │                              │
   standalone server.mjs        context-server.mjs (MCP-served)
        │                              │
        └────────── same /api ─────────┘
                      │
        generator.mjs  →  normalizer (rename + list compose + conditional)  →  templates.json
                      │
                 .context/ pack  +  AGENTS.md  +  symlinked entry-points
                      ▲
                  CLI renderer.mjs (terminal) reads the SAME spec + generator
```

- **Canonical spec:** the clean `sections[].fields[]` shape (today's `placeholders.json`). `wizard-spec.json` is either removed or generated from the canonical spec at build time — never hand-maintained in parallel.
- **Canonical interview UI:** merge the two `interview.js` into one. Base the merge on the MCP-served `context-server` variant (real-user path, covered by `test/architect-ui.test.mjs`; richer card taxonomy `project-type-card`/`tech-card`/`stack-card` that drives PROJECT_TYPE filtering), folding in `architect-web`'s improvements (phase labels on step dots). Both servers serve this one file.
- **Sync guarantee:** a build/test step regenerates any derived artifact (e.g. `wizard-spec.json`) from the canonical spec and fails CI if they drift.

## 5. S2 — Fill wiring (A)

1. **Rename** every wizard field key to its template placeholder name. Update, in lockstep: the canonical spec `key`s, `showIf` condition keys, `init-values`, and the UI (keys drive `renderField`/`data-part`/`track`). Produce a **documented rename table** (`wizard key → template key`) as part of implementation; examples: `PROJECT_NAME_SKETCH→PROJECT_NAME`, `PROJECT_PITCH_SKETCH→PROJECT_ELEVATOR_PITCH`, `TOP_FEATURE_{n}→FEATURE_{n}`, `PRIMARY_PERSONA_SKETCH→PERSONA_1`.
2. **List-composition layer** in `generator.mjs` (needed even after rename): repeatables emit `KEY_N_sub` (`ENTITIES_1_name`); templates want composed numbered blocks (`ENTITY_1`, `PERSONA_1`, `USER_STORY_1`). The normalizer expands each repeatable group into the template's numbered placeholders using a per-group format string, and leaves trailing unused numbered placeholders to the empty-section rules (S3).
3. **Coverage gate:** automated test asserting ≥95% of *emitted* template placeholders resolve for a fully-answered fixture interview.

## 6. S3 — Templates: conditional + lean (C)

- **Conditional emit:** domain specs (`03-calculation-engine`, `04-ruleset-config`, `schemas/ruleset.schema.json`) emit only when the project domain warrants (gated on a domain/project-type field). Generic projects get a clean, relevant pack.
- **Empty-section policy:** replace the `**[KEY]**` fallback. A section with no data is either **omitted** or rendered as a single explicit `> _TODO: <what to provide>_` line. Never emit raw `[KEY]`/`**[KEY]**` tokens.
- **Lead with signal:** the pack's entry point is `AGENTS.md` (S4); `.context/README.md` becomes the index into the specs; specs are supporting detail.
- De-overfit placeholder names (`UNIT_CONVENTION_*`, `PROPERTY_TEST_FOCUS_*`) → generic equivalents or gate them behind the domain condition.

## 7. S4 — Cross-harness entry-points (B)

**Canonical `AGENTS.md`** (repo root) — the single high-signal doc, generated from answers:
- One-line pitch · stack + pinned versions · commands (build/preview/test/lint from toolchain answers) · conventions (rule: zero CSS classes, zero inline styles, semantic HTML, external CSS via `adoptedStyleSheets`; pnpm exact versions; English; `./src` layout) · architecture pattern · key entities/personas/features (brief) · do/don't · pointer to `.context/` (`read .context/README.md` for full specs).

**Delivery:**
- **Symlink** (plain-markdown readers): `CLAUDE.md`, `GEMINI.md`, `.clinerules`, `.github/copilot-instructions.md` → `AGENTS.md`.
- **Format-wrapper** (frontmatter formats a bare symlink would break): `.cursor/rules/main.mdc`, `.windsurf/rules/main.md` — a short generated file with the required frontmatter that `@`-includes / references `AGENTS.md`.
- **Pi (pi.dev):** follow the user's global convention — `.pi/ → .agents/`, `AGENTS.md` canonical.
- **Cross-platform:** create symlinks; on failure (Windows without privilege) fall back to copying, and log which mode was used.

**Test:** every declared entry-point exists and resolves to `AGENTS.md`'s content (following symlink / wrapper include).

## 8. S5 — UI: live Summary • Files toggle (D)

- Right panel keeps live update. A segmented control **[Summary • Files]** at the top.
- **Summary (default):** grouped by phase/section with human labels; **only filled fields** shown; internal keys and the raw JSON `<pre>` dump removed; repeatable groups rendered as bulleted lists.
- **Files:** tabs over the actual generated pack (`AGENTS.md`, `README`, specs…), live-rendered markdown, so the user sees exactly what ships as they type.
- Reuses the existing focus-preserving render guard (structural signature). Semantic HTML + `data-part` only + external CSS via `adoptedStyleSheets`; validated with `rule_tool_check`. Preserves scroll position on live update (as today).

## 9. S6 — CLI parity

Shared `generator.mjs` + normalizer + `templates.json`, and the CLI reading the canonical spec, make CLI output identical to web by construction. The CLI's committed `.context/` sample is regenerated as a golden fixture and asserted equal to the web output for the same answers.

## 10. S7 — Testing

- **Coverage gate:** ≥95% placeholder resolution for a fully-answered fixture (from 27%).
- **Golden snapshot:** a fully-answered `.context/` fixture; web and CLI outputs must match it and each other.
- **Entry-points:** existence + resolution to `AGENTS.md`.
- **Empty-section policy:** no `[KEY]`/`**[KEY]**` tokens survive in any emitted file.
- **UI (Playwright):** Summary/Files toggle, live update, existing focus-retention test, scroll preservation.
- **Guardrails:** `rule_tool_check` on new/changed UI code.
- **Sync:** derived-artifact regeneration matches committed (CI drift check).

## 11. Rollout order

S1 (consolidate spec + interview) → S2 (rename + compose + coverage gate) → S3 (conditional + lean templates) → S4 (entry-points) → S5 (UI) → S7 (tests throughout).

## 12. Risks & mitigations

- **Rename blast radius:** touches the canonical spec, `showIf`, init-values, and the UI. Mechanical but wide; the rename table + coverage gate contain it. S1 keeps it single-source.
- **UI merge:** reconciling the two wizard UX variants (tier cards vs project-type/tech/stack taxonomy) — resolved by basing on the MCP-served variant; folding architect-web niceties.
- **Symlinks:** frontmatter formats need wrappers (handled); Windows needs copy fallback.
- **Consolidation is the largest single risk;** it is a prerequisite the user explicitly approved, and it removes the doubling/drift that caused the earlier focus-bug duplication.
