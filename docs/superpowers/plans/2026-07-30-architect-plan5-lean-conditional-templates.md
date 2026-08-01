# Architect Consolidation — Phase 5: Lean + Conditional Templates

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kill the `**[KEY]**` noise and the always-emitted domain overfit. Today a fully-answered pack still ships ~53 `**[KEY]**` markers (the `DEFER_PHASE5` set) plus three domain specs that are pure calculation/ruleset boilerplate for every project, and `AGENTS.md` shows raw framework keys (`react`, `sqlite`) instead of labels. After P5: no `[KEY]`/`**[KEY]**` token survives in any emitted file; domain-overfit specs emit **only when the project warrants**; `AGENTS.md` reads clean (labels, no empty sections). This is spec section **S3** (`docs/superpowers/specs/2026-07-29-architect-context-pack-and-ui-design.md:73`).

**Architecture:** All fill logic lives in `skills/rule-architect/generator.mjs`, which today **duplicates** the render loop across `generateContext` (disk) and `generateContextContent` (in-memory) — lines 64-75 and 125-136. P5 first extracts one shared `renderTemplate(tmpl, answers)` so the new empty-section + conditional logic exists once and both entry points (servers + CLI) inherit it by construction. Conditional emit is a data flag on the template (`emitWhen`) evaluated by the generator, not scattered `if`s. Label resolution + F8/F9 hygiene extend the existing `normalize.mjs` / `field-map.mjs` layer.

**Tech Stack:** Node ESM, zero deps. `node --test` for the generator/coverage gates; Playwright only if a UI-visible change lands (it does not — P5 is generation-side).

## Global Constraints

- **Single source:** all generation logic in `skills/rule-architect/{generator,normalize,field-map}.mjs` + `templates.json`. Both servers and the CLI import the shared generator — never fork logic into a server.
- **No new interview questions unless Task 2 Step 1 explicitly adds the one domain gate** (see decision below). P4's "no new questions" constraint is relaxed for P5 *only* for the single conditional-emit gate, and only if the reviewer confirms the alternative (gate on `PROJECT_TYPE`) is rejected.
- **Never emit raw `[KEY]` or `**[KEY]**`** in any output file. Empty → omit the section or a single explicit TODO line.
- **Coverage gate must stay green:** `test/architect-fill-coverage.test.mjs` computes `meaningful = allPlaceholders − JUNK − DEFER_PHASE5`. P5 changes what ships; keep the gate honest by re-pointing it at the **emitted** output for the fully-answered fixture and asserting zero surviving tokens (Task 4).
- Commit trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Branch `feat/architect-context-pack`.

## Decision LOCKED (conditional-emit gate)

The three domain specs — `specs/03-calculation-engine.md` (36 placeholders, all calculation/unit overfit), `specs/04-ruleset-config.md` (27, ruleset overfit), `schemas/ruleset.schema.json` (49, ruleset overfit) — must emit only "when the project domain warrants" (spec S3).

**Decided by the human (2026-07-30): gate on the existing `PROJECT_TYPE` field.**

```jsonc
// templates.json, on those three templates only
"emitWhen": { "field": "PROJECT_TYPE", "in": ["other"] }
```

Rationale: zero `wizard-spec.json` churn and no new interview question, so P4's "no new questions" constraint holds unchanged. **Accepted trade-off:** `PROJECT_TYPE` is a weak proxy for "has a rules/calculation engine" — a `webapp` that *is* a rules engine loses these specs, and an `other` project with no rules engine still gets them. Two alternatives were considered and rejected: a new `DOMAIN_HAS_RULESET` boolean (more precise, but adds a wizard question), and content-driven auto-omit (`filled === 0` → skip, no flag at all).

**Therefore:** build the `emitWhen` evaluator as a *generic* data-driven predicate (field + `in`/`equals`), so revisiting the gate later is a one-line change in `templates.json` and never a code change. Do not hardcode `PROJECT_TYPE` anywhere in `generator.mjs`.

---

### Task 1: Shared render helper + empty-section policy (lean output)

**Files:** `skills/rule-architect/generator.mjs`; Test `test/architect-generator.test.mjs`, `test/architect-fill-coverage.test.mjs`.

**Interfaces:** new `renderTemplate(tmpl, answers) → { path, content, filled, unfilled }`; both `generateContext` and `generateContextContent` call it.

- [ ] **Step 1** Write a failing test in `test/architect-generator.test.mjs`: render the full templates set against a fully-answered fixture and assert **no** `**[` and **no** `[A-Z_0-9]` bracket-token survives in any `content`. Run → fails (today `**[KEY]**` survives).
- [ ] **Step 2** Extract the duplicated fill loop (generator.mjs:64-75 and :125-136) into one `renderTemplate(tmpl, answers)`. Behaviour change: treat an **empty-string** value as *unfilled* (fixes F8: `resolveStackName` `""` fallback must not count as filled). Replace the `match => \`**${match}**\`` fallback with the empty-section policy from Step 3. Both public functions now delegate to it; `filled`/`unfilled` counts preserved.
- [ ] **Step 3** Empty-section policy (no raw tokens): (a) an unfilled non-JUNK `[KEY]` on its own line → drop that line; (b) a Markdown section whose body is left empty after dropping → omit the heading too (a heading followed only by blank/whitespace up to the next same-or-higher heading); (c) an unfilled `[KEY]` inline within otherwise-real prose → replace with `_(TODO: KEY)_` so the sentence still reads and the token is gone. JUNK tokens (`[X]`, `[NN]`) are left verbatim (they are literal prose — see `field-map.mjs:251`).
- [ ] **Step 4** Run `test/architect-generator.test.mjs` (now green) + `test/architect-fill-coverage.test.mjs` (must still pass — coverage counts unchanged since fixture is fully answered). Commit `refactor(architect): shared renderTemplate + lean empty-section policy`.

### Task 2: Conditional template emit

**Files:** `skills/rule-architect/generator.mjs`, `skills/rule-architect/templates.json`, (conditionally) `skills/rule-architect/wizard-spec.json`; Test `test/architect-generator.test.mjs`.

**Interfaces:** template flag `emitWhen: { field, in: [...] }` (or `equals`); generator skips a template whose `emitWhen` predicate is false against normalized answers. Templates without `emitWhen` always emit (unchanged).

- [ ] **Step 1** Lock the gate decision (see above). If "new question": add `DOMAIN_HAS_RULESET` boolean to the `design` step of `wizard-spec.json` (default off) and to `field-map.mjs` as a real key. If "PROJECT_TYPE": no spec change.
- [ ] **Step 2** Write a failing test: (a) generic answers (`DOMAIN_HAS_RULESET` false / non-`other` type) → emitted file list does NOT contain `specs/03-calculation-engine.md`, `specs/04-ruleset-config.md`, `schemas/ruleset.schema.json`; (b) domain-on answers → all three present. Run → fails (all three always emit today).
- [ ] **Step 3** Add `emitWhen` evaluation to the generator loop (skip template if predicate false; applies to BOTH `generateContext` and `generateContextContent` via the shared loop). Tag the three domain templates in `templates.json` with the chosen `emitWhen`.
- [ ] **Step 4** Update `README.md`/index template so its documentation-map does not link the omitted specs when they are not emitted (or link them conditionally). Run the new test green. Commit `feat(architect): conditional emit for domain-overfit specs`.

### Task 3: De-overfit names + AGENTS.md label resolution + F9 frontmatter

**Files:** `skills/rule-architect/normalize.mjs`, `skills/rule-architect/field-map.mjs`, `skills/rule-architect/generator.mjs`, `templates.json`; Test `test/architect-normalize.test.mjs`, `test/architect-entry-points.test.mjs`.

**Interfaces:** extend `DERIVED` (or a normalize label-resolution pass) so display fields resolve option keys → human labels; harden `fanOutEntryPoints` frontmatter.

- [ ] **Step 1** AGENTS.md renders raw keys today for `[FRONTEND_FRAMEWORK]`, `[BACKEND_FRAMEWORK]`, `[DATABASE]` (e.g. `react`, `sqlite`). Add DERIVED/label-resolution entries (reuse `labelForOption` + `spec.optionGroups`, same mechanism as `resolveStackName` at `field-map.mjs:151`) so these display as `React`, `SQLite`. Write a failing test in `architect-entry-points.test.mjs` asserting the emitted `AGENTS.md` contains the label, not the key.
- [ ] **Step 2** F9 — sanitize the values spliced into Cursor/Windsurf frontmatter in `fanOutEntryPoints` (`generator.mjs:24-35`): a `projectName` containing a newline or `---` currently breaks the YAML frontmatter. Strip control chars / collapse to a single line before interpolation. Add a test with a hostile project name.
- [ ] **Step 3** De-overfit the placeholder NAMES the spec calls out (`UNIT_CONVENTION_*`, `PROPERTY_TEST_FOCUS_*`, spec S3 line 78): these now live only inside the conditionally-emitted domain specs (Task 2), so for generic projects they never render. Confirm no de-overfit key leaks into an always-emitted template; if one does, either move it behind the domain gate or replace with a generic equivalent. Update `DEFER_PHASE5` in `field-map.mjs` to drop any key that is now conditionally-gated-away (keep the coverage denominator honest).
- [ ] **Step 4** Run `architect-normalize` + `architect-entry-points`. Commit `fix(architect): resolve framework labels in AGENTS.md + de-overfit + frontmatter escape (F9)`.

### Task 4: Coverage gate re-point + golden snapshot + CI

**Files:** `test/architect-fill-coverage.test.mjs`, `test/architect-generator.test.mjs`, golden fixture under `test/`; verify `package.json` `ci` includes them.

- [ ] **Step 1** Re-point the coverage gate: instead of scanning static `templates.json` prose, render the fully-answered fixture through the generator and assert (a) ≥95% of meaningful placeholders resolve AND (b) **zero** `[KEY]`/`**[KEY]**` tokens survive in emitted output (spec S7 line 109). This is the durable invariant — it can't silently regress when templates change.
- [ ] **Step 2** Golden snapshot: commit a fully-answered `.context/` fixture (domain-on AND generic variants) and assert web (`generateContextContent`) and CLI (`generateContext`) produce byte-identical output for the same answers (spec S6/S7). Confirms conditional emit + empty policy are deterministic across entry points.
- [ ] **Step 3** Confirm `node --run ci` runs all four architect gates. NOTE: the pre-existing `test/docs-architect.test.mjs` "≤6 root docs, found 8" abort (F3) and the unrelated `skills-docs` a11y "See also" red are OUT OF SCOPE for P5 — do not fix here; flag if they block CI. Commit `test(architect): emitted-output coverage + golden snapshot`.

## Self-Review

- **Spec coverage:** S3 conditional emit → Task 2; S3 empty-section policy / no raw tokens → Task 1 + Task 4 Step 1; S3 de-overfit names → Task 3 Step 3; F8 (empty-string ≠ filled) → Task 1 Step 2; F9 (frontmatter escape) → Task 3 Step 2; AGENTS.md tidy (labels + empty sections) → Task 1 + Task 3 Step 1; S6/S7 golden + coverage → Task 4.
- **Duplication risk:** the render loop is duplicated TODAY (generator.mjs:64-75 ≈ :125-136); Task 1 collapses it first so every later change lands once. Do not add P5 logic before the extraction.
- **Gate honesty:** conditionally removing DEFER-keyed specs shrinks the static placeholder set — Task 4 Step 1 re-points the gate at emitted output so the 95% number stays meaningful rather than gamed by deletion.
- **Blast radius:** `emitWhen` defaults to "always emit" when absent → only the three tagged templates change behaviour; the other 21 are untouched. Empty-section policy is the one broad change — golden snapshot (Task 4 Step 2) pins it.
- **Open decision:** the conditional-emit gate (new `DOMAIN_HAS_RULESET` question vs. gate on `PROJECT_TYPE`) — must be confirmed with the human at Task 2 Step 1 before touching `wizard-spec.json`.

## Outcome (implemented 2026-07-30, commits c910925..d2b5b72)

All four tasks landed; 56 architect gates green. What the plan got WRONG, found by
rendering the committed fixture through the real generator before writing code:

- **JSON would have been corrupted.** `schemas/ruleset.schema.json` is JSON and all 26 of
  its placeholders sit inside string values — never alone on a line. The plan's
  "drop the line" rule yields `Expected double-quoted property name at line 23`. Fixed by
  per-format dispatch: non-markdown output is inline-substituted only.
- **The TODO marker would have failed its own gate.** T4 asserts no `[KEY]`-shaped token
  survives; a marker like `_(TODO: [KEY])_` trips it. Marker is `_TODO: KEY_` — no brackets.
- **`TEMPLATE_GUIDE.md` was already corrupted** (pre-existing, not caused by P5): it
  documents the placeholder syntax, and the generator substituted into its own teaching
  examples. Now `raw: true`.
- **JUNK was already being bolded** (pre-existing): the ADR example read
  `# ADR **[NN]**: [Title]`. JUNK now passes through verbatim.
- **Fences and tables needed explicit protection.** 23 placeholder occurrences live inside
  code fences; one roadmap table row carries four `EDGE_CASE_*` placeholders next to real
  milestone text, so row-dropping would delete real content.
- **`README.md`'s doc map was stale AND would have gone dead:** it linked a nonexistent
  `specs/10-rule-routing.md`, omitted specs 07-09 and 11-12, and listed the three
  now-gated files. It is generated from the emitted list (`DOC_MAP`).
- **Label resolution broke the gate.** Resolving `PROJECT_TYPE` "other" -> "Other" made
  `in: ["other"]` stop matching. Gates stay authored against option keys; `shouldEmit`
  accepts either spelling.
- **Blanket label resolution would have made output worse.** `STACK_LINT_TOOL`'s label is
  `"Biome — rule-toolchain-biome"` — wizard-UI decoration, not prose. The em-dash suffix
  is stripped.
- **Two real bugs found while verifying:** `context-server.mjs` (the server the MCP tool
  actually spawns) passed `null` as the spec, so label resolution and `STACK_NAME` never
  worked on the path real users hit; and `wizard-spec.json`'s `DATABASE` defaulted to
  `"none"` while `databaseEngines` had no `none` option.

Deviation from the plan: T3's "de-overfit placeholder NAMES" was a no-op — every
`UNIT_CONVENTION_*` / `PROPERTY_TEST_FOCUS_*` key now lives only inside conditionally-gated
templates or renders as a TODO, so renaming them would be churn without an output change.
`DEFER_PHASE5` was left intact for the same reason: the coverage gate now measures emitted
output, so the set no longer influences the number.

## Roadmap after P5

P5 is the last roadmap enhancement (P1·P2·P4·P6·P7 done). Remaining fast-follows, independent of P5: **F7** (context-server static-handler path-traversal guard), **F10** (root-file clobber guard — needs a human decision on skip+`--force` vs `.bak` vs surface). F1/F5/F11 already landed. Then finishing-a-development-branch (merge `feat/architect-context-pack`).
