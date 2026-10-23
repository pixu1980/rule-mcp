# rule-styleguide-a11y - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, twenty-eighth skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-a11y/SKILL.md`: the POUR sections, the semantic HTML
  decision table, the complex component protocol, the verification workflow,
  the WCAG-EM report, the reference library, and a merged legacy block at the
  end that repeats several of them.
- `references/`: 21 guides, of which two mention the APG once each.
- `guardrails/`: 11 rules, none of them about roles or ARIA properties.
- `references/guide-compliance-profiles.md`: already targets WCAG 2.2.
- `src/core/wcag-data/_criteria.data.js`: 86 criteria, 31 A + 24 AA + 31 AAA, so
  level AA is 55 criteria, which the skill states correctly.

Public sources verified in this session:

- W3C APG pattern index: 30 patterns, from Accordion to Window Splitter.
- W3C "What's new in WCAG 2.2": 9 criteria added and 4.1.1 Parsing removed, which
  is why 2.2 is not a strict superset of 2.1 and why the legacy text is wrong.
- MDN Baseline glossary and the `web-features` repository, for the support states
  the guides annotate.

Local articles: no dedicated accessibility piece exists in
the local article corpus; the matches are incidental. Confirmed with the
owner; nothing is cited from there.

Problems found:

| Problem                        | Detail                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| APG was named, not mapped      | 30 patterns, no matrix, two mentions across 21 guides                                                 |
| 9 patterns had no guide        | menus, menu button, listbox, meter, toolbar, tree view, treegrid, window splitter, multi-thumb slider |
| the tool list was five bullets | no layer, no limit, no gate; "Wave" instead of WAVE; no static lint                                   |
| the legacy block duplicated    | semantic HTML, ARIA, verification and the checklist, plus a second H1 under section 11                |
| the WCAG target contradicted   | the body says 2.2 AA, the legacy block and `EAA.md` say 2.1 AA                                        |
| APCA read as a criterion       | APCA is a proposal, not a WCAG 2.2 conformance requirement                                            |
| roles and ARIA were unchecked  | 11 rules, none for redundant roles, unknown attributes or broken id references                        |

## Decisions

| Question   | Decision                                                                       |
| ---------- | ------------------------------------------------------------------------------ |
| Matrix     | A dedicated `references/guide-apg-matrix.md`, plus an APG row in every guide   |
| Gaps       | Fill all of them, grouping related patterns into five guides and one extension |
| Tools      | Six layers: static, runtime DOM, CLI, browser, score, contrast                 |
| APCA       | Kept with an explicit caveat: design input, not conformance                    |
| WCAG       | 2.2 AA everywhere; the EAA and EN 301 549 mapping stated once in `EAA.md`      |
| Dedupe     | Delete the merged legacy block; fold its unique content into the body          |
| Guardrails | Six advisory rules derived from the APG                                        |
| Delivery   | Plan only; implementation in a later pass                                      |

## Workstream A - The APG matrix

The matrix answers one question per pattern: **what does the platform already
give me, and is the ARIA pattern still needed?** The verdict column is the point.
"Native only" means the ARIA pattern must not be used; "native preferred" means
the ARIA pattern is the fallback for a requirement the native element cannot
meet; "ARIA needed" means the platform has no equivalent.

| APG pattern        | Native first                                                          | Guide                | Verdict          |
| ------------------ | --------------------------------------------------------------------- | -------------------- | ---------------- |
| Accordion          | `<details>` + `<summary>`                                             | tabs-accordion       | native only      |
| Alert              | `role="status"` for polite, `role="alert"` for assertive              | toasts-notifications | ARIA needed      |
| Alert and dialogs  | `<dialog>` + `showModal()`, `window.confirm()` for a blocking answer  | modals               | native only      |
| Breadcrumb         | `<nav aria-label>` + `<ol>` + `aria-current="page"`                   | navigation           | native only      |
| Button             | `<button type>`                                                       | buttons              | native only      |
| Carousel           | scroll-snap + buttons, no `aria-roledescription`                      | carousels-sliders    | native only      |
| Checkbox           | `<input type="checkbox">` + `<label>`, `indeterminate` for tri-state  | forms                | native only      |
| Combobox           | `<select>` (customizable) or `<input list>` + `<datalist>`            | autocomplete         | native preferred |
| Dialog (modal)     | `<dialog>` + `showModal()`                                            | modals               | native only      |
| Disclosure         | `<details>` + `<summary>`                                             | tabs-accordion       | native only      |
| Feed               | a "Load more" button, `role="feed"` only for infinite scroll          | infinite-scroll      | native preferred |
| Grid               | `<table>` for data, `role="grid"` only for spreadsheet navigation     | tables               | native preferred |
| Landmarks          | `<header>`, `<nav>`, `<main>`, `<footer>`                             | SKILL section 4      | native only      |
| Link               | `<a href>`                                                            | navigation           | native only      |
| Listbox            | `<select size>` or `<select multiple>`                                | menus-listbox        | native only      |
| Menu and menubar   | `<nav>` + links for site navigation; `role="menu"` only for app menus | menus-listbox        | ARIA needed      |
| Menu button        | `<button popovertarget>` + `popover`                                  | menus-listbox        | native preferred |
| Meter              | `<meter>`                                                             | meter                | native only      |
| Radio group        | `<fieldset>` + `<legend>` + `<input type="radio">`                    | forms                | native only      |
| Slider             | `<input type="range">`                                                | carousels-sliders    | native only      |
| Slider multi-thumb | two range inputs, or the ARIA pattern when the rail is the design     | carousels-sliders    | ARIA needed      |
| Spinbutton         | `<input type="number">` with a real step, `inputmode` for mobile      | forms                | native preferred |
| Switch             | `<input type="checkbox" role="switch">`, or a plain checkbox          | forms                | native preferred |
| Table              | `<table>` + `<caption>` + `<th scope>`                                | tables               | native only      |
| Tabs               | `<details>` when panels are independent, ARIA tabs when they are not  | tabs-accordion       | ARIA needed      |
| Toolbar            | a plain group of buttons; `role="toolbar"` only for arrow-key groups  | menus-listbox        | ARIA needed      |
| Tooltip            | `popover` + `aria-describedby`, never `title` alone                   | tooltips-popovers    | native preferred |
| Tree view          | `<ul>` + `role="tree"`, no native equivalent                          | tree                 | ARIA needed      |
| Treegrid           | no native equivalent                                                  | tree                 | ARIA needed      |
| Window splitter    | `<input type="range">` between panes, or the ARIA pattern             | window-splitter      | ARIA needed      |

Each guide gains a header row naming the APG patterns it serves, the native-first
answer, and the verdict, so a reader who lands in a guide knows whether the ARIA
pattern is even allowed.

## Workstream B - The nine missing patterns

Grouped so that the reader finds them by the component they are building:

| New guide                    | Covers                                       | Why grouped                                        |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------- |
| `guide-menus-listbox.md`     | Menu, menubar, menu button, toolbar, listbox | the same keyboard model: arrows, Home, End, Escape |
| `guide-tree.md`              | Tree view, treegrid                          | the same expand/collapse model and roving tabindex |
| `guide-meter.md`             | Meter                                        | short; native element first                        |
| `guide-window-splitter.md`   | Window splitter                              | no native element, rare pattern                    |
| `guide-carousels-sliders.md` | extended with the multi-thumb slider         | same file, same rail                               |

The four new files follow the shape of the existing guides: native first, the APG
keyboard contract, the ARIA state table, the failure modes, and the manual test
that the automation cannot replace.

## Workstream C - The validation tool matrix

The five bullets become a table with three columns that matter: what the tool
sees, what it cannot see, and whether it can block a merge.

| Layer          | Tool                                                         | Sees                          | Cannot see                     | Gate                   |
| -------------- | ------------------------------------------------------------ | ----------------------------- | ------------------------------ | ---------------------- |
| Static markup  | HTML-validate                                                | element and attribute rules   | anything computed at runtime   | yes, in lint           |
| Static JSX     | `eslint-plugin-jsx-a11y`                                     | JSX props and roles           | rendered DOM, dynamic ids      | yes, in lint           |
| Runtime DOM    | `@axe-core/playwright`                                       | the rendered page             | whether alt text is meaningful | yes, in CI             |
| Runtime DOM    | `vitest-axe` or `jest-axe`                                   | a rendered component          | the page it sits in            | yes, in unit tests     |
| Runtime DOM    | `cypress-axe`                                                | the page under test           | anything outside the test      | yes, in e2e            |
| CLI            | `pa11y-ci`                                                   | a URL, second engine          | interaction and state          | advisory               |
| Browser        | WAVE, Accessibility Insights, IBM Equal Access, axe DevTools | structure and surprises       | nothing reproducibly           | manual review          |
| Score          | Lighthouse                                                   | an axe subset plus heuristics | most criteria                  | advisory, never a gate |
| Contrast       | WebAIM Contrast Checker; APCA as a design aid                | the two colors you paste      | the rendered stack             | manual                 |
| Assistive tech | NVDA, JAWS, VoiceOver, TalkBack                              | the actual experience         | nothing automatic              | manual, mandatory      |

Two corrections ride along: "Wave" becomes WAVE, and the skill says out loud that
Lighthouse produces a score, not a conformance claim. The existing
`a11y-test-required` guardrail keeps requiring Playwright plus axe-core, and the
matrix names it as the automated gate rather than duplicating the requirement.

## Workstream D - Dedupe and structure

The merged block that begins at `## Conventions (rules -> skills merge)` is
deleted. It repeats the semantic HTML table, the ARIA guidance, the verification
workflow and the checklist, and it introduces a second `<h1>` under section 11.
What is unique in it moves once:

- the EAA scope, deadline, standard and enforcement: already in `EAA.md`, which
  the body links;
- the validation tools: replaced by the matrix in Workstream C;
- the development checklist: merged into the section 8 checklist, with the WCAG
  2.2 additions from Workstream E.

## Workstream E - WCAG 2.2 everywhere

The body already targets 2.2 AA and the vendored data is 2.2 (86 criteria, 55 at
A and AA). The legacy block and `EAA.md` still say 2.1. The fix:

1. `EAA.md` states the legal chain once: the EAA points at EN 301 549, whose
   harmonized edition references WCAG 2.1 AA; this skill targets WCAG 2.2 AA,
   which covers 2.1 except 4.1.1 Parsing, removed as obsolete. The current EN 301
   549 edition must be checked at adoption time rather than assumed here.
2. The nine 2.2 criteria are placed where they belong: 2.4.11 and 2.4.12 in
   focus, 2.5.7 and 2.5.8 in input, 3.2.6 in predictable, 3.3.7, 3.3.8 and 3.3.9
   in input assistance. Several are present already; the goal is one home each.
3. The APCA section gains the caveat: APCA is a perceptual model under
   discussion, not a WCAG 2.2 success criterion, so a design may use it and a
   conformance claim still cites the 2.x contrast ratios.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall on the corpus.

| Rule id                | Rejects                                                                    | Tier | Source        |
| ---------------------- | -------------------------------------------------------------------------- | ---- | ------------- |
| `a11y-redundant-role`  | a role equal to the element's native semantics                             | A    | APG; HTML-AAM |
| `a11y-aria-valid`      | an unknown `aria-*` attribute or role value                                | A    | WAI-ARIA 1.2  |
| `a11y-aria-required`   | a role missing its required states or properties                           | B    | WAI-ARIA 1.2  |
| `a11y-aria-ref`        | `aria-labelledby`, `aria-controls` or `aria-describedby` pointing at no id | B    | WAI-ARIA 1.2  |
| `a11y-heading-order`   | a heading level that skips one                                             | B    | WCAG 1.3.1    |
| `a11y-landmark-unique` | two `main` or two `banner` landmarks on one page                           | B    | WCAG 1.3.1    |

The role and attribute lists come from a vendored snapshot, so the rules do not
need the network; the snapshot is refreshed with the existing `a11y-update` path
that already vendors the criteria.

## Verification

1. A `good` and a `bad` snippet per new rule in the guardrail corpus.
2. A test that every APG pattern appears exactly once in the matrix, so a new
   pattern from the W3C fails the suite instead of going unnoticed.
3. A test that every guide named in the matrix exists on disk and every guide
   names its APG patterns.
4. A false-positive matrix: ARIA inside a string, inside a template literal and
   inside a framework prop must not count as rendered markup.
5. The existing content and link-integrity tests, plus `pnpm census`.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the guides, the guardrails and the vendored data.
- [x] Verify the APG pattern list, the WCAG 2.2 changes and the criteria count.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Structure and compliance

- [ ] Write `references/guide-apg-matrix.md` with the 30 rows.
- [ ] Add the APG row to every existing guide.
- [ ] Add the five new guides and the multi-thumb extension.
- [ ] Delete the merged legacy block and fix the heading structure.
- [ ] Reconcile `EAA.md` and place the nine 2.2 criteria.
- [ ] Add the APCA caveat.

### Phase 2 - Tools

- [ ] Replace the five bullets with the matrix.
- [ ] Name the automated gate once and let `a11y-test-required` point at it.
- [ ] Correct WAVE and demote Lighthouse to advisory.

### Phase 3 - Guardrails

- [ ] Vendor the role and attribute snapshot.
- [ ] Add the six rules with fixtures and a unit test each.
- [ ] Promote Tier A after the corpus gate reports 100%.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.
- [ ] Write the ADR for the vendored ARIA snapshot, since it adds a data source
      the engine did not have before.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions and scaffolding | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Structure and compliance | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 2 - Tools | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 3 - Guardrails | `T3-rules` | `kimi-k2.7-code` | small deterministic code |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test tests/core/guardrails-precision-recall.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/guardrails/__tests__/_false-positives.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_content.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/docs/link-integrity.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The interview said eight missing patterns; the APG index lists 30, and nine of
  them have no guide. The plan lists all nine and groups them into five files;
  the count in the interview was wrong and this is the correction.
- EN 301 549's current edition is not asserted here: the plan says to check it at
  adoption time rather than pin a version that may have moved.
- APCA stays as design guidance with the conformance caveat; it never replaces
  the WCAG 2.x contrast ratios.
- The APG is guidance, not a specification: the matrix says when its pattern is
  forbidden by the native element, not only when it is available.
