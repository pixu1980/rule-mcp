# Phase 8 — Framework-neutral templates (de-overfit the pack prose)

**Branch:** `feat/architect-context-pack` · **Status:** planned (2026-07-30)

## Problem

The generated `.context/` pack ships prose hardcoded to the ONE app the
architect was prototyped against (a vanilla-JS / Custom-Elements / Parcel
desktop project). It states that stack as fact for *every* project and
therefore contradicts the user's own answers — a React project's README says
"pure vanilla JavaScript only" and "Custom Elements v1" while its AGENTS.md
says "Frontend: React 18+". Phase-8 sibling `823ed06` already fixed the
detector (detect-or-stay-silent); this phase fixes the template prose.

### Audit — hardcoded framework-overfit, by template

| Template | Overfit content |
|---|---|
| `README.md` (12) | "Zero runtime dependencies — pure vanilla JavaScript only"; "Light DOM UI — Custom Elements v1"; 3 dead `../.agents/skills/rule-*` links; `pnpm dev`/`pnpm clean`; "Custom Elements v1 / ES modules"; browser versions Chrome 80/FF 75/Safari 13.1 |
| `constraints.concrete.md` (4) | TC-01 Zero Runtime Dependencies; TC-02 Custom Elements v1 Only; No Shadow DOM; TC-03 ES Modules |
| `project-context.md` (3) | "Vanilla JS ES6+"; "Custom Elements v1 light DOM"; "Parcel" entry points |
| `specs/00-sdd.md` (2) | "Parcel for build"; "Custom Elements v1, NO Shadow DOM" |
| `analysis/implementation-roadmap.md` (1) | "All work remains vanilla JS … Custom Elements v1 without Shadow DOM, Parcel …" |
| `use-cases.concrete.md` (1) | "Browser supports Custom Elements v1" |
| `AGENTS.md` (1) | "External CSS via `adoptedStyleSheets`; no `<style>` tags" (vanilla-specific technique) |

## Decisions (locked by user, 2026-07-30)

1. **Target = framework-neutral packs.** Neutral across frameworks
   (React/Vue/Svelte/vanilla/backend). The rule *methodology* is itself
   framework-agnostic (zero CSS classes, semantic HTML, external CSS, pnpm
   exact, `./src`, English) and STAYS as correct defaults; what goes is the
   assumption of the *vanilla* framework specifically (Custom Elements,
   Parcel, Shadow-DOM, `adoptedStyleSheets`-as-the-only-way, fixed browser
   versions).
2. **Mechanism = answer-driven placeholders.** Prefer placeholders the wizard
   ALREADY collects; add NEW wizard fields only where the content is
   genuinely uncollected.
3. **Dead skill links + browser versions = placeholder-driven** (filled from
   answers, not hardcoded).

## Grounding — most content is ALREADY collected

Existing placeholders that replace hardcoded prose directly (no new field):

- `BROWSER_SUPPORT` (step-16) → the hardcoded browser-version list.
- `BUILD_COMMAND` / `PREVIEW_COMMAND` (step-17) → `pnpm dev`/`build`.
- `FRONTEND_FRAMEWORK` / `META_FRAMEWORK` / `DESKTOP_FRAMEWORK` /
  `BACKEND_FRAMEWORK` / `STACK_NAME` → "vanilla JavaScript / Custom Elements".
- `STACK_CSS_APPROACH` (step-1) → "external CSS via adoptedStyleSheets".
- `ARCH_PATTERN` (step-3) → architecture stance.

Genuinely uncollected → NEW fields (small set, honoring decision 2):

- `ARCHITECTURE_PRINCIPLES` (repeatable, step-3) → README "Architecture
  Principles" bullets + roadmap's "All work remains …" line.
- `TECH_CONSTRAINTS` (repeatable, step-1 stack) → `constraints.concrete.md`
  TC-01/02/03 and the `specs/00-sdd.md` build/runtime constraints.
- `GUIDANCE_LINKS` (repeatable, optional, step-15 routing) → README "Skills
  and Rules" links; empty by default (drops the section when unanswered,
  per the P5 empty-section policy) so no dead links ship.

## Tasks

**T1 — New wizard-spec fields + wiring.** Add the 3 repeatable fields above to
`wizard-spec.json` (with `optionGroups`/labels as needed); wire their
composition in `field-map.mjs` (`ARCH_PRINCIPLE_{i}`, `TECH_CONSTRAINT_{i}`,
`GUIDANCE_LINK_{i}` + label/href subfields). `interview.js` renders them
automatically (data-driven from spec) — verify, no bespoke UI. Update
`DEFER_PHASE5`/coverage sets if needed. Gate: `architect-normalize` +
`architect-fill-coverage`.

**T2 — README.md (the big one).** Replace all 12 overfit lines: browser list →
`[BROWSER_SUPPORT]`; tooling → `[BUILD_COMMAND]`/`[PREVIEW_COMMAND]`;
"Architecture Principles" → `[ARCHITECTURE_PRINCIPLES]` (composed bullets);
"Skills and Rules" → `[GUIDANCE_LINKS]` (section omitted when empty);
stack claims → `[STACK_NAME]`/`[FRONTEND_FRAMEWORK]`/`[STACK_CSS_APPROACH]`.

**T3 — The other 6 templates.** `constraints.concrete.md` TC-* →
`[TECH_CONSTRAINTS]`; `project-context.md` / `specs/00-sdd.md` /
`implementation-roadmap.md` / `use-cases.concrete.md` stack lines → the
existing stack placeholders + `[TECH_CONSTRAINTS]`; `AGENTS.md`
`adoptedStyleSheets` line → `[STACK_CSS_APPROACH]`-driven.

**T4 — Tests + snapshot.** New gate `architect-framework-neutral.test.mjs`:
render the fixture with a React/other stack and assert NO literal
"vanilla JavaScript"/"Custom Elements"/"Parcel"/"Shadow DOM"/hardcoded browser
version survives, and no `../.agents/skills/rule-*` dead link ships.
Regenerate the golden snapshot (broad change — inspect the manifest diff).
Extend `architect-full-answers.json` fixture with the 3 new fields.

## Risks / notes

- Broad golden-snapshot churn (most .md files change). Mitigate: the new
  framework-neutral gate + fill-coverage prove the change is intended, and the
  manifest diff is reviewed per file.
- `TEMPLATE_GUIDE.md` is `raw` — untouched.
- Do NOT reopen locked P1–P5 decisions.

## Outcome (2026-07-30, commits 7e052fd, 547fa97 — DONE)

All 4 tasks landed. What the plan got right/wrong:

- **Right:** most content was already collected — the only new fields needed
  were the 3 repeatables. Simplified them to SINGLE subfields (principle /
  constraint / reference) so unfilled entries drop cleanly as `- [KEY_i]`
  bullets (a `[label](href)` pair leaves `[]()` that the lean policy can't
  recognise as decoration, producing ugly partial TODOs).
- **Missed in the audit:** `constraints.concrete.md` also carried an orphaned
  `### TC-04: @layer` subsection and a hardcoded `### BC-01` browser list
  ("latest 2 versions of Chrome…", "No IE11"), and `project-context.md` a
  prototype-specific `src/scripts/services/…` layout. The first-pass gate
  (specific browser-version regexes) missed the browser-list phrasing — the
  gate was broadened with `/IE11/` + `/latest \d+ versions of …/` and all
  three were fixed. A comprehensive residual scan then returned 0.
- **Coverage:** fixture counts aligned to the max placeholder index each
  template references (principles→4, constraints→4, guidance→3) so wired
  fill-coverage stays 100% (143/143).
- Golden snapshot: 13 files/variant changed, 0 added/removed — no collateral.
  Full architect suite 87/0.

**NOTE — a milder overfit remains, out of P8 scope:** several templates still
carry `./src/scripts/...`-style structural assumptions and specific service
names in non-gated prose. Framework-*stack* neutrality is done; deeper
*project-structure* neutrality (if wanted) is a separate follow-up.
