# rule-mcp-ui - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: ui. Order: reverse alphabetical, second skill.

## Evidence base

Read in this session:

- `skills/rule-mcp-ui/SKILL.md` (74 lines): routing contract with six intents, a
  six-step required workflow, nine non-negotiable UI constraints, an
  architecture checklist, four links.
- `skills/rule-mcp-ui-design-system/SKILL.md` (guidance owner for visual design).
- `skills/rule-mcp-frontend/SKILL.md` (the sibling router pattern: tables by
  category, cross-cutting section, "when the framework is over-engineering").
- `skills/rule-mcp-styleguide-css`, `-html`, `-a11y`, `-naming` guardrail ids, which
  own the constraints `rule-mcp-ui` currently restates.

Public standards verified in this session:

- WCAG 2.2 and Quickref, https://www.w3.org/TR/WCAG22/ and https://www.w3.org/WAI/WCAG22/quickref/
- ARIA Authoring Practices Guide, https://www.w3.org/WAI/ARIA/apg/
- W3C Design Tokens Format Module 2025.10, https://tr.designtokens.org/format/
- Open UI, https://open-ui.org/
- Custom Elements Everywhere, https://custom-elements-everywhere.com/
- MDN, `<dialog>` and Popover, https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog

Local articles available as supporting reading (no numeric claims enter the
skill):

- `04-frontend/stop-using-divs-for-everything-semantic-html-actually-matters.md`
- `04-frontend/html-dialog-element-you-don-t-need-a-modal-library-anymore.md`
- `04-frontend/web-accessibility-in-5-steps-the-basics-every-dev-keeps-ignoring.md`

## Decisions

| Question          | Decision                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Role              | Router plus the shared guardrails of the UI area                                               |
| Routing table     | Generated from the skill registry, so it cannot drift                                          |
| Constraints       | The styleguides own them; `rule-mcp-ui` indexes them and stops restating them                  |
| Standards         | WCAG 2.2, ARIA APG, DTCG, Open UI, Custom Elements Everywhere, MDN                             |
| Routing quality   | Explicit "use when" description and tags, a decision tree, `rule_tool_detect`, prompt examples |
| Reach             | Broad, with a "See also" to the meta area without duplicating its tables                       |
| Verification      | Links resolve, every UI-bearing child is reachable, no rule duplication                        |
| Guardrails        | The four router-integrity rules below                                                          |
| Guardrail trigger | The SKILL.md and the generated index                                                           |
| Assets            | Decision tree template, registry-backed table generator, repository tests                      |
| Delivery          | Plan only now                                                                                  |
| ADR               | Only when a decision is structural                                                             |

## Workstream A - Route everything, own nothing

1. **`rule-mcp-ui` owns router integrity, not content.** The nine constraints it
   restates today become an index of links: each points at the owning skill
   (`rule-mcp-styleguide-css`, `-html`, `-a11y`, `-naming`, `rule-mcp-ui-design-system`).
   A rule lives in one place.
2. **Own the shared guardrails.** The four router-integrity rules below are
   owned by `rule-mcp-ui` and inherited by any skill that declares
   `inherits: [rule-mcp-ui]`. No content rule moves here.
3. **Broad reach.** The routing contract covers the design system, the frontend
   frameworks, the meta-frameworks under "See also" (their tables stay in
   `rule-mcp-frontend` and `rule-mcp-meta`), the UI styleguides and `rule-mcp-platform-web`.

## Workstream B - Generated routing table

1. A generator reads the skill registry and the area map, then writes the
   routing table between census markers in the SKILL.md, the way the numbered
   docs are generated today.
2. The table carries, per skill: intent, primary skill, required companions,
   and the standard the skill anchors to.
3. The generator runs in `prebuild` next to `pnpm census`, so a new UI-bearing
   skill cannot be forgotten.

## Workstream C - Unambiguous routing

1. **Description and tags.** The frontmatter description states the "use when"
   case first and keeps the UI vocabulary the search index keys on.
2. **Decision tree.** A short ordered path from the request to the skill, one
   screen, in the same shape as the area quick-selection guides.
3. **`rule_tool_detect`.** When the framework is not stated, the router asks the
   project instead of guessing.
4. **Prompt examples.** A small table of real requests mapped to the skill that
   answers them.

## Workstream D - Standards the router normalizes

The router cites the standard, it does not restate it:

| Standard                               | Owner of the rule                                   |
| -------------------------------------- | --------------------------------------------------- |
| WCAG 2.2 and ARIA APG                  | `rule-mcp-styleguide-a11y`                          |
| W3C DTCG Design Tokens                 | `rule-mcp-ui-design-system`                         |
| Open UI and Custom Elements Everywhere | removed with ADR 152: neither skill exists any more |
| MDN, `<dialog>` and Popover            | `rule-mcp-styleguide-html`                          |

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall, as in the area
plans. These read markdown, not code, which is a new shape for the engine and is
called out in the phases.

| Rule id                    | Rejects                                                   | Tier | Source                 |
| -------------------------- | --------------------------------------------------------- | ---- | ---------------------- |
| `ui-router-link-resolves`  | a relative `../<skill>/SKILL.md` link that does not exist | A    | Repository contract    |
| `ui-router-child-coverage` | a UI-bearing skill that the routing table does not reach  | A    | Skill registry         |
| `ui-router-no-dup-rules`   | a constraint restated from an owning skill                | B    | Single source of truth |
| `ui-router-use-when`       | a frontmatter description with no "use when" case         | B    | Search index quality   |

Trigger: the SKILL.md plus the generated index block. `ui-router-child-coverage`
reads the area map from the skill registry, so it needs the registry in the
check context; if that is not available, the rule ships as a repository test
instead.

## Assets and templates to ship

- `assets/templates/routing-decision-tree.md`.
- `scripts/reports/routing-table/index.mjs` (registry-backed generator).
- `tests/docs/router-integrity.test.mjs` (links, coverage, duplication).

## Phases

## Dependency graph

The router closes after its leaves and after the shared router rules and the route-table generator are exported.

Depends on: `rule-mcp-ui-design-system` (HARD), `rule-mcp-process#2` (CONTRACT), `rule-mcp-process#3` (CONTRACT)

Feeds:,

Shared files: skills/rule/SKILL.md, scripts/data/router-gaps.data.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the router and the sibling routers.
- [x] Verify the public standards.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Replace the nine restated constraints with the index of owners.
- [ ] Write the decision tree, the `rule_tool_detect` step and the prompt
      examples.
- [ ] Rewrite the frontmatter description around "use when".
- [ ] Add the "See also" to the meta area without copying its tables.

### Phase 2 - Generated table

- [ ] Write the routing-table generator and wire it into `prebuild`.
- [ ] Add the census markers around the table.
- [ ] Confirm `pnpm census` and the docs tests stay green.

### Phase 3 - Guardrails and tests

- [ ] Implement `ui-router-link-resolves` and `ui-router-child-coverage`.
- [ ] Implement `ui-router-no-dup-rules` and `ui-router-use-when` as Tier B.
- [ ] Add the repository integrity test as the fallback when the registry is
      not in the check context.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the generated router table and the router-integrity
      guardrail family, since the generated surface is a structural decision.

### Phase 4 - Verification

- [ ] Add a UI-bearing skill in a fixture and confirm coverage fires.
- [ ] Break a relative link in a fixture and confirm the rule fires.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                | Class       | Model                     | Why                            |
| ----------------------------------- | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions and scaffolding | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Content                   | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 2 - Generated table           | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 3 - Guardrails and tests      | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 4 - Verification              | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/docs/router-integrity.test.mjs
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- Markdown guardrails are new: the engine currently checks code. The four rules
  can live as repository tests first and move into the engine once the check
  context exposes the skill registry.
- The routing table generator must read the same area map the census uses, so
  "UI-bearing" has exactly one definition.
