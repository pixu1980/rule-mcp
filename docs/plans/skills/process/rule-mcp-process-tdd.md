# rule-process-tdd - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: process. Order: reverse alphabetical, thirtieth skill, and the first of
the process area.

## Evidence base

Read in this session:

- `skills/rule-process-tdd/SKILL.md`: 112 lines. Six numbered sections (red,
  green, refactor, what to cover, accessibility tests, close the loop), then a
  merged legacy block from line 77 to the end. The block is 36 lines, 32% of the
  file, and carries a second `<h1>` at line 79.
- `skills/rule-devops-testing/SKILL.md`: 366 lines. Owns the runner, the mocking,
  the coverage gates and the cost of a flaky test. The same threshold table
  (60/50/60/60) sits at line 288, the same Expo exception at line 38, and the
  same "Vitest is the runner, and the only one" rule at line 35.
- `skills/rule-process/SKILL.md`: 57 lines, the area router. It has 10 table rows
  and 7 quick-selection entries, and `rule-process-tdd` is in neither.
- `skills/rule-process-simplicity/SKILL.md`: the sibling that already owns a
  guardrail family (three rules), and the model for what a process-area rule
  looks like.
- `skills/rule-process-readme/SKILL.md` and
  `docs/plans/skills/process/rule-process-readme.md`: the sibling plan, for the
  shape of this one.
- `skills/rule-styleguide-a11y/SKILL.md` (598 lines) and
  `skills/rule-styleguide-a11y/guardrails/`: 10 rules, among them
  `a11y-test-required`, which already requires Playwright plus
  `@axe-core/playwright` in `tests/a11y/`.
- `src/core/scaffold/_template-data.data.js`: the templates the skill points at
  are `playwright-config` (line 83), `a11y-test-basic` (113),
  `a11y-test-forms` (162) and `a11y-test-components`. The skill names the last
  one `components`.
- `src/core/skills/__tests__/_corpus.test.mjs`: enforces one frontmatter, one
  `## See also`, resolvable relative links and a list of removed skill names.
- `src/core/skills/__tests__/_content.test.mjs`: where a per-skill
  required-content assertion would go.
- `skills/rule-platform-library/SKILL.md` (line 31: "node:test or Vitest,
  minimum 80% coverage") and `skills/rule-backend-node/SKILL.md` (line 386:
  "`node:test` replaces a runner for most projects"). These are the two children
  that contradict the Vitest-only rule today.

Public sources verified in this session:

- Vitest 5.0.5, coverage configuration: `coverage.thresholds` reads a positive
  number as the minimum percentage and a negative number as the maximum number
  of uncovered items, and it offers `perFile`, glob-pattern thresholds,
  `autoUpdate` and `100: true`. The skill names none of them. The config
  reference also carries `allowOnly`, which refuses a committed `.only`.
- Playwright, Accessibility testing: the canonical assertion is
  `expect(accessibilityScanResults.violations).toEqual([])`, and the page opens
  with the disclaimer that automated checks cannot replace manual assessment.
- `@axe-core/playwright`: the chainable `AxeBuilder` (`analyze`, `include`,
  `exclude`, `withTags`, `withRules`, `disableRules`, `options`).
- Testing Library, guiding principles: "the more your tests resemble the way
  your software is used, the more confidence they can give you".
- Martin Fowler, The Practical Test Pyramid: solitary versus sociable unit
  tests, test the observable behavior and not the internal structure, and do
  not test trivial code to reach a coverage number. It also warns that a test
  bound to the production structure breaks on every refactor, which costs the
  safety net that made it worth writing.
- Kent Beck, Test Desiderata: twelve properties, of which some support each
  other and some interfere. Prediction costs speed; composability can buy both.

Local articles: nothing in the corpus is about testing.
The tree holds 13 area folders and a single `_indice/README.md`, and there is no
match for TDD, Vitest, Playwright or test strategy, so nothing is cited from
there.

Problems found:

| Problem                                | Detail                                                                                                                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the merged block duplicated            | lines 77-112 repeat the Vitest-only rule, the Expo exception and the 60/50/60/60 table that `rule-devops-testing` (line 288) and `rule-toolchain-vite` also state, and it adds a second `<h1>`                        |
| three references point at nothing      | "Use `testing` skill", "`coverage-gates` skill" and "See `expo` rule" name a skill, a skill and a rule that do not exist                                                                                              |
| the runner rule contradicts the corpus | this skill and `rule-devops-testing` say Vitest is the only framework, `rule-platform-library` allows `node:test`, `rule-backend-node` calls it the default for most projects, and this repository runs `node --test` |
| a template is named wrong              | the skill lists `components`; the catalog key is `a11y-test-components`                                                                                                                                               |
| the router cannot route to the skill   | `rule-process` is 10 rows and 7 quick-selection entries, and tdd is in neither, so the area index never reaches it                                                                                                    |
| the a11y mandate is owned twice        | section 5 states the Playwright plus axe-core requirement that `rule-styleguide-a11y` owns through `a11y-test-required`, and `rule-styleguide-javascript` repeats it again                                            |

## Decisions

| Question     | Decision                                                                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope        | The discipline and the test design stay; the tooling leaves. Vitest, mocking and coverage gates belong to `rule-devops-testing`, the a11y matrix to `rule-styleguide-a11y` |
| Merged block | Deleted. The two dangling skill references become a link to `rule-devops-testing`                                                                                          |
| Runner       | `node:test` is admitted as a first-class runner outside Vite; Vitest stays the default for Vite and frontend projects, Jest stays the Expo exception                       |
| Router       | `rule-process-tdd` joins the table and the quick selection guide, with a coverage test that fails when a child is missing                                                  |
| Test layers  | The pyramid stays the default shape, plus the twelve Test Desiderata properties and what each trades against                                                               |
| Coverage     | The thresholds are `rule-devops-testing` property. This skill states that a threshold is a floor and not evidence, and points at the owner                                 |
| Guardrails   | Four advisory rules: no assertionless test, no committed `.only`, no tautological assertion, no mocked subject                                                             |
| Delivery     | Plan only now                                                                                                                                                              |

## Workstream A - The discipline stays, the tooling leaves

The skill becomes the discipline and the neighbors keep the machinery. The
sections that survive, rewritten where the evidence demands it:

1. **Purpose**: what TDD buys (a design tool that makes the test the first
   consumer of the interface) and what it does not (a suite is a net, not a
   proof).
2. **Red, green, refactor**, kept in the imperative, with the false-green
   warning that already reads well.
3. **What to cover**: the pyramid as the default shape, then the twelve
   properties in Workstream E.
4. **Assertions**: the observable contract, one behavior per test, and the
   assertion that would have caught the last bug. Fowler's warning is stated
   once: a test bound to the structure breaks on every refactor and stops being
   a safety net.
5. **Flakiness**: hunt the race. A retry that hides a flake is a red build
   dressed as green.
6. **Close the loop**: report the command that ran and its real result, validate
   the test code with `rule_tool_check`, then propose the scoped commit.

A boundary table closes the section, so the reader knows where to go next:

| Question                                           | Owner                                      |
| -------------------------------------------------- | ------------------------------------------ |
| Which runner, config, mocking                      | `rule-devops-testing`                      |
| Coverage thresholds and the CI gate                | `rule-devops-testing`                      |
| What to cover and how to name the test             | this skill                                 |
| a11y criteria, tools and the Playwright spec shape | `rule-styleguide-a11y`                     |
| E2E journeys that protect the product              | `rule-devops-testing`, `rule-process-bmad` |

## Workstream B - The merged legacy block

The block that begins at `## Conventions (rules -> skills merge)` is deleted.
What is in it goes to exactly one place each:

- **Mandatory constraints** (Vitest only, the Expo exception, the thresholds
  table): already in `rule-devops-testing`, which is linked instead of copied.
- **Required conventions** (`*.test.ts` naming, the package-level `tests/`
  directory, CI failing below the thresholds): also `rule-devops-testing`.
- **Implementation reference** ("Use `testing` skill", "`coverage-gates`
  skill"): two dangling names replaced by the single link to
  `rule-devops-testing`.

Nothing in the block is unique to this skill, so nothing is moved back into the
body.

## Workstream C - The runner contradiction

The rule becomes one sentence with a default and a stated exception:

- **Vitest is the default** for Vite and frontend projects, and the only runner
  a new project should adopt.
- **`node:test` is admitted** when the project already runs on the Node test
  runner: libraries, CLIs and Node services. The same naming, the same
  package-level `tests/` directory and the same thresholds apply, run with
  `node --test`.
- **Jest stays the Expo and React Native exception**, because the native module
  layer does not run under Vitest.

This repository is the live example of the admitted case: `pnpm test` runs
`node --test` through `scripts/alias-hook.mjs`, so the rule has a citable case
instead of an abstract one.

The companion edit in `skills/rule-devops-testing/SKILL.md` carries the same
three bullets, because that file states the old rule first. It is recorded here
and listed as a step, since `rule-devops-testing` has no plan of its own yet.

## Workstream D - The router row and the coverage test

1. `skills/rule-process/SKILL.md` gains one row for `rule-process-tdd` in the
   table and one line in the quick selection guide.
2. A `router-child-coverage` test compares the router's links with the
   directories whose name begins with `rule-process-`, so the next process child
   fails the suite until it is listed.

The same test is proposed by the `rule-styleguide` plan for its own area; if both
land, the shared helper should live in one place rather than twice.

## Workstream E - The twelve properties

The pyramid says what shape the suite has. The properties say what makes an
individual test worth keeping, and Beck states them without a numeric order, so
the table keeps his order and names the trade instead of inventing a rank.

| Property              | What it buys                                     | What it costs, or meets                 |
| --------------------- | ------------------------------------------------ | --------------------------------------- |
| Isolated              | the same result whatever the order               | setup discipline                        |
| Composable            | one dimension of variability at a time           | more, smaller tests                     |
| Deterministic         | a result that changes only when the code changes | control of time, randomness and network |
| Fast                  | a suite you actually run                         | prediction                              |
| Writable              | a test cheaper than the code it covers           | depth                                   |
| Readable              | a reader sees why the test exists                | brevity                                 |
| Behavioral            | the result follows the behavior                  | structure coupling                      |
| Structure-insensitive | refactoring does not break it                    | the temptation to assert on internals   |
| Automated             | it runs without a human                          | an initial harness                      |
| Specific              | a failure names its cause                        | strictness                              |
| Predictive            | passing means shippable                          | speed                                   |
| Inspiring             | passing builds confidence                        | the others, jointly                     |

Two relations from the source are stated explicitly, because they are the point:
automating makes tests faster, and prediction makes them slower. Composability
is the one that buys both, which is why the pyramid keeps the many small tests
and the few honest end-to-end ones.

## Workstream F - Accessibility by reference

Section 5 keeps only the part this skill owns: an accessibility assertion is
still an assertion, written before the fix, and the manual keyboard path is the
test automation cannot write. Everything about tooling becomes a link:
`rule-styleguide-a11y` for the criteria and the tool matrix, and
`a11y-test-required` for the Playwright plus `@axe-core/playwright` requirement.

The template names are corrected in the same pass: `a11y-test-basic`,
`a11y-test-forms`, `a11y-test-components` and `playwright-config`, read through
the `rule://templates` resource and `rule://a11y`.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall on the corpus.

| Rule id                      | Rejects                                                      | Tier | Source                                                              |
| ---------------------------- | ------------------------------------------------------------ | ---- | ------------------------------------------------------------------- |
| `tdd-no-focused-test`        | a committed `.only` on a test or a describe block            | A    | Vitest config (`allowOnly`)                                         |
| `tdd-no-assertionless-test`  | a test body with no assertion at all                         | A    | Test Desiderata (Behavioral, Specific)                              |
| `tdd-no-tautological-assert` | an assertion on a literal, such as `expect(true).toBe(true)` | B    | Test Desiderata (Behavioral, Predictive)                            |
| `tdd-no-mocked-subject`      | a test that stubs the unit it claims to test                 | B    | The Practical Test Pyramid; Test Desiderata (Structure-insensitive) |

The corpus carries a `good` and a `bad` fixture per rule, plus the false
positives that matter: `assert.rejects`, `toMatchSnapshot` and an awaited
expectation are assertions; a `.only` inside a string or a comment is not a
focused test.

## Assets and templates to ship

None. The four templates already exist in the scaffold catalog and only the name
`components` needs correcting, so this plan ships no new asset.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD), `rule-platform-mobile#2` (CONTRACT)

Feeds: `rule-process` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Evaluation and decisions

- [x] Audit the skill, the neighbors, the router and the guardrails.
- [x] Verify the runner, the Playwright and axe-core APIs, the coverage options
      and the local article corpus.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Delete the merged legacy block and restore a single `<h1>`.
- [ ] Repoint the three dangling references.
- [ ] Write the boundary table between this skill and its neighbors.
- [ ] Write the twelve-properties section.
- [ ] Replace the a11y tooling with the reference and correct the template name.

### Phase 2 - Router and runner

- [ ] Add the row and the quick-selection entry to `rule-process/SKILL.md`.
- [ ] Add the router coverage test.
- [ ] State the `node:test` admission here, and carry the companion edit in
      `rule-devops-testing`.
- [ ] Extend the required-content assertion in `_content.test.mjs`.

### Phase 3 - Guardrails

- [ ] Implement the four rules with fixtures and a unit test each.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.
- [ ] Write the ADR if the runner rule or the rule family turns out to be
      structural.

### Phase 4 - Verification

- [ ] Run the gates below.
- [ ] Check every relative link and every command in the skill.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                               | Class       | Model                     | Why                            |
| ---------------------------------- | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Evaluation and decisions | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Content                  | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 2 - Router and runner        | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 3 - Guardrails               | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 4 - Verification             | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_content.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/guardrails/__tests__/_false-positives.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/docs/link-integrity.test.mjs
pnpm census
pnpm lint
pnpm test
```

## Open notes

- The twelve properties have no rank in the source. Beck states the oppositions
  and says some properties support each other, so the table keeps his order and
  names the trade rather than asserting an order he does not.
- `rule-devops-testing` has no per-skill plan yet (index entry 61), so the
  companion runner edit is recorded here and must be carried when that plan is
  written.
- The 60/50/60/60 table is stated in three places: `rule-devops-testing` (line
  288), `rule-toolchain-vite`, and this skill. Workstream B takes it from three
  to two; the last copy is the `rule-toolchain-vite` plan's business.
- After Workstream F this skill contains no tool instruction at all, which is
  the point: one owner per rule, and the reader is sent to it.
