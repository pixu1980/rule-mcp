# Architect Consolidation — Phase 7: Live Summary • Files Panel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the right panel's developer-facing content (an alphabetical `KEY → value` table + a raw JSON dump) with a human-friendly, live-updating **Summary • Files** panel: a grouped, labeled summary by default, and a toggle to a live preview of the actual generated files.

**Architecture:** The panel lives in `<aside data-part="summary-panel">` (index.html), refreshed by `updateSummary()` in the single canonical `skills/rule-architect-web/interview.js` (served to both web servers). The client already has all grouping data (`store.state.sections` with `.label`/`.phase`, fields with `.label`, `store.state.phases`). A segmented `[Summary • Files]` control switches views. **Summary** groups only filled, visible fields under their section's human label (repeatables as nested bullets; no internal keys, no JSON). **Files** debounce-POSTs the current answers to the existing `/api/download` endpoint and renders a file-tab strip + the selected file's raw content in a scrollable `<pre>` (zero-dep, honest — it's exactly what ships; there is no markdown renderer and we won't add a dependency). The Phase-0 focus guard and scroll-preservation are untouched (the panel is separate from the field DOM).

**Tech Stack:** rule-frontend-vanilla-reactive (custom element, `data-part` selectors, external CSS via `adoptedStyleSheets`), zero deps, Playwright.

## Global Constraints

- rule rules: zero CSS classes, zero inline styles (the current `index.html:23` inline `style=` must go), semantic HTML, `data-part="role"` on children, CSS in `interview.css`. Validate with `pix_check`.
- Keep the live update (panel refreshes as the user types) AND scroll preservation (current `updateSummary` saves/restores `summary-scroll` scrollTop — preserve that behavior per view).
- Do NOT touch the Phase-0 structural-signature focus guard or the field render path. The panel is independent.
- Files view must NOT fetch on every keystroke: debounce (~400ms) and only when the Files view is active. Summary view stays purely client-side (no fetch).
- Single source: edit only `skills/rule-architect-web/interview.js` + `interview.css` + `index.html` (context-server serves them by path — no second copy).
- Zero new deps. Commit trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Branch `feat/architect-context-pack`.

## Target layout

```
⚡ Live                         [ Summary • Files ]
──────────────────────────────────────────────
SUMMARY (default, client-side, grouped by section)
  ▸ Project Type & Stack
      Project Type      Web Application
      Frontend          React
      Database          SQLite
  ▸ Domain Sketch
      Project Name      My RPG Builder
      Top Features      • world building
                        • timeline engine
  … (only sections with ≥1 filled visible field; human labels; no raw keys/JSON)

FILES (toggle; debounced POST /api/download)
  [AGENTS.md][README.md][01-product]… (file-tab strip)
  ┌────────────────────────────────────────────┐
  │ # My RPG Builder                            │  ← selected file, raw text in <pre>
  │ A campaign world builder for tabletop RPGs. │     (scrollable)
  └────────────────────────────────────────────┘
```

---

### Task 1: Grouped, human-friendly Summary view

**Files:** Modify the CANONICAL `skills/rule-architect-web/interview.js` (`updateSummary`), `skills/rule-architect-web/interview.css`, `skills/rule-architect-web/index.html` (context-server serves these by path — do NOT edit anything under `assets/context-server/`); Test `test/architect-ui.test.mjs`.

**Interfaces:** `updateSummary()` reads `store.state.{values, sections, phases}`; renders into `[data-part='summary-panel']`.

- [ ] **Step 1** Rewrite `updateSummary()` to build a grouped model: for each visible section (in order), collect its visible fields that have a non-empty value; skip empty sections. Render each as a group with the section's human `label` header (`data-part="summary-group"` / `summary-group-title`), then rows of `field.label → value` (`data-part="summary-row"`/`summary-label`/`summary-value`). For repeatable groups, render the entries as a nested bulleted list (`data-part="summary-list"`). Resolve select values to their option `label` (via `store.state` optionGroups / placeholders), not the raw key. NO internal keys (`*_count`, etc.), NO `<pre>` JSON dump.
- [ ] **Step 2** Move the panel's inline `style="color:…"` (index.html:23) into `interview.css` under a `data-part` selector. Add CSS for `summary-group`/`summary-row`/`summary-label`/`summary-value`/`summary-list` (element + `[data-part]` selectors only, zero classes/inline). Preserve the scroll-position save/restore.
- [ ] **Step 3** Extend `test/architect-ui.test.mjs`: fill a couple of fields, assert the summary shows the section's human label + the field's human label + resolved value, and that NO raw JSON (`{`…`}` dump) and NO `*_count` key appear. Run against a live server.
- [ ] **Step 4** `pix_check` the changed `interview.js` (skill `rule-frontend-vanilla-reactive`) — no NEW styling violations vs baseline; confirm the inline-style removal. Commit `feat(architect-web): grouped human-friendly summary panel`.

### Task 2: Summary • Files toggle + live file preview

**Files:** Modify `interview.js` (toggle state + Files render + debounced fetch), `interview.css`, `index.html` (segmented control markup or render it from JS); Test `test/architect-ui.test.mjs`.

**Interfaces:** panel view state (`this._panelView = "summary" | "files"`); Files fetch reuses `POST /api/download` `{ values, tier }` → `{ files: [{path, content, …}] }`.

- [ ] **Step 1** Add a segmented control (`data-part="panel-toggle"` with two `data-part="panel-tab"` buttons, `data-state-active`), toggling `this._panelView`. Summary is default. Switching re-renders the panel body.
- [ ] **Step 2** Files view: maintain `this._filesSelected` (default `AGENTS.md`). On entering Files OR on value change while Files is active, debounce (~400ms) a `POST /api/download` with the current collected values + tier; on response render a file-tab strip (`data-part="file-tab"`, one per `files[].path`, click selects) + the selected file's `content` in `<pre data-part="file-content">` (scrollable). Show a lightweight "updating…" state during fetch. Do NOT fetch while on Summary.
- [ ] **Step 3** CSS for `panel-toggle`/`panel-tab`/`file-tab`/`file-content` (element + `[data-part]`; `<pre>` wraps/scrolls, no horizontal page overflow). 
- [ ] **Step 4** Extend the Playwright test: click the Files tab → assert a `file-tab` for `AGENTS.md` exists and `file-content` shows real generated text (e.g. the project name); click another file-tab → content changes; toggle back to Summary → grouped summary shown. Debounce: after typing, the file content eventually reflects the new value.
- [ ] **Step 5** `pix_check`; commit `feat(architect-web): Summary/Files panel toggle with live file preview`.

### Task 3: a11y + verify both servers + finalize

**Files:** Test only; verify on both `:37031` (architect-web) and `:19000` (context-server, serves the same file by path).

- [ ] **Step 1** Run the full `test/architect-ui.test.mjs` against BOTH servers (the panel must behave identically since both serve the one `interview.js`). Confirm the Phase-0 focus-retention test + card-taxonomy tests still pass (panel changes must not regress the field DOM).
- [ ] **Step 2** a11y: the segmented control + file tabs use semantic buttons with accessible names; the panel is an `<aside>`. If the repo's a11y test harness (`@axe-core/playwright`) is present, add a minimal axe check on the panel; else assert roles/names via the existing Playwright setup.
- [ ] **Step 3** Commit `test(architect-web): panel coverage across both servers + a11y`.

## Self-Review

- **Spec coverage:** D/S5 (keep live update; Summary grouped + human labels, no raw keys/JSON; Files live preview toggle) → Tasks 1–2; both-servers + a11y → Task 3.
- **Placeholder scan:** layout + data-parts are concrete; the Files mechanism (debounced `/api/download`) is specified; the raw-`<pre>` (no md renderer) decision is explicit.
- **Type consistency:** `updateSummary()` signature unchanged; `this._panelView`/`this._filesSelected` new element state; Files reuse the existing `/api/download` contract.
- **Risk:** Files fetch on keystroke → mitigated by debounce + only-when-active. Inline-style removal must not break layout (pix_check + visual test). Panel changes must not touch the focus guard (Task 3 re-runs the focus test).

## Roadmap after P7
P5 lean/conditional templates (independent) · fast-follows F1 (doc-drift), F5 (phase labels), F7 (path-traversal), F8, F9 (frontmatter escape), F10 (clobber guard). Then finishing-a-development-branch.
