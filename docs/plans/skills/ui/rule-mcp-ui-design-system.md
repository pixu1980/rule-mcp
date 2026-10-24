# rule-ui-design-system - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: ui. Order: reverse alphabetical, started from this skill.

## Evidence base

Read in this session:

- `skills/rule-ui-design-system/SKILL.md` (262 lines): aesthetic direction, the
  non-negotiable rule-mcp constraints, design thinking sequence, implementation
  pattern, four-pass critique, review checklist.
- `skills/rule-styleguide-css/guardrails/` (6 rules: `no-css-classes`,
  `no-inline-styles`, `external-css`, `css-flex-first`, `css-no-ellipsis`,
  `css-comments-required`).
- `skills/rule-styleguide-a11y/guardrails/` (10 rules including
  `a11y-focus-visible`, `a11y-form-label`, `a11y-test-required`).

Local articles consulted (inspiration only, see the numeric-claims note):

- `04-frontend/how-to-build-a-design-system-in-a-weekend-for-solo-devs-and-small-teams.md`
  (tokens as CSS custom properties, two conceptual layers, button then form
  then card, static `design-system.html`, Style Dictionary only for
  multi-platform).
- `01-ai-coding-agents/claude-design-critique-a-better-way-to-improve-ai-generated-ui.md`
  (four critique passes in order, accessibility first; the skill already adopts
  this).
- `04-frontend/why-reusable-components-can-become-your-biggest-problem.md`
  (prop explosion, Rule of Three, compound components, duplication cheaper than
  the wrong abstraction).

Public standards verified in this session:

- W3C Design Tokens Format Module 2025.10, https://tr.designtokens.org/format/
- ARIA Authoring Practices Guide, https://www.w3.org/WAI/ARIA/apg/
- WCAG 2.2 and Quickref, https://www.w3.org/TR/WCAG22/ and https://www.w3.org/WAI/WCAG22/quickref/
- Open UI, https://open-ui.org/
- Custom Elements Everywhere, https://custom-elements-everywhere.com/
- MDN, CSSStyleSheet, https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet
- MDN, CSS `@layer`, https://developer.mozilla.org/en-US/docs/Web/CSS/@layer
- Semantic Versioning 2.0.0, https://semver.org/

Note on numeric claims: statistics such as "47% less time on form development"
or "74% token adoption" come from the local articles without a primary source.
They do not enter the skill; the underlying practice does.

## Decisions

| Question         | Decision                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Scope            | Tokens, component contract, states, critique, docs artifact, versioning, a11y conformance                                          |
| Output path      | `docs/plans/skills/ui/rule-ui-design-system.md`                                                                                    |
| Depth            | Guidance plus guardrails plus assets and templates                                                                                 |
| Sources          | Every recommendation cites a public standard                                                                                       |
| Standards        | DTCG, ARIA APG, WCAG 2.2 Quickref, Open UI, Custom Elements Everywhere, MDN CSSStyleSheet and `@layer`, SemVer                     |
| Token references | Conceptually aligned with the widespread systems, vendor-agnostic: no Material 3 or Carbon dependency                              |
| Token format     | DTCG JSON as the source with an optional build, plus the decision rule for when the build is required                              |
| Token levels     | Two categories: foundations (primitive plus semantic) and components                                                               |
| Component docs   | Decided per project: static page by default, Storybook when the project already uses it, a custom internal site for larger systems |
| Component API    | Compound components, Rule of Three, no prop explosion, reuse before creating                                                       |
| Token ownership  | This skill decides the tokens; `rule-styleguide-css` owns the CSS syntax                                                           |
| A11y ownership   | `rule-styleguide-a11y` owns the checks; this skill invokes the criteria report                                                     |
| Framework truth  | Confirmed; the plan adds per-framework examples and a CSS mechanism matrix                                                         |
| Hardcoded rule   | Applies to `src/`, with a documented escape hatch                                                                                  |
| Delivery         | Plan only now                                                                                                                      |
| ADR              | Only when a decision is structural; no automatic per-skill ADR                                                                     |

## Workstream A - Tokens

1. **Two categories, foundations and components.** Foundations holds the
   primitive palette and the semantic roles (`--color-primary`), components
   holds the component-scoped tokens (`--button-bg`). Only the semantic layer
   changes for a theme, so the primitives and the components stay put.
2. **Source format.** A DTCG-conformant JSON file (`tokens.json`) is the source
   of truth when more than one platform consumes it; the CSS custom properties
   output is generated. The decision rule: the build step appears only when a
   second platform (mobile, email, native) consumes the tokens; until then the
   CSS file is the source and no tooling is added.
3. **Naming.** Semantic roles describe purpose, not appearance
   (`--color-surface`, not `--color-gray-100` at the point of use).
4. **Theming.** Dark mode and high contrast remap the semantic layer only.
5. **Contrast.** WCAG 2.2 AA is the floor, and the a11y skill owns the check.
6. **Deliverables.** `tokens.json` template, foundations and components CSS
   partials, and the naming guide.

## Workstream B - Component contract

1. **Compound components over configuration.** A component with many boolean
   variants is a design smell; compose instead.
2. **Rule of Three.** The third real occurrence earns the abstraction.
3. **No prop explosion.** Beyond a small, documented surface, split or compose.
4. **Reuse before creating.** Search the system before accepting a new local
   component.
5. **States matrix.** default, hover, focus-visible, active, disabled, loading,
   empty, error, success, and the reduced-motion variant. The plan ships the
   matrix as a table the skill can point at.
6. **Semantics stay rule-mcp.** `[data-part]`, element selectors, no classes, no
   inline styles, external CSS only.

## Workstream C - Critique process

The four passes stay, with three additions:

1. **State the exclusion per pass**, so each answer stays on one axis.
2. **Pass 1 becomes a criteria report**, referencing `rule-styleguide-a11y` and
   WCAG 2.2 criteria by number, including the criteria nothing tested.
3. **Fix one finding at a time**, in the order of the passes.

## Workstream D - Documentation artifact

A decision rule, not a mandate:

| Project shape                         | Artifact                                     |
| ------------------------------------- | -------------------------------------------- |
| Solo or small, no build pipeline      | One static `design-system.html`              |
| Project already uses Storybook        | Stories, one per component state             |
| Larger system with multiple consumers | A custom internal site generated from tokens |

The artifact must render every token and every component state, which is the
part that actually gets used.

## Workstream E - Versioning

SemVer for the token package and for component APIs: a token rename or a
removed component is a major change, a new semantic token is a minor, and a
value change that keeps the contract is a patch. Deprecations are announced one
major version ahead. The changelog is generated from the commit rule, as in the
toolchain area.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall, as in the area
plans. Trigger: CSS files, component files and templates that match the content
heuristic.

| Rule id                     | Rejects                                                                                | Tier | Source                      |
| --------------------------- | -------------------------------------------------------------------------------------- | ---- | --------------------------- |
| `ui-token-no-hardcoded`     | raw hex or spacing where a token exists, across `src/`, with a documented escape hatch | A    | DTCG; MDN custom properties |
| `ui-token-two-level`        | a component token that skips the semantic layer                                        | A    | DTCG; local article         |
| `ui-states-required`        | interactive control with no disabled, loading or error state                           | A    | ARIA APG; WCAG 2.2          |
| `ui-reduced-motion`         | animation or transition with no `prefers-reduced-motion`                               | A    | ARIA APG; WCAG 2.2          |
| `ui-no-remote-font`         | unapproved remote font dependency                                                      | B    | Project constraint          |
| `ui-reuse-system-component` | a system component reimplemented locally                                               | B    | Local article               |

Boundary: `a11y-focus-visible` in the a11y skill owns focus; `ui-states-required`
owns the rest of the state matrix. The two never check the same property.

## Assets and templates to ship

- `assets/templates/tokens.json` (DTCG end to end).
- `assets/templates/tokens.foundations.css` and `tokens.components.css`.
- `assets/templates/design-system.html`.
- `assets/templates/states-matrix.md`.
- A case-study fixture under `case-studies/` with tokens, button, form and card.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-ui` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the related guardrails.
- [x] Verify the public standards.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the `docs/plans/skills/` index.

### Phase 1 - Tokens

- [ ] Write the token guidance and the naming rules into the SKILL.md.
- [ ] Ship the DTCG template and the two CSS partials.
- [ ] Add the decision rule for when the build step appears.
- [ ] Add a token fixture to the corpus if `ui-token-two-level` ships.

### Phase 2 - Component contract

- [ ] Write the API rules (compound, Rule of Three, no prop explosion, reuse).
- [ ] Ship the states matrix.
- [ ] Add per-framework CSS mechanism examples and the matrix.

### Phase 3 - Critique and documentation

- [ ] Fold the criteria report and the exclusion line into the critique passes.
- [ ] Ship the documentation decision rule and the `design-system.html` template.

### Phase 4 - Versioning

- [ ] Write the SemVer and deprecation rules for tokens and components.

### Phase 5 - Guardrails

- [ ] Implement the six rules with the file-scoped trigger and the escape hatch.
- [ ] Add good and bad fixtures per rule and a unit test per rule.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the token model and the guardrail family, since both
      are structural decisions.

### Phase 6 - Verification

- [ ] Build the case-study fixture and confirm the matrix renders every state.
- [ ] Run the a11y criteria report on the fixture as the Pass 1 sample.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                 | Class       | Model                     | Why                            |
| ------------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions and scaffolding  | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Tokens                     | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 2 - Component contract         | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 3 - Critique and documentation | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 4 - Versioning                 | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 5 - Guardrails                 | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 6 - Verification               | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm test tests/core/self-guardrails.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- Storybook is an accepted artifact option but is not a standard anchor, so it
  appears only inside the documentation decision rule.
- The remote-font rule is Tier B because "approved" is a project decision, not
  a universal standard.
- The `ui-token-no-hardcoded` rule needs the token set to know that a value is
  replaceable; the plan reads the token file from the project, and skips the
  rule when no token file exists.
