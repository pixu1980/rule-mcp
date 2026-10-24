# rule-styleguide-javascript - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, seventeenth skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-javascript/SKILL.md` (903 lines): language rules,
  naming, async (a 200-line section), built-ins, loops, strings, readability,
  truthy and falsy, modern idioms, types, DOM and custom elements, JSDoc,
  Playwright and axe-core testing, scaffolding.
- `skills/rule-styleguide-javascript/guardrails/index.js`: seventeen rules, all
  about spacing, braces, const placement and JSDoc presence.
- `skills/rule-styleguide-a11y/SKILL.md` (Playwright and axe-core, with the
  `a11y-test-required` guardrail), `skills/rule-toolchain-eslint/SKILL.md`
  (the unicorn rules),
  `skills/rule-styleguide-comments/SKILL.md` and `skills/rule-devops-testing/SKILL.md`.

Public sources verified in this session:

- MDN, https://developer.mozilla.org/en-US/docs/Web/JavaScript
- Node.js documentation, https://nodejs.org/docs/latest/api/
- TC39 proposals, https://github.com/tc39/proposals
- eslint-plugin-unicorn, https://github.com/sindresorhus/eslint-plugin-unicorn
- ECMAScript, https://tc39.es/ecma262/

Local articles: `02-javascript/` holds 59 pieces, many on async, promises and
the event loop. They stay context only; the plan anchors to MDN, Node and TC39.

Problems found:

| Problem                       | Detail                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| testing duplicated            | the Playwright and axe-core section restates `rule-styleguide-a11y`, which owns `a11y-test-required` |
| idioms duplicated             | the unicorn idiom table restates `rule-toolchain-eslint`                                             |
| DOM duplicated                | the custom element section restated a skill removed in ADR 152                                       |
| JSDoc has no clear owner      | it sits here while `rule-styleguide-comments` owns comment hygiene                                   |
| 17 guardrails, all formatting | nothing checks the semantic rules a reader would expect                                              |
| missing runtime topics        | modules, error handling, iterators, `structuredClone`, `AbortController`, memory                     |

## Decisions

| Question                | Decision                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Scope                   | Runtime and language rules, plus the removal of four duplicated areas                 |
| Boundaries              | The skill owns runtime JS and language rules only                                     |
| Testing                 | Removed; linked to `rule-styleguide-a11y`                                             |
| Idioms table            | Reduced to a link to `rule-toolchain-eslint`                                          |
| DOM and custom elements | Removed; the skill it linked was itself removed in ADR 152                            |
| JSDoc                   | Moves to `rule-styleguide-comments` as part of the runtime-only boundary              |
| Missing topics          | Modules, errors, iterators, `structuredClone`, `AbortController`, memory              |
| Async                   | Expanded, and its claims verified against MDN and TC39                                |
| Semantic guardrails     | Not duplicated: the six rules map to ESLint core rules that are enabled in the config |
| Severity                | The ESLint rules are errors; the seventeen guardrails keep their current behavior     |
| Verification            | Corpus, a Vitest fixture for the async examples, a TC39 claim check                   |
| Delivery                | Plan only now                                                                         |

### Conflict resolutions

Two answers crossed again, and the more specific one wins:

1. **JSDoc.** The scope included it and the boundary says runtime only. The
   boundary wins: JSDoc moves to `rule-styleguide-comments`, and this skill links
   it.
2. **Semantic guardrails.** Six rules were selected, then the next answer said
   ESLint owns them and the guardrails stay on what ESLint does not see. The
   second wins: no new guardrails. `no-var`, `no-with`, `no-eval`,
   `no-new-wrappers`, `prefer-rest-params` and `no-extend-native` are ESLint
   core rules and must be enabled as errors in `rule-toolchain-eslint`.

## Workstream A - Remove the duplication

1. The Playwright and axe-core section goes; `rule-styleguide-a11y` owns the
   tests and the `a11y-test-required` guardrail.
2. The unicorn idiom table becomes one sentence and a link to
   `rule-toolchain-eslint`, which owns the rules and their tuning.
3. The DOM and custom element section becomes a link to
   the custom element and reactive-vanilla skills, both removed in ADR 152.
4. JSDoc moves to `rule-styleguide-comments`, which already owns comment
   hygiene; this skill keeps only the one-line rule that exported symbols are
   documented.

## Workstream B - Runtime content

1. **Async** stays the center of the skill and is expanded: what `await` waits
   for, the mistakes that produce strange bugs, the promise combinators, stale
   responses, and streaming instead of collecting.
2. **Modules**: ESM as the default, the boundary with CommonJS, `import.meta`,
   dynamic import, and the file extension rules.
3. **Errors**: error classes, `cause`, what to wrap and what to rethrow, and the
   difference between an expected failure and a bug.
4. **Iterators and generators**: lazy sequences, `for await`, and when a
   generator beats an array.
5. **Copies**: `structuredClone` replaces the JSON round-trip, with the cases it
   does not handle (functions, class instances).
6. **Cancellation**: `AbortController` and `AbortSignal` through fetch, timers
   and async loops.
7. **Memory**: `WeakMap`, `WeakRef`, the leak patterns (listeners, caches,
   closures) and how to find them.

## Workstream C - Language rules

The existing rules on strict mode, dangerous features, functions, classes,
control flow and truthiness are verified against MDN and the ECMAScript
specification, and every proposal mentioned is checked against its TC39 stage
before it is recommended.

## Workstream D - Guardrails

The seventeen formatting guardrails stay. The semantic rules are not copied
here: the six ESLint core rules named above are enabled in
`rule-toolchain-eslint` as errors, and this skill states the mapping once.

## Verification

1. A `good` and a `bad` snippet per guardrail in the corpus.
2. A Vitest fixture that runs the async examples and asserts their outcomes.
3. A check that each TC39 proposal named in the skill still has its stated
   stage, so a finished proposal is not presented as future work.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the four duplicated areas.
- [x] Verify the standards and the current TC39 stages.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Remove the duplication

- [ ] Remove the testing section and link `rule-styleguide-a11y`.
- [ ] Reduce the idiom table to a link.
- [ ] Remove the DOM and custom element section and link the owners.
- [ ] Move JSDoc to `rule-styleguide-comments` and leave the one-line rule.

### Phase 2 - Content

- [ ] Expand the async section and verify its claims.
- [ ] Add modules, errors, iterators, `structuredClone`, `AbortController` and
      memory.
- [ ] Verify the language rules against MDN and ECMAScript.

### Phase 3 - Guardrails and verification

- [ ] Confirm the seventeen formatting guardrails still hold.
- [ ] Enable the six ESLint core rules as errors in `rule-toolchain-eslint`.
- [ ] Add the Vitest fixture for the async examples.
- [ ] Add the TC39 stage check.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                  | Class       | Model                   | Why                            |
| ------------------------------------- | ----------- | ----------------------- | ------------------------------ |
| Phase 0 - Decisions and scaffolding   | `T1-plan`   | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Remove the duplication      | `T7-author` | `qwen3.8-max`           | skill bodies and references    |
| Phase 2 - Content                     | `T7-author` | `qwen3.8-max`           | skill bodies and references    |
| Phase 3 - Guardrails and verification | `T3-rules`  | `kimi-k2.7-code`        | small deterministic code       |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The JSDoc move is an inference from the runtime-only boundary; the
  `rule-styleguide-comments` plan receives it when its turn comes.
- The six semantic rules are documented here but owned by ESLint; this keeps
  the repository's rule that a rule has one home.
- No local article is cited; MDN, Node and TC39 are the sources.
