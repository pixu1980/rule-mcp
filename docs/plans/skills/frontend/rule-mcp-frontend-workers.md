# rule-mcp-frontend-workers - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#47`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: frontend, leaf. Sibling plans: the rest of the frontend area, planned in
the same series; the served-references surface this plan needs comes from
`rule-mcp-platform-desktop`.

## Scope decisions (owner)

Inherited from the platform and meta interviews, 2026-10-21:

| Question           | Decision                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scope of this pass | **Plan only**                                                                                                                                                      |
| Identity           | Thin body plus served references: the mental model, the protocol and the anti-patterns stay; `patterns.md` and the examples move into `references/` and get served |
| Examples           | The runnable reference implementation stays, and it becomes **checked**: lint scope, guardrails, and the suite that runs it                                        |
| Shared owners      | `rule-mcp-platform-web` owns the budget numbers; `rule-mcp-styleguide-javascript` owns the code conventions; `rule-mcp-devops-testing` owns the runner             |
| Reach              | Fixed here: the dispatcher row the skill never got                                                                                                                 |
| Rule set           | Six rules, all Tier B (advisory)                                                                                                                                   |
| Detection          | Both: section and table parsing, plus injected `fileList`                                                                                                          |
| Fixtures           | Shared corpus pairs plus skill trees on disk                                                                                                                       |
| Flow               | Failing test first                                                                                                                                                 |
| Gates              | Skill suite, corpora, catalog clean, census, lint and typecheck, plus the two example checks this plan introduces                                                  |
| Commits            | One per phase                                                                                                                                                      |
| ADR                | Two for the whole area: the frontend family shape, the rule design                                                                                                 |
| Done               | The examples pass what the skill teaches and the rules pass                                                                                                        |

## Evidence base (measured 2026-10-21)

`skills/rule-mcp-frontend-workers/SKILL.md` is **564 lines**, 25 sections, with a
companion `patterns.md` (247 lines) at the skill root and 13 files under
`examples/`. No `guardrails/`, no `references/`.

### The advertised reference implementation is unchecked

The SKILL.md opens with "Runnable reference implementation:
[examples/src/workers/index.js]" and "Protocol and anti-pattern details:
[patterns.md]". Measured state of both:

| Check                        | State                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Served by a tool or resource | **no**: `serveResource` reads `SKILL.md`, `readSkill()` reads one file. `patterns.md` and all 13 example files are unreachable through the rule-mcp surface |
| Linted                       | **no**: `pnpm lint` covers `bin/ src/ tests/`, not `skills/`                                                                                                |
| Guardrails                   | **no**: the self-guardrails test scans `src/` only                                                                                                          |
| Its own test run             | **no**: `skills/**/tests/*.test.js` is the glob that would catch it, and `examples/src/tasks/_parse-csv.test.js` is excluded by name                        |
| The suite that would run it  | the `skills` suite is **not part of `all`**, and nothing invokes it: CI runs `quick` and the coverage step over `all`                                       |

Running the catalog's own guardrails over the 12 example JS files:

```
examples/src/workers/_pool-internal.js  -> jsdoc-required
examples/src/workers/_task-envelope.js  -> js-blank-lines-blocks
examples/src/workers/_worker-pool.js    -> jsdoc-required
files: 12, failing: 3
```

So a quarter of the reference implementation fails rules this catalog teaches,
and no gate can see it. Catalog-wide the same blind spot covers **79 example JS
files** and **10 skill-local test files**.

### Reach

| Door                            | State                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `rule-mcp-frontend` area router | listed, with a Quick Selection line                                                                                                    |
| `rule-mcp` dispatcher           | **missing**: zero occurrences                                                                                                          |
| Inbound links                   | 5 links across 4 skills: `rule-mcp-backend-workers`, `rule-mcp-frontend`, `rule-mcp-platform-desktop`, `rule-mcp-platform-web` (twice) |

### What is genuinely unique here

No other skill owns browser workers: `rule-mcp-platform-web` links here for
"worker-pool libraries", `rule-mcp-backend-workers` owns the server-side counterpart
and links here for the browser side. The INP and LoAF measurement technique is
also unique. The budget numbers are not: `rule-mcp-platform-web` owns the table.

## Target shape

The body keeps: when to activate, the mental model, diagnose-before-offloading,
the core rules, the message protocol, worker pools, transferables,
`OffscreenCanvas`, when a worker is wrong, measurement, framework integration,
security, anti-patterns, and pointers. Around 200 lines.

`references/` receives:

| Reference          | From today                                                    |
| ------------------ | ------------------------------------------------------------- |
| `patterns.md`      | moved as-is (247 lines)                                       |
| `examples/`        | moved as-is (13 files), then served and checked               |
| `diagnose.md`      | the diagnosis section, expanded with the measurement workflow |
| `anti-patterns.md` | the anti-pattern catalog and the "wrong tool" section         |

## The six rules

| id                                    | Rejects                                                                      | Reads                       | Tier | Today                                |
| ------------------------------------- | ---------------------------------------------------------------------------- | --------------------------- | ---- | ------------------------------------ |
| `workers-examples-pass-guardrails`    | Shipped example code that fails the catalog's own rules                      | `code` + `context.fileList` | B    | **red**: 3 of 12 files               |
| `workers-aux-served`                  | A companion file or example no surface reaches and the body does not declare | `context.fileList`          | B    | **red**: `patterns.md` plus 13 files |
| `workers-listed-in-dispatcher`        | A frontend leaf with no dispatcher row                                       | `code`                      | B    | **red**: zero occurrences            |
| `workers-no-duplicate-budget-numbers` | INP, LoAF or LCP numbers restated outside the budget owner                   | `code`                      | B    | clean today                          |
| `workers-owner-named`                 | A delegated section naming no owner                                          | `code`                      | B    | partially red                        |
| `workers-no-stale-skill-id`           | A `rule-mcp-...` id with no skill directory                                  | `code` + `context.fileList` | B    | clean                                |

## Phase 0 - Decisions

- [ ] ADR (area): the frontend family shape. Framework leaves own the component
      model; cross-framework concerns (workers, custom elements, template
      engine) own their subject and nothing else; budgets stay in
      `rule-mcp-platform-web`.
- [ ] ADR (area): the rule design, Tier B, dual detection, and the
      example-code rule this leaf motivated.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/frontend-workers/`: `clean/`, `example-fails-guardrail/`,
      `unserved-aux/`, `dispatcher-unlisted/`, `duplicate-budget/`, each with a
      one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-mcp-frontend-workers`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-mcp-frontend-workers/guardrails/`: six rule files plus
      `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Check the examples

- [ ] Add `skills/**/examples/**/*.js` to a lint scope, or to a dedicated
      example-lint script the `skills` suite runs.
- [ ] Fix the three failing files: `jsdoc-required` twice,
      `js-blank-lines-blocks` once.
- [ ] Decide the fate of the two exclusions in
      `scripts/ci/run-tests/_suites.data.mjs`: `demo.test.js` is a Playwright
      spec and stays out; `_parse-csv.test.js` is a vitest example and stays
      out, but its exclusion gets a comment pointing at this plan.
- [ ] Wire the `skills` suite into `all`, so skill-local tests and example
      checks run in CI. This is the item with the widest blast radius in the
      plan and the reason it carries an ADR line.

## Phase 4 - Split and serve

- [ ] Move `patterns.md` and `examples/` under `references/`; add the two new
      references.
- [ ] Body trimmed to the model plus pointers; `See also` keeps its ten
      entries, which are already correct.
- [ ] Consume the served-references surface from `rule-mcp-platform-desktop`; if it
      is dropped, declare the files in the body instead.

## Phase 5 - Open the door

- [ ] Dispatcher row for `rule-mcp-frontend-workers`.
- [ ] Keep the `rule-mcp-frontend` area row and Quick Selection line as they are.

## Phase 6 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-frontend-workers/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Example checks: lint and guardrails over `skills/**/examples/**`.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Check the examples   | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |
| Phase 4 - Split and serve      | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 5 - Open the door        | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 6 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T5-bulk` - `minimax-m3.1-flash`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-mcp-frontend-workers/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD), `rule-mcp-platform-desktop#3` (CONTRACT)

Feeds: `rule-mcp-frontend` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- The unchecked-examples finding is bigger than this skill: 79 example JS files
  and 10 skill-local test files sit outside every gate. This plan fixes the
  workers ones and wires the suite; the other six skills with `examples/` or
  `assets/` trees need the same treatment, and that is a catalog-level task,
  not a leaf task.
- The `skills` suite being absent from `all` means it has probably never run in
  CI. If wiring it in surfaces failures in the other nine test files, the fix
  belongs to those skills; this plan should not silently exclude them.
- INP and LoAF measurement is the part of this skill with no owner anywhere
  else, and it is the reason the leaf survives the trim with 200 lines rather
  than 80.
