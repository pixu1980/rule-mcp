# rule-mcp-styleguide-baseline - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan plus the vocabulary alignment, the floor section and the three corpus fixes, applied now. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, twenty-seventh skill.

## Evidence base

Read in this session:

- `skills/rule-mcp-styleguide-baseline/SKILL.md`: three states, three fallback costs,
  supports queries, the project floor, the annotation convention.
- The three skills that already annotate a feature: `rule-mcp-frontend-workers`,
  `rule-mcp-styleguide-css`, `rule-mcp-platform-web`.
- `package.json`: no `browserslist`, no browser build tool, so the floor has no
  configuration face in this repository.

Public sources verified in this session:

- MDN, Baseline compatibility glossary: widely available means support in every
  Baseline browser for at least 2.5 years; newly available means the latest
  version of every Baseline browser; limited availability means not everywhere.
- MDN lists the Baseline browser set as Chrome, Edge, Firefox and Safari, and
  names the W3C WebDX Community Group, the `web-features` repository and
  `mdn/browser-compat-data` as the sources behind the badges.
- MDN names a `deprecated` and a `deprecated to be removed` state beyond the
  three, which the skill treats as "do not use" rather than a support question.

Local articles: no dedicated piece on Baseline or browser support exists in
the local article corpus; the matches used the word in the performance
sense. Confirmed with the owner; nothing is cited from there.

Problems found:

| Problem                            | Detail                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| the standard was never named       | the three states are Baseline's states with different words                                                          |
| the corpus violated its own rule   | `rule-mcp-frontend-workers` cited a date, `rule-mcp-styleguide-css` and `rule-mcp-platform-web` made a blanket claim |
| the floor had one face             | prose only; nothing said how the build tools learn it                                                                |
| polyfills were unmentioned         | the more expensive cousin of a fallback had no decision                                                              |
| supports pitfalls were unmentioned | a declaration test is not a feature test; selectors need `selector()`                                                |
| the trade-off had no name          | progressive enhancement versus graceful degradation                                                                  |
| no way to check a state            | the skill said to verify and gave no resource                                                                        |

## Decisions

| Question   | Decision                                                                        |
| ---------- | ------------------------------------------------------------------------------- |
| Standard   | Baseline, with MDN, `web-features`, compat data and caniuse as the check path   |
| Vocabulary | Adopt Baseline's words: widely available, newly available, limited availability |
| Boundaries | This skill owns the method; css and platform-web own the features               |
| Floor      | Two faces: prose in the project instructions, `browserslist` in configuration   |
| Audit      | The three corpus violations fixed now                                           |
| Guardrails | Three advisory rules: no date, no unstated state, no blanket claim              |
| Severity   | Advisory first, promotion after 100% precision and recall                       |
| Delivery   | Plan, fixes and floor applied now; guardrails and tests planned                 |

## Workstream A - Vocabulary aligned to the standard, applied

The table now reads widely available, newly available, limited availability, and
every example uses those words. The 2.5-year window and the four-browser set are
stated, so a reader can check a claim instead of trusting it.

## Workstream B - The corpus fixes, applied

| Skill                       | Was                              | Now                                             |
| --------------------------- | -------------------------------- | ----------------------------------------------- |
| `rule-mcp-frontend-workers` | cited a date for the feature     | names the state and the 2.5-year window         |
| `rule-mcp-styleguide-css`   | claimed everything was supported | says every Baseline browser, which is checkable |
| `rule-mcp-platform-web`     | claimed everything was baseline  | says every Baseline browser, which is checkable |

## Workstream C - The floor with two faces, applied

The skill now shows the prose half and the `browserslist` half side by side,
names the tools that read the list, and says what a floor with only one face is
worth. Three project types get three floors, because the floor is a decision and
not a constant.

This repository has no browser build: the docs site is static and nothing reads
`browserslist`. Adding the field here would be configuration no tool consumes,
so the example lives in the skill and the field is left to projects that compile
browser code. The plan records this instead of inventing a consumer.

## Workstream D - The missing decisions, applied

- **Polyfill:** a fallback that ships to everyone; take it when the absent case
  is broken, the payload is measured, and the feature is on a real path.
- **Supports pitfalls:** a declaration is not a feature; selectors need
  `selector()`; at-rules have no test; the JS side asks the same question.
- **Enhancement direction:** progressive enhancement first, degradation second.
- **Where to check:** the MDN badge, the `web-features` entry, compat data,
  caniuse.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                     | Rejects                                                | Tier | Source     |
| --------------------------- | ------------------------------------------------------ | ---- | ---------- |
| `baseline-no-date`          | a support claim that cites a month and a year          | A    | This skill |
| `baseline-state-annotation` | a feature recommendation with no state in the sentence | B    | This skill |
| `baseline-vague`            | a blanket claim that names no state and no browser set | B    | This skill |

The second and third need a curated feature list and a curated phrase list, so
they start as advisory and earn their tier on the corpus.

## Verification

1. A `good` and a `bad` snippet per rule, written as prose fragments rather than
   code: this is the first guardrail family that reads Markdown.
2. A corpus scan over the skills for feature mentions from a curated list, each
   one requiring a state word in the same sentence.
3. A false-positive matrix: "dependency baseline", "baseline rate", and a rule
   name that contains the word must not count as a support claim.
4. An alignment test that pins the three state names and the 2.5-year window in a
   fixture, so a change in the public definition fails the suite instead of
   silently drifting.
5. The English rule currently reports the `com` in a domain as a non-English
   word; note it for the English plan rather than working around it here.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD)

Feeds: `rule-mcp-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the corpus and the configuration.
- [x] Verify the Baseline definitions and the browser set.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Applied now

- [x] Rewrite the states in Baseline's vocabulary, with the window and the set.
- [x] Add the check path.
- [x] Give the floor its second face and three examples.
- [x] Add the polyfill, supports and enhancement decisions.
- [x] Fix the three corpus violations.

### Phase 2 - Guardrails and verification

- [ ] Add the three rules with prose fixtures and a unit test each.
- [ ] Add the corpus scan with the curated feature list.
- [ ] Add the alignment fixture.
- [ ] Promote Tier A after the corpus gate reports 100%.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.
- [ ] Write the ADR only if the Markdown-reading guardrail family is new to the
      engine, which it is: record the decision there.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                  | Class       | Model                   | Why                            |
| ------------------------------------- | ----------- | ----------------------- | ------------------------------ |
| Phase 0 - Decisions and scaffolding   | `T1-plan`   | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Applied now                 | `T7-author` | `qwen3.8-max`           | skill bodies and references    |
| Phase 2 - Guardrails and verification | `T3-rules`  | `kimi-k2.7-code`        | small deterministic code       |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test tests/core/guardrails-precision-recall.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_content.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/docs/link-integrity.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The three state names are now the public ones; any skill that still says
  settled, recent or partial after this pass is a follow-up, and the corpus scan
  in Phase 2 is what will find them.
- The floor is documented, not configured, in this repository: there is no
  browser build to feed.
- No local article is cited; the definitions are the sources.
