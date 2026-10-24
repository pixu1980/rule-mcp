# rule-mcp-toolchain-turborepo - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: toolchain. Order: reverse alphabetical, fourth skill.

## Evidence base

Read in this session:

- `skills/rule-mcp-toolchain-turborepo/SKILL.md` (80 lines): a `turbo.json` block
  that still uses `pipeline`, `dependsOn`, `outputs`, `inputs`, `persistent`,
  `cache`, a remote-cache section based on `turbo login` and `turbo link`, key
  commands, and a Lerna/Nx migration section.
- `skills/rule-mcp-toolchain-pnpm/SKILL.md` (workspace and lockfile owner).

Public sources verified in this session:

- Turborepo configuration reference, https://turborepo.com/docs/reference/configuration
- Configuring tasks, https://turborepo.com/docs/crafting-your-repository/configuring-tasks
- Caching, https://turborepo.com/docs/crafting-your-repository/caching
- Remote caching, https://turborepo.com/docs/core-concepts/remote-caching
- Run reference, https://turborepo.com/docs/reference/run
- Environment variables, https://turborepo.com/docs/crafting-your-repository/using-environment-variables

Facts that make the current text out of date:

| Current text                                                   | Turborepo 2.x reality                                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `"pipeline"` in `turbo.json`                                   | replaced by `"tasks"`                                                                                     |
| no `env`/`globalEnv`                                           | environment variables that change the build must enter the hash                                           |
| `globalDependencies: ["**/.env.*local"]`                       | the lockfile and root configs are the useful entries                                                      |
| remote cache shown only through `turbo login` and `turbo link` | the cache is provider-agnostic: any HTTP server that meets the spec, with artifact integrity verification |
| no filter guidance                                             | `--filter`, `--affected`, `--dry=json` and `--continue` are the CI surface                                |

Local articles: no dedicated Turborepo or monorepo piece exists in
the local article corpus. The mentions found are incidental (NestJS ESM,
a Node package roundup, TypeScript 7). They stay context only and are not cited.

## Decisions

| Question     | Decision                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Scope        | Baseline config, cache integrity, filters and CI, remote cache, prune/Docker, migration                                |
| Version      | Turborepo 2.x, with a 1.x migration note (`pipeline` to `tasks`)                                                       |
| Boundaries   | Turborepo owns the task graph and the cache only; the rest is indexed                                                  |
| Cache        | `outputs` for cacheable tasks, `globalDependencies`, `env`/`globalEnv`, `$TURBO_DEFAULT$`, `cache: false` where needed |
| Dev tasks    | `persistent: true` implies `cache: false`, always                                                                      |
| Remote cache | Provider-agnostic, artifact integrity verified, token as a CI secret                                                   |
| CI           | `--affected` with full Git history, `--dry=json`, `--continue`, explicit `concurrency`                                 |
| Prune        | Short section, the Dockerfile stays with `rule-mcp-devops-docker`                                                      |
| Migration    | Keep the Lerna/Nx section, verified and reduced                                                                        |
| Delivery     | Plan only now                                                                                                          |
| ADR          | Only when a decision is structural                                                                                     |

## Workstream A - Baseline configuration

1. `tasks` is the only key; `pipeline` appears once, in the migration note.
2. `turbo.jsonc` is allowed when comments help, with the schema reference.
3. The reference config declares, per task: `dependsOn`, `outputs`, `inputs`
   where they matter, `cache` and `persistent`.
4. A cacheable task with no `outputs` is a documented mistake, not a style
   preference: Turborepo restores what the task declared and nothing else.

## Workstream B - Cache integrity

1. **Outputs.** `build`, `test` coverage and every artifact-producing task
   declare their outputs.
2. **Global inputs.** `globalDependencies` carries the lockfile and the root
   configs that affect every package.
3. **Environment.** `globalEnv` for variables that affect every task, `env` for
   the task-specific ones. A variable that changes the build and is not
   declared is a stale cache waiting to happen.
4. **Targeted inputs.** `$TURBO_DEFAULT$` with negations keeps the default
   behavior while excluding a file.
5. **Non-deterministic tasks.** Deploys and scripts that must always run set
   `cache: false`.

## Workstream C - Filters and CI

1. `--filter` for a package scope, `--affected` for the branch diff.
2. `--affected` needs a Git history with the base branch available: the CI
   checkout must not be shallow.
3. `--dry=json` inspects the graph and the cache decision without running.
4. `--continue` runs every task and reports the final exit code, instead of
   stopping at the first failure.
5. `concurrency` is set explicitly on small runners so parallel tasks do not
   exhaust memory.

## Workstream D - Remote cache

1. Provider-agnostic: Vercel or any HTTP server that meets the Remote Caching
   API specification.
2. Artifact integrity and authenticity verification is enabled where the
   provider supports it.
3. The token is a CI secret, never a repository file.
4. `turbo login` and `turbo link` are the Vercel-managed path, presented as one
   option rather than the default.

## Workstream E - Prune and Docker

A short section: `turbo prune <package>` produces a reduced workspace, and the
Dockerfile that consumes it stays in `rule-mcp-devops-docker`. `pruneIncludesGlobalFiles`
is mentioned for projects that need `globalDependencies` inside the pruned
output.

## Workstream F - Migration

Keep the Lerna/Nx section, verified and reduced to the commands that still
exist. Add the 1.x to 2.x note: `pipeline` becomes `tasks`, and a config that
still uses `pipeline` is not read.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                  | Rejects                                        | Tier | Source                  |
| ------------------------ | ---------------------------------------------- | ---- | ----------------------- |
| `turbo-tasks-key`        | a `turbo.json` that uses `pipeline`            | A    | Configuration reference |
| `turbo-outputs-declared` | a cacheable task with no `outputs`             | A    | Caching docs            |
| `turbo-dev-not-cached`   | `persistent: true` without `cache: false`      | A    | Task configuration      |
| `turbo-env-no-secrets`   | a secret-looking name inside `env`/`globalEnv` | B    | Environment variables   |

`turbo-env-no-secrets` is Tier B because the name alone is weak evidence; a
project can legitimately hash a public identifier that ends in `_KEY`.

## Assets and templates to ship

- `assets/templates/turbo.jsonc` (tasks, outputs, inputs, env, persistent).
- `assets/templates/ci-turbo.yml` (affected run, cache, full history).
- `assets/templates/upgrade-turbo-1-to-2.md` (`pipeline` to `tasks`).

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD)

Feeds: `rule-mcp-toolchain` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the pnpm boundary.
- [x] Verify the Turborepo 2.x facts.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Replace the `pipeline` baseline with `tasks` and the reference config.
- [ ] Rewrite the cache section with outputs, global inputs and env.
- [ ] Add filters, `--affected`, `--dry=json` and `--continue`.
- [ ] Rewrite the remote-cache section as provider-agnostic.
- [ ] Add the prune section with the Docker pointer.
- [ ] Keep, verify and reduce the migration section; add the 1.x to 2.x note.
- [ ] Remove any duplicated workspace, test or Docker guidance and link the
      owners.

### Phase 2 - Guardrails and assets

- [ ] Implement the four rules with good and bad fixtures and a unit test each.
- [ ] Ship the `turbo.jsonc`, CI and upgrade templates.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the Turborepo 2.x baseline and the cache-integrity
      family, since both are structural decisions.

### Phase 3 - Verification

- [ ] Build the fixture monorepo and run `turbo run build`.
- [ ] Run `turbo run build --dry=json` and assert the graph.
- [ ] Validate the reference `turbo.jsonc` against the schema.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                | Class       | Model                     | Why                            |
| ----------------------------------- | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions and scaffolding | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Content                   | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 2 - Guardrails and assets     | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Verification              | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- No local article covers Turborepo, so the plan anchors only to the official
  documentation.
- The `turbo.json` examples in this plan are documentation, not code; the
  `js-blank-lines-blocks` guardrail reads fenced JSON as JavaScript and reports
  a false positive on them. The reference template ships as `jsonc` and is
  validated against the schema instead.
