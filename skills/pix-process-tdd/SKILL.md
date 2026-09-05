---
name: rule-process-tdd
description: >-
  Use when developing test-first (red-green-refactor) or when writing tests: unit tests via TDD,
  accessibility tests with Playwright + axe-core, or test setup for a project. Covers failing-test-first
  discipline, choosing what to cover, assertion quality, and closing the loop with rule_tool_check.
tags:
  - process
  - tdd
  - testing
  - a11y
  - quality
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# Test-Driven Development and Test Writing

Tests protect behavior; TDD is the discipline that makes the test a design tool and not just a
net. This skill covers both halves: writing failing tests before implementation (TDD), and writing
automated coverage for a11y and project infrastructure.

## 1. Red — write a failing test first

- Write the test that asserts the behavior you want BEFORE the implementation exists.
- Name the test after the behavior, not the method: `does not charge shipping over 50 euros`.
- Assert the observable contract, not the internal steps. One behavior per test.
- Run the test and confirm it FAILS for the reason you expect (the feature is missing), never
  because the assertion itself is broken.
- If no test can fail yet, the behavior is not testable at this boundary: restructure.

## 2. Green — make it pass in the shortest honest way

- Implement only what the failing test requires. No speculative generality.
- Re-run the whole focused suite: the new test and every test that could regress.
- A test that passes for the wrong reason (no assertion, always-true condition, mocked too widely)
  is a false green: it is worse than no test, because it is read as coverage.

## 3. Refactor — keep it green while cleaning it

- Refactor under the running suite; every intermediate state stays green.
- Remove duplication, rename for intent, extract helpers with a single responsibility.
- Your refactor is safe only as far as the suite reaches: if a corner is uncovered, write the
  test that would have caught the change before refactoring it.

## 4. Choose what to cover

- Follow the test pyramid: many fast unit tests, fewer integration tests, the fewest end-to-end.
- Cover the behavior that matters (the assertion that would have caught the last bug), not line
  counts. 100% line coverage of meaningless branches is decoration.
- Test the boundary conditions: empty input, max size, overflow, duplicates, races, failure paths.
- When a test is flaky, hunt the race behind it — a flaky test undermines every result it reports.

## 5. Accessibility tests

- a11y surface: add Playwright + `@axe-core/playwright` specs under `tests/a11y/`:
  - `_basic.spec.js` — page structure and semantics
  - `_forms.spec.js` — form labels, errors, focus
  - `_components.spec.js` — component-level a11y
  - `playwright.config.js` — the runner wiring
- Use AxeBuilder from `@axe-core/playwright` and assert `expect(results.violations).toEqual([])`.
- Automated axe cannot see everything: pair it with a manual keyboard path through each
  interaction after the suite is green.

## 6. Close the loop

- Run the tests and report the real outcome: the command you executed and its result. Never claim
  unexecuted checks passed.
- Validate the test code itself with `rule_tool_check` and iterate until the guardrails pass.
- For component templates use `rule_tool_component` (component=a11y-test-basic / a11y-test-forms /
  components, playwright-config).
- Finish by proposing a conventional commit with a mandatory scope, e.g. `test(<scope>): add ...`.