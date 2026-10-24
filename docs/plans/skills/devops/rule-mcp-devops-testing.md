# rule-devops-testing - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#57`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: devops, leaf. Sibling plans: `rule-devops-observability`,
`rule-devops-docker`, `rule-devops-deploy-preview` (same series) and `rule-devops`
(the router, planned last).

## Scope decisions (owner)

Inherited from the platform, meta and frontend interviews, 2026-10-21:

| Question           | Decision                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scope of this pass | **Plan only**                                                                                                                                                            |
| Identity           | It stays the catalog's test owner, and it gains the rules it has never had: this is the skill with the widest "See also" traffic and zero enforcement                    |
| Runner policy      | `testing-single-runner` becomes a rule, with the Expo/React Native exception pointing at the mobile rule that owns it                                                    |
| CI claims          | A claim about what runs in CI is checked against a suite that runs: the repository does not run its `skills` suite today, and this skill is where that statement belongs |
| Rule set           | Six rules, all Tier B (advisory)                                                                                                                                         |
| Detection          | Both: section and table parsing, plus injected `fileList` and config filename                                                                                            |
| Fixtures           | Shared corpus pairs plus skill trees on disk                                                                                                                             |
| Flow               | Failing test first                                                                                                                                                       |
| Gates              | Skill suite, corpora, catalog clean, census, lint and typecheck                                                                                                          |
| Commits            | One per phase                                                                                                                                                            |
| ADR                | Two for the whole area: the devops family shape, the rule design                                                                                                         |
| Done               | The runner policy and the coverage claim are enforceable and the rules pass                                                                                              |

## Evidence base (measured 2026-10-21)

`skills/rule-devops-testing/SKILL.md` is **366 lines**, one file only: no
`guardrails/`, no `references/`, no auxiliary folders.

It is the **most cited skill in the catalog** as an owner: the frontend, meta and
platform plans all defer to it for the runner, and two of them repeat its Expo
exception. It enforces nothing.

### What it claims, and whether anything checks it

| Claim in the body                                                                                    | Enforced                               |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------- |
| "Vitest is the runner, and the only one. Jest, Mocha and Jasmine are not alternatives" (bold, twice) | **no**                                 |
| "Coverage thresholds are mandatory in local config and in CI"                                        | **no**                                 |
| "This skill owns coverage enforcement" (line 224)                                                    | **no**                                 |
| The Expo/React Native `jest-expo` exception                                                          | **no**, and it names no rule to follow |
| Threshold numbers appear in two config blocks (lines 56 and 88)                                      | two places, both unchecked             |

### The exception it states is the one `rule-process-tdd` cites wrongly

`rule-process-tdd` says "See `expo` rule", and no such rule exists anywhere. This
skill states the same exception without naming any rule. The mobile plan owns
`mobile-test-runner`; this leaf should point at it, and this plan adds the rule
that makes a stated exception name its owner.

### One claim the repository itself contradicts

The body says thresholds are "verified in CI". The `skills` suite - the one whose
globs cover skill-local tests - is **not included in `all`**, and `all` is what CI
runs (measured in the `rule-frontend-workers` plan). For tests, that is the same
class of mistake as a rule with no fixture: a claim with nothing behind it.

## The six rules

| id                                 | Rejects                                                                 | Reads                       | Tier | Today                      |
| ---------------------------------- | ----------------------------------------------------------------------- | --------------------------- | ---- | -------------------------- |
| `testing-single-runner`            | `jest`, `mocha` or `jasmine` in a config that is not the Expo exception | `code` + `context.fileName` | B    | n/a: no rules exist        |
| `testing-expo-exception-linked`    | The Expo exception stated without naming the rule that owns it          | `code`                      | B    | **red**: names no rule     |
| `testing-coverage-thresholds`      | A `vitest.config` with no threshold block                               | `code` + `context.fileName` | B    | n/a                        |
| `testing-thresholds-single-source` | The numbers restated outside the config section                         | `code`                      | B    | **red**: two config blocks |
| `testing-owner-named`              | A delegated section naming no owner                                     | `code`                      | B    | partially red              |
| `testing-no-stale-skill-id`        | A `rule-mcp-...` id with no skill directory                             | `code` + `context.fileList` | B    | clean                      |

## Phase 0 - Decisions

- [ ] ADR (area): the devops family shape. Testing owns the runner and coverage;
      observability owns SLOs and telemetry; docker owns the image contract;
      deploy-preview owns the preview pipeline; the router owns the two secret
      rules it already carries.
- [ ] ADR (area): the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/devops-testing/`: `clean/`, `second-runner/`,
      `unlinked-exception/`, `no-thresholds/`, `restated-numbers/`, each with a
      one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-devops-testing`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-devops-testing/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails:` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Fix the claims

- [ ] The Expo exception names `mobile-test-runner`, the rule `rule-process-tdd`
      should also have cited.
- [ ] The threshold numbers live once; the second block points at the first.
- [ ] The "verified in CI" sentence either becomes true (the `skills` suite joins
      `all`, per the workers plan) or stops claiming it.

## Phase 4 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-devops-testing/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Catalog scan with the six rules.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                           | Class       | Model                     | Why                            |
| ------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions            | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules            | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Fix the claims       | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 4 - Verification         | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-devops-testing/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-devops` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- The gap between citation and enforcement is the widest in the catalog here:
  five plans defer to this skill, and none of its five claims is checked. That
  is the same shape as `rule-platform-auth` having no door, mirrored.
- `testing-single-runner` is the rule a reader would most expect to exist
  already, because the body says the policy twice in bold. Bold is not a rule.
- The CI claim is a repository-level truth, not a skill-level one: fixing it
  means running the suite, not editing the sentence. The skill should say which
  suite runs and let the reader check.
