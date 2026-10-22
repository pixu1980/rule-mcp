# rule-process-npm-release - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`. Order: `docs/plans/skills/DEPENDENCIES.md`, after `rule-process-ai`.

Area: process. Order: reverse alphabetical, twenty-ninth skill.

## Evidence base

Read and measured in this session:

- `skills/rule-process-npm-release/SKILL.md`: 320 lines, eighth longest in the catalogue. Sections: how to run this skill, the fact gathering step, the manual settings step, the repo changes step (five sub-steps, one of them a 70-line YAML template), not yet published packages, monorepo specifics, how to release now, fewer dependencies, a final checklist of eight items, see also.
- `skills/rule-process-npm-release/guardrails/`: absent. The skill owns no rule at all.
- Twelve statements in the body are checkable against a file the project owns: tag trigger, `npm stage publish`, no `NPM_TOKEN`, SHA-pinned actions, `--ignore-scripts`, `id-token` confined to the publish job, no install or cache in that job, build in its own job, `persist-credentials: false`, `contents: read`, cooldown config, dependency `ignore-scripts`. The remaining statements live on npmjs.com and github.com and no rule can read them.
- `tests/docs/action-pins.test.mjs`, `tests/docs/npmrc.test.mjs`, `tests/docs/version-sync.test.mjs`, `tests/docs/server-json.test.mjs`: four existing tests in this repository that enforce exactly the kind of rule this skill only describes. They are the prior art, not a new idea.
- `package.json`: no YAML dependency. The guardrail engine is regex and hand-rolled scanning, which is why the publish-job isolation check needs a worklist and not a `yaml.parse` call.
- `skills/rule-toolchain-pnpm/guardrails/`: owns `pkg-exact-versions`, `pkg-no-corepack` and `pkg-no-engines`, so package-manager configuration already has an owner.
- `personas/oss.md`, `personas/supply-chain.md`, `personas/devops.md`: three personas carry this skill as evidence, so a change here reaches three review paths.

Problems found:

| Problem                            | Detail                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 320 lines, zero rules              | every rule is prose the reader has to apply by hand, in a skill whose subject is what a machine can refuse                             |
| the checklist is a second source   | the eight-item final checklist restates the same facts as the body, so the two drift and neither is authoritative                      |
| the body repeats itself            | `--ignore-scripts` is argued four times, the cooldown four times, and "do not start until the user confirms" three times               |
| the template holds the rules       | the pinned workflow is 70 lines of the file, and it is the only place where the pinning, the permissions and the staging actually live |
| cooldown has no owner with a test  | four package managers, four spellings, and no rule checks that a consumer project set any of them                                      |
| the manual half is unrepresentable | Trusted Publisher, 2FA, tag ruleset and immutable releases are settings, so the skill spends its length where a rule cannot follow     |
| no YAML structure seam             | "only the publish job has `id-token`" needs to know which job a step belongs to; nothing in the engine can answer that today           |

## Decisions

| Question        | Decision                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Shape           | The body drops to about 150 lines; the workflow template and the manual settings move to `references/` |
| Rule set        | Eight rules: the structural set, not the minimum and not the full twelve                               |
| YAML parsing    | A shared `_workflow.js` helper reads jobs and steps by indentation and is tested on its own            |
| Cooldown        | Moves to `rule-toolchain-pnpm` beside `pkg-*`; this skill keeps the reason and a link                   |
| Severity        | Four security rules block, the other four are advisory                                                 |
| Manual settings | `references/manual-settings.md`, out of the body but still in the skill                                |
| Delivery        | Plan only                                                                                              |

## Workstream A - The cut

What stays in `SKILL.md`, in this order: the outcome in three sentences, the strict
sequence (facts, one batch of questions, manual settings, wait, repo changes), the
questions to ask up front, the first-publish exception, how to release afterwards,
and a closing table that says which rule enforces what. Everything else leaves:

| Section of today's file               | Goes to                                                                |
| ------------------------------------- | ---------------------------------------------------------------------- |
| The 70-line workflow template         | `references/publish-workflow.md`                                       |
| The manual settings checklist         | `references/manual-settings.md`                                        |
| The cooldown snippets                 | `rule-toolchain-pnpm`, with a one-line link here                        |
| The four `--ignore-scripts` arguments | one sentence, because the rule enforces it                             |
| The eight-item final checklist        | the rule table (what a rule enforces) plus two items a rule cannot see |
| The zizmor command                    | `references/publish-workflow.md`, beside the workflow it lints         |

The target is 150 lines with no information lost: every removed block has a
destination, and the plan's verification step is a diff of the old and new files
that finds no claim without a home.

## Workstream B - The workflow helper

`skills/rule-process-npm-release/guardrails/_workflow.js`, one module shared by three rules:

- split a workflow file into jobs by top-level keys under `jobs:`;
- split a job into steps, each with its own `with:`, `run:` and `uses:` lines;
- report the permissions block of a job and of the workflow;
- return nothing for a file that is not a workflow, so a rule can pass instead of guessing.

It is the only place that knows the indentation rules, which is what keeps three
rules from growing three parsers. Its own test file carries a heredoc fixture per
shape: two-space, four-space, a job with no steps, a step with a multi-line `run`, a
workflow with `permissions` at both levels.

## Workstream C - The four blocking rules

| Rule id                     | Rejects                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `release-no-npm-token`      | `secrets.NPM_TOKEN` or an `NPM_TOKEN` environment in any workflow                                       |
| `release-stage-publish`     | `npm publish` where `npm stage publish` is required, including in a `run:` that chains it               |
| `release-actions-pinned`    | a `uses:` without a 40-hex SHA and a version comment                                                    |
| `release-id-token-isolated` | `id-token: write` on a job that installs dependencies, restores a cache, or is not the only job with it |

Each carries the false positives that matter in its fixtures: a token name inside a comment, `npm publish` inside a string that a test asserts, a `uses:` for a local action (`./.github/actions/x`) which has no SHA, and a workflow where `id-token` sits on the workflow level rather than a job.

## Workstream D - The four advisory rules

| Rule id                          | Rejects                                                           |
| -------------------------------- | ----------------------------------------------------------------- |
| `release-tag-trigger`            | a publish workflow with no tag filter, or a filter no tag matches |
| `release-ignore-scripts`         | an install or publish step without `--ignore-scripts`             |
| `release-no-persist-credentials` | a checkout step that keeps credentials                            |
| `release-least-privilege`        | a job with no `contents: read` and no narrower permission         |

Advisory because each has a legitimate exception: a workflow triggered by `workflow_dispatch` for a dry run, a project whose build genuinely needs a dependency's install script, a checkout that needs credentials to push a changelog commit.

## Workstream E - The cooldown moves

`rule-toolchain-pnpm` gains one rule beside `pkg-exact-versions`: a project with a lockfile must set the cooldown for the manager it uses (`.npmrc` `min-release-age`, pnpm `minimumReleaseAge` in seconds, yarn `npmMinimalAgeGate`, bun `minimumReleaseAge` in `bunfig.toml`), and the value must be at least the documented floor. This plan does not write it; it records the requirement and the boundary so the pnpm plan does not have to rediscover it.

## Workstream F - The manual settings

`references/manual-settings.md` holds the two website checklists, unchanged in substance: Trusted Publisher with the stage-only box and the workflow filename, publishing access with tokens disallowed, the `NPM_TOKEN` deletion and revocation, 2FA for an organization or a personal account, the tag ruleset, and immutable releases. Each item keeps its resolved-URL instruction, because that is the part the model has to produce and the part a rule can never check.

## Proposed guardrails

Blocking first for the four that a hacked workflow can defeat; advisory for the rest.

| Rule id                          | Rejects                                                     | Tier | Source                         |
| -------------------------------- | ----------------------------------------------------------- | ---- | ------------------------------ |
| `release-no-npm-token`           | a token in a workflow                                       | A    | This skill; Trusted Publishing |
| `release-stage-publish`          | `npm publish` instead of `npm stage publish`                | A    | This skill                     |
| `release-actions-pinned`         | an unpinned `uses:`                                         | A    | `tests/docs/action-pins`       |
| `release-id-token-isolated`      | `id-token` on a job that installs or caches, or on two jobs | A    | This skill                     |
| `release-tag-trigger`            | a publish workflow with no tag filter                       | B    | This skill                     |
| `release-ignore-scripts`         | an install or publish without `--ignore-scripts`            | B    | This skill                     |
| `release-no-persist-credentials` | a checkout that keeps credentials                           | B    | `tests/docs/workflow-*`        |
| `release-least-privilege`        | a job with broader permissions than `contents: read`        | B    | This skill                     |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-process` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Evaluation and decisions

- [x] Audit the skill and inventory the checkable statements.
- [x] Confirm the prior art in the repository's own workflow tests.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - The helper

- [ ] Write the `_workflow.js` fixture set first: four indentation shapes, a multi-line `run`, permissions at both levels.
- [ ] Implement the helper and keep it free of rule-specific logic.
- [ ] Gate: the helper suite green, and no rule file imports anything else new.

### Phase 2 - The blocking rules

- [ ] `release-no-npm-token` with its good and bad fixtures, including the token name in a comment.
- [ ] `release-stage-publish`, including the chained `run:` and the string case.
- [ ] `release-actions-pinned`, including the local action that legitimately has no SHA.
- [ ] `release-id-token-isolated`, including the workflow-level `id-token`.
- [ ] Gate: the four rules green on the corpus, and `rule_tool_check` on this repository stays clean.

### Phase 3 - The advisory rules and the cut

- [ ] The four advisory rules, each with its exception fixture.
- [ ] Cut the body to about 150 lines and move the template and the settings into `references/`.
- [ ] Gate: a diff review that finds every removed claim with a destination, and the rule table replacing the final checklist.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census` and update the frontmatter `guardrails:` list.

### Phase 4 - Verification

- [ ] Run the gates below.
- [ ] Run the eight rules against this repository's own `.github/workflows/` and fix what they report, since a rule the author's own repository fails is a rule nobody will trust.
- [ ] Hand the cooldown requirement to the `rule-toolchain-pnpm` plan.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-process-npm-release/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/guardrails/__tests__/_enforcement.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/guardrails/__tests__/_false-positives.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/docs/action-pins.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- The interview chose the structural eight, and the cooldown then left the family for `rule-toolchain-pnpm`. Eight minus one left seven, so the eighth slot went to `release-least-privilege`, which the same helper answers for free. That is an addition to the agreed set, recorded here rather than made silently.
- The YAML helper is the only structural risk in this plan. A workflow written with tabs, or with a `jobs:` key nested under an anchor, is out of scope: the helper reports nothing and the rule passes. That failure mode is chosen deliberately, because a rule that blocks a legitimate workflow on a parser limitation is worse than one that misses it.
- A rule cannot see npmjs.com or github.com, so the settings checklist stays prose. The plan keeps it in `references/` rather than deleting it, because it is the half of the job the user performs.
- Monorepos are read as one workflow plus N packages: the rules check the workflow once, and the per-package settings remain a checklist item, since nothing in the repository names a Trusted Publisher.
