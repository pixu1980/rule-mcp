# rule-styleguide-css - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, twenty-fourth skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-css/SKILL.md` (786 lines): selectors, tokens, units,
  property order, nesting, cascade, comments, flex-first, layout, responsive,
  color, typography, motion, accessibility and tooling.
- `skills/rule-styleguide-css/guardrails/`: six rules.
- `src/core/layers/_guardrails.js`: the loader that compares the frontmatter
  declaration with the folder exports.

The loader was run against the whole repository, and it reports exactly one
drift problem, which is this skill's.

Public sources verified in this session:

- CSS Cascade Layers, https://www.w3.org/TR/css-cascade-5/#layering
- CSS Custom Properties, https://www.w3.org/TR/css-variables-1/
- CSS Logical Properties, https://www.w3.org/TR/css-logical-1/
- CSS Containment and container queries, https://www.w3.org/TR/css-contain-3/
- CSS Color 4, https://www.w3.org/TR/css-color-4/
- MDN CSS, https://developer.mozilla.org/en-US/docs/Web/CSS
- Web Platform Baseline, https://web-platform-dx.github.io/web-features/

Local articles: seven CSS pieces sit in `04-frontend/` (container queries, the
one-liners, the layout rules, the 2026 features). They stay context only; the
specifications are the sources.

Problems found:

| Problem                   | Detail                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| frontmatter drift         | the skill declares five rules and exports six: `css-no-ellipsis` is the one problem the loader reports in the whole repository |
| boundaries are unstated   | tokens, logical properties, contrast and support floors belong to four other skills and are not named as such                  |
| standards are not cited   | cascade layers, custom properties and container queries are used without their specification                                   |
| modern features to verify | `@scope`, `:has()`, `light-dark()`, anchor positioning, `@starting-style` and `view-transition` are absent or unverified       |
| tooling is one paragraph  | property order is a rule and nothing enforces it, and lightningcss is not named                                                |

## Decisions

| Question       | Decision                                                                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drift          | Declare `css-no-ellipsis` in the frontmatter, and add a repo-wide gate                                                                                                 |
| Scope          | Drift, standards, modern CSS, boundaries, tooling                                                                                                                      |
| Boundaries     | Confirmed: CSS owns syntax and mechanics; tokens, RTL, contrast, support floors and `data-part` stay with their owners                                                 |
| Standards      | Cascade Layers, Custom Properties, Logical Properties, Containment, Color 4, MDN, Baseline                                                                             |
| Modern CSS     | `@scope` and `:has()`, `light-dark()`, `text-wrap` and `line-clamp`, anchor positioning, `@starting-style`, view transitions, `subgrid`, `clamp()`, popover and dialog |
| Tooling        | Property ordering, lightningcss for minification and prefixes, stylelint as the linter                                                                                 |
| New guardrails | `!important`, unit system, nesting depth, layer order                                                                                                                  |
| Severity       | Advisory first; the six existing rules keep their behavior                                                                                                             |
| Verification   | The corpus, a parsed CSS fixture, the drift gate, the flex-first surfaces                                                                                              |
| Delivery       | Plan only now                                                                                                                                                          |

### One conflict, resolved

The interview selected `css-logical-properties` and also confirmed that
`rule-styleguide-i18n` owns the RTL rule. Adding both would be the same check
twice. The i18n plan's `i18n-rtl-logical-properties` stays the owner and this
skill documents the syntax with a link; no duplicate rule is added.

## Workstream A - The drift and its gate

1. `css-no-ellipsis` is added to the frontmatter, so the loader reports nothing
   for this skill.
2. A test loads every skill's guardrails and fails when a frontmatter and its
   folder disagree, in either direction. The loader already computes this; the
   test only has to assert an empty problem list, which turns a runtime warning
   into a gate.

## Workstream B - The boundaries

| Concern              | Owner                     | What this skill does         |
| -------------------- | ------------------------- | ---------------------------- |
| Which tokens exist   | `rule-ui-design-system`    | consumes them                |
| RTL logical property | `rule-styleguide-i18n`     | documents the syntax         |
| Focus, contrast      | `rule-styleguide-a11y`     | consumes the states          |
| Support floor        | `rule-styleguide-baseline` | cites the state of a feature |
| `data-part` naming   | `rule-styleguide-html`     | selects on it                |

## Workstream C - Standards

Each mechanism the skill already teaches gains its specification: cascade layers
and custom properties for the architecture, logical properties for the
direction-safe layout, containment for the container queries, Color 4 for
`oklch` and `color-mix`, MDN for the practical reference, and Baseline for the
support question the baseline skill owns.

## Workstream D - Modern CSS

1. `@scope` and `:has()` with the cases each one solves and the support state.
2. `light-dark()` and `color-scheme` for theming without duplicated rules.
3. `text-wrap: balance` and `pretty`, and `line-clamp` next to the existing
   `css-no-ellipsis` rule.
4. Anchor positioning, `@starting-style` and view transitions, each with a
   Baseline note.
5. `subgrid`, `clamp()`, `min()` and `max()` for layout and fluid type.
6. Styling `popover` and `dialog`, including `::backdrop`.

## Workstream E - Tooling

1. Property ordering is enforced, not requested: the order the skill documents
   becomes a stylelint rule set or an equivalent.
2. lightningcss handles minification and prefixes, matching the bundler plans.
3. stylelint is the CSS linter; the plan records it as a new dependency and
   scopes its rules to the ones this skill already states, so the two cannot
   drift.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall. The six existing
rules stay.

| Rule id             | Rejects                                                                 | Tier | Source         |
| ------------------- | ----------------------------------------------------------------------- | ---- | -------------- |
| `css-no-important`  | `!important`                                                            | A    | This skill     |
| `css-unit-system`   | `px` for font sizes and spacing where the skill asks for relative units | A    | This skill     |
| `css-nesting-depth` | a selector nested past the agreed depth                                 | B    | This skill     |
| `css-layer-order`   | an `@layer` declaration with no stable order                            | B    | Cascade Layers |

## Verification

1. A `good` and a `bad` snippet per new rule in the corpus.
2. A CSS fixture that parses, with selector tests that assert the attribute
   strategy.
3. The drift gate over every skill.
4. The existing flex-first surface test stays green.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the guardrails and the loader.
- [x] Reproduce the drift and confirm it is the only one in the repository.
- [x] Verify the specifications.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Fix and gate

- [ ] Declare `css-no-ellipsis` in the frontmatter.
- [ ] Add the drift gate over every skill.

### Phase 2 - Content

- [ ] Cite the specification behind each mechanism.
- [ ] Verify and add the modern features.
- [ ] State the five boundaries.
- [ ] Add the tooling section.

### Phase 3 - Guardrails

- [ ] Add the four rules with fixtures and a unit test each.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the tooling choice, since stylelint is a new
      dependency.

### Phase 4 - Verification

- [ ] Run the CSS fixture and the selector tests.
- [ ] Run the drift gate.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions and scaffolding | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Fix and gate | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |
| Phase 2 - Content | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 3 - Guardrails | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 4 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |

Plan default: `T8-verify` - `gemini-3.8-flash` (high). Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-styleguide-css/guardrails/__tests__/*.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The drift gate protects every skill; the CSS skill is where it was found, not
  the only place it could happen.
- Logical properties stay an i18n rule; this skill only explains the syntax.
- stylelint is a new dependency and the plan records it rather than assuming it
  exists.
- No local article is cited; the specifications are the sources.
