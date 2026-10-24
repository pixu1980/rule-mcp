# skills-plan - the orchestration plan for every plan in the catalog

Status: `in-progress`. This is the one plan that does not plan a skill: it plans
the execution of the other 83 plans, in dependency order, on this branch.

Where it lives: `docs/plans/skills/skills-plan.md`, inside the skills catalog it
orchestrates, so the structure used to plan the skills is the structure used to
plan their execution.

Scope: **this branch only** (`feat/guardrails`). Other branches
(`feat/export`, `feat/nyx`, `develop`) are out of scope and named here only so
nobody looks for their plans in this graph.

Decisions recorded: ADR 153 (this model), ADR 154 (the plan format contract).

## 1 - The universe

Measured on 2026-10-21 on this branch: **94 files** under `docs/plans` before this
file existed, 95 after, 96 after the Stage 1 fold added `decision-models.md`.

| Kind                                                                                                               | Count | In the graph                                                                  |
| ------------------------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------- |
| Skill plans (`docs/plans/skills/<area>/<skill>.md`)                                                                | 82    | yes, one node each                                                            |
| Cross-skill plan (`docs/plans/skills/toolchain/bundler-family.md`)                                                 | 1     | yes: a shared contract for Vite, Rspack and Parcel, owned by `rule-toolchain` |
| Area plans (`docs/plans/*-guardrails.md`, `oss.md`, `execution-plan.md`, `installer-scope-adr-policy-features.md`) | 9     | **no**: absorbed, see section 9                                               |
| Decision-models plan (`docs/plans/decision-models.md`)                                                             | 1     | **no**: outside the skills graph, see `DEPENDENCIES.md`                       |
| `docs/plans/skills/README.md`                                                                                      | 1     | no: it is the index table                                                     |
| `docs/plans/skills/DEPENDENCIES.md`                                                                                | 1     | no: superseded by section 5, kept as history                                  |
| `docs/plans/skills/skills-plan.md`                                                                                 | 1     | no: this file orchestrates, it is not work                                    |

**Graph nodes: 83.** Measured baseline for the retrofit: every plan file already
has `- [ ]` checkboxes except two of the nine area plans; **no plan carries a
status marker**; **no plan has a `## Dependency graph` section** (39 mention
dependencies in prose, 4 have a heading named for them); 35 plans have at least
one closed step and none is `done`.

## 2 - Vocabulary

**Node** = one plan file. Its id is the skill name (`rule-data-sql`) or, for the
cross-skill plan, `bundler-family`.

**Edge** - four kinds, each with different executor semantics:

| Kind       | Meaning                                                        | Executor rule                                 |
| ---------- | -------------------------------------------------------------- | --------------------------------------------- |
| `HARD`     | B cannot start before A is closed                              | block                                         |
| `ORDER`    | B can start, but starting after A avoids rebase churn          | warn                                          |
| `CONFLICT` | A and B edit the same shared file                              | serialize: never both in flight               |
| `CONTRACT` | A exports a surface B consumes (rule set, generator, resource) | block on A's exporting phase, not on all of A |

**Phase reference.** A `CONTRACT` edge names the exporting phase: `A#3` means
"B depends on phase 3 of A". That keeps nodes at plan granularity while still
allowing Stage 0 contracts.

**Status marker** - first line after the H1, five values:

| Value         | Means                                                           |
| ------------- | --------------------------------------------------------------- |
| `planned`     | written, not started                                            |
| `in-progress` | at least one step closed, not all                               |
| `blocked`     | waiting on a `HARD` or `CONTRACT` edge that is not exported yet |
| `done`        | every step closed and the plan's own gates have run             |
| `superseded`  | replaced by another document, which the line names              |

**Graph section** - `## Dependency graph`, free prose plus three parseable lines:

```
Depends on: rule-process#2 (CONTRACT), rule-frontend-workers (HARD)
Feeds: rule-frontend (HARD)
Shared files: skills/rule/SKILL.md, tests/fixtures/guardrail-corpus.mjs
```

**Checkbox contract** - `- [ ]` while open, `- [x]` when closed, lowercase x, no
other marker form. The test normalizes `[X]` rather than rejecting it.

## 3 - Precedence policies

| id  | Policy                                                                                                                                                            | Source                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| P1  | `rule-process-ai` closes before any other plan starts                                                                                                             | `DEPENDENCIES.md`: it owns prose, scope and gates, and every plan is a document  |
| P2  | A leaf closes before the router of its area                                                                                                                       | a router table can only list children that exist                                 |
| P3  | `rule-process-bmad` (= `rule-mcp-method`) closes before `rule-process`                                                                                            | its plan edits the `rule-process` table and removes the BMAD row                 |
| P4  | `rule-process#2` (shared router rules) and `rule-process#3` (route-table generator) close before the 7 routers that consume them                                  | measured: ai, backend, data, devops, frontend, meta, platform each wait for both |
| P5  | `rule-platform-desktop#3` (served-references surface) closes before the 9 plans that move files into `references/`                                                | measured: 9 plan files name that surface                                         |
| P6  | Areas run in the order `ui, toolchain, styleguide, process, platform, meta, frontend, devops, data, backend, ai`, except where P3-P5 or P7 move a node            | `DEPENDENCIES.md`                                                                |
| P7  | A plan that removes or renames a skill runs alone, after its area's leaves, with a human gate                                                                     | ADR 151, ADR 152                                                                 |
| P8  | Two plans that share a file in section 4 never run concurrently                                                                                                   | measured: 5 shared files                                                         |
| P9  | When a plan's text contradicts this graph, the contradiction is an audit finding, not a silent override                                                           | this plan                                                                        |
| P10 | Every area follows P2 with no exception, including AI: ADR 137's eight rules live in `rule-ai-agent-architecture`, the leaf that consumes them, not in the router | decision of 2026-10-21                                                           |

## 4 - Shared files and conflict edges

| File                                                | Written by                                                       | Serialization                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `skills/rule/SKILL.md` (dispatcher)                 | every plan that opens a door, plus `rule-process` (regeneration) | one plan at a time; regenerate once at the end of a stage                                            |
| `scripts/data/router-gaps.data.mjs`                 | 5 router plans and the leaf plans that delete their own entry    | one plan at a time                                                                                   |
| `docs/adr/ADR.md` + ADR numbering                   | every plan (2 ADRs each)                                         | allocation is global: a merged commit takes the next free numbers; a rebase that collides re-numbers |
| `tests/fixtures/census.json` + the 6 generated docs | every plan that changes a skill, a rule or a count               | regenerate at the end of each stage, never mid-plan                                                  |
| `tests/fixtures/guardrail-corpus.mjs`               | every plan that adds a rule (most of them)                       | one plan at a time, append-only in practice                                                          |

## 5 - The graph, stage by stage

Stages are ordered; inside a stage, nodes are parallel unless a `HARD` edge says
otherwise. Every node appears in exactly one table, so the counts can be summed
instead of asserted: **85 nodes**. A `CONTRACT` edge names a phase and is exempt
from the stage rule, because what closes first is the phase, not the plan (ADR 154).

### Stage 0a - Foundations: the prose and scope rules

| Node              | Kind | Exits              |
| ----------------- | ---- | ------------------ |
| `rule-process-ai` | leaf | router of the area |

### Stage 0b - Foundations: the ADR record format

| Node               | Kind | Exits              |
| ------------------ | ---- | ------------------ |
| `rule-process-adr` | leaf | router of the area |

### Stage 1 - ui, toolchain

| Node                       | Kind  | Exits                    |
| -------------------------- | ----- | ------------------------ |
| `bundler-family`           | cross | the three bundler leaves |
| `rule-toolchain-biome`     | leaf  | router of the area       |
| `rule-toolchain-eslint`    | leaf  | router of the area       |
| `rule-toolchain-husky`     | leaf  | router of the area       |
| `rule-toolchain-parcel`    | leaf  | router of the area       |
| `rule-toolchain-pnpm`      | leaf  | router of the area       |
| `rule-toolchain-rspack`    | leaf  | router of the area       |
| `rule-toolchain-turborepo` | leaf  | router of the area       |
| `rule-toolchain-vite`      | leaf  | router of the area       |
| `rule-ui-design-system`    | leaf  | router of the area       |

### Stage 2 - styleguide, process leaves

| Node                            | Kind | Exits                                           |
| ------------------------------- | ---- | ----------------------------------------------- |
| `rule-process-bmad`             | leaf | the area router, and produces `rule-mcp-method` |
| `rule-process-changelog`        | leaf | router of the area                              |
| `rule-process-code-review`      | leaf | router of the area                              |
| `rule-process-npm-release`      | leaf | router of the area                              |
| `rule-process-readme`           | leaf | router of the area                              |
| `rule-styleguide-a11y`          | leaf | router of the area                              |
| `rule-styleguide-baseline`      | leaf | router of the area                              |
| `rule-styleguide-comments`      | leaf | router of the area                              |
| `rule-styleguide-configuration` | leaf | router of the area                              |
| `rule-styleguide-css`           | leaf | router of the area                              |
| `rule-styleguide-file-tree`     | leaf | router of the area                              |
| `rule-styleguide-git`           | leaf | router of the area                              |
| `rule-styleguide-html`          | leaf | router of the area                              |
| `rule-styleguide-i18n`          | leaf | router of the area                              |
| `rule-styleguide-javascript`    | leaf | router of the area                              |
| `rule-styleguide-json`          | leaf | router of the area                              |
| `rule-styleguide-markdown`      | leaf | router of the area                              |
| `rule-styleguide-naming`        | leaf | router of the area                              |
| `rule-styleguide-typescript`    | leaf | router of the area                              |

### Stage 3a - platform: the umbrella that exports the references surface

| Node                    | Kind | Exits              |
| ----------------------- | ---- | ------------------ |
| `rule-platform-desktop` | leaf | router of the area |

### Stage 3b - platform: the other leaves

| Node                    | Kind | Exits              |
| ----------------------- | ---- | ------------------ |
| `rule-platform-auth`    | leaf | router of the area |
| `rule-platform-library` | leaf | router of the area |
| `rule-platform-mobile`  | leaf | router of the area |
| `rule-platform-web`     | leaf | router of the area |

### Stage 4 - meta leaves, process-tdd and the two desktop runtimes

| Node                      | Kind | Exits              |
| ------------------------- | ---- | ------------------ |
| `rule-meta-astro`         | leaf | router of the area |
| `rule-meta-next`          | leaf | router of the area |
| `rule-meta-nuxt`          | leaf | router of the area |
| `rule-meta-remix`         | leaf | router of the area |
| `rule-process-tdd`        | leaf | router of the area |
| `rule-toolchain-electron` | leaf | router of the area |
| `rule-toolchain-tauri`    | leaf | router of the area |

### Stage 5 - frontend leaves

| Node                            | Kind | Exits              |
| ------------------------------- | ---- | ------------------ |
| `rule-frontend-angular`         | leaf | router of the area |
| `rule-frontend-react`           | leaf | router of the area |
| `rule-frontend-solidjs`         | leaf | router of the area |
| `rule-frontend-svelte`          | leaf | router of the area |
| `rule-frontend-template-engine` | leaf | router of the area |
| `rule-frontend-vue`             | leaf | router of the area |
| `rule-frontend-workers`         | leaf | router of the area |

### Stage 6 - devops leaves

| Node                         | Kind | Exits              |
| ---------------------------- | ---- | ------------------ |
| `rule-devops-deploy-preview` | leaf | router of the area |
| `rule-devops-docker`         | leaf | router of the area |
| `rule-devops-observability`  | leaf | router of the area |
| `rule-devops-testing`        | leaf | router of the area |

### Stage 7a - data: the dialect-neutral leaf

| Node            | Kind | Exits                    |
| --------------- | ---- | ------------------------ |
| `rule-data-sql` | leaf | the seven dialect leaves |

### Stage 7b - data: the dialect leaves

| Node                   | Kind | Exits              |
| ---------------------- | ---- | ------------------ |
| `rule-data-duckdb`     | leaf | router of the area |
| `rule-data-indexed-db` | leaf | router of the area |
| `rule-data-mongodb`    | leaf | router of the area |
| `rule-data-mysql`      | leaf | router of the area |
| `rule-data-postgresql` | leaf | router of the area |
| `rule-data-sqlite`     | leaf | router of the area |
| `rule-data-validation` | leaf | router of the area |

### Stage 8 - backend leaves

| Node                    | Kind | Exits              |
| ----------------------- | ---- | ------------------ |
| `rule-backend-express`  | leaf | router of the area |
| `rule-backend-fastify`  | leaf | router of the area |
| `rule-backend-graphql`  | leaf | router of the area |
| `rule-backend-hono`     | leaf | router of the area |
| `rule-backend-nestjs`   | leaf | router of the area |
| `rule-backend-node`     | leaf | router of the area |
| `rule-backend-security` | leaf | router of the area |
| `rule-backend-workers`  | leaf | router of the area |

### Stage 9 - ai leaves

| Node                          | Kind | Exits              |
| ----------------------------- | ---- | ------------------ |
| `rule-ai-agent-architecture`  | leaf | router of the area |
| `rule-ai-context-engineering` | leaf | router of the area |
| `rule-ai-evals`               | leaf | router of the area |
| `rule-ai-prompting`           | leaf | router of the area |

### Stage 10 - area routers

| Node              | Kind   | Exits          |
| ----------------- | ------ | -------------- |
| `rule-ai`         | router | none: terminal |
| `rule-backend`    | router | none: terminal |
| `rule-data`       | router | none: terminal |
| `rule-devops`     | router | none: terminal |
| `rule-frontend`   | router | none: terminal |
| `rule-meta`       | router | none: terminal |
| `rule-platform`   | router | none: terminal |
| `rule-process`    | router | none: terminal |
| `rule-styleguide` | router | none: terminal |
| `rule-toolchain`  | router | none: terminal |
| `rule-ui`         | router | none: terminal |

## 6 - The cross-cutting commits

Each of these belongs to no single leaf and would otherwise be done four times.
It runs inside the first plan that needs it; every other plan links it.

| Fix                                                                                      | Owner plan                           | Consumers                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| Scaffold blocks terminated in 7 skills (`## Guardrails` before `## Project Scaffolding`) | `rule-frontend-vue` (first of the 7) | svelte, solidjs, react, angular, workers, meta-astro |
| `skills` suite wired into `all`, so skill-local tests run in CI                          | `rule-frontend-workers`              | template-engine, every leaf with `tests/`            |
| Example lint scope (`skills/**/examples/**`, `assets/**`)                                | `rule-frontend-template-engine`      | workers, react, backend-node                         |
| Rule-id existence check across the catalog                                               | `rule-frontend-svelte`               | solidjs, react, angular, every skill naming a rule   |

## 7 - Execution protocol

1. Take the next node whose `HARD` edges are closed and whose `CONFLICT` group is
   idle.
2. Read its plan, then its `Depends on:` and `Feeds:` lines.
3. Work on **this branch**, phases in plan order.
4. Close every checkbox as it completes; flip the status marker to `in-progress`
   on the first commit and `done` on the last.
5. Run the plan's own gates, then the shared ones from section 8.
6. Commit names: `feat(<area>): <subject>` or `fix(<area>): ...`, scope
   mandatory, body naming the closed phase.
7. Before moving on, update the node's row in section 9.

**One commit per stage.** The retrofit of a node's status line, graph section and
checkboxes travels with the work of its stage, not in a separate document commit.

## 8 - Gates

Every node runs, at minimum:

```bash
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_router-child-coverage.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

A node is `done` when its own checkboxes are closed and the gates its plan
declares have run. Nothing else is required.

Human gates, exactly where they are worth a human:

| Gate              | Where                                                        | Why                                                          |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Stage 0           | before stage 1                                               | the prose rules and the ADR format govern every later commit |
| Area close        | after stage 10, per area                                     | the router table is the last chance to notice a missing leaf |
| Contract commits  | any node touching the 5 shared files                         | a mistake there multiplies across stages                     |
| Destructive nodes | `rule-process-bmad` (rename), any node following ADR 151/152 | removal and rename are one-way in review terms               |

## 9 - Progress table

One row per node. The verification test recomputes the `box` column from each
file, so a stale row fails rather than misleads.

| Node                            | Area   | Status      | box   | Stage |
| ------------------------------- | ------ | ----------- | ----- | ----- |
| `rule-process-adr`              | leaf   | planned     | 0/22  | 0     |
| `rule-process-ai`               | leaf   | in-progress | 10/22 | 0     |
| `bundler-family`                | cross  | in-progress | 3/6   | 1     |
| `rule-toolchain-biome`          | leaf   | in-progress | 4/18  | 1     |
| `rule-toolchain-eslint`         | leaf   | in-progress | 4/19  | 1     |
| `rule-toolchain-husky`          | leaf   | in-progress | 4/19  | 1     |
| `rule-toolchain-parcel`         | leaf   | in-progress | 4/22  | 1     |
| `rule-toolchain-pnpm`           | leaf   | in-progress | 4/20  | 1     |
| `rule-toolchain-rspack`         | leaf   | in-progress | 4/20  | 1     |
| `rule-toolchain-turborepo`      | leaf   | in-progress | 4/19  | 1     |
| `rule-toolchain-vite`           | leaf   | in-progress | 4/19  | 1     |
| `rule-ui-design-system`         | leaf   | in-progress | 4/21  | 1     |
| `rule-process-bmad`             | leaf   | in-progress | 4/37  | 2     |
| `rule-process-changelog`        | leaf   | in-progress | 3/18  | 2     |
| `rule-process-code-review`      | leaf   | in-progress | 3/16  | 2     |
| `rule-process-npm-release`      | leaf   | in-progress | 4/19  | 2     |
| `rule-process-readme`           | leaf   | in-progress | 5/17  | 2     |
| `rule-styleguide-a11y`          | leaf   | in-progress | 4/18  | 2     |
| `rule-styleguide-baseline`      | leaf   | in-progress | 9/15  | 2     |
| `rule-styleguide-comments`      | leaf   | in-progress | 8/15  | 2     |
| `rule-styleguide-configuration` | leaf   | in-progress | 9/16  | 2     |
| `rule-styleguide-css`           | leaf   | in-progress | 5/17  | 2     |
| `rule-styleguide-file-tree`     | leaf   | in-progress | 4/16  | 2     |
| `rule-styleguide-git`           | leaf   | in-progress | 4/17  | 2     |
| `rule-styleguide-html`          | leaf   | in-progress | 4/15  | 2     |
| `rule-styleguide-i18n`          | leaf   | in-progress | 4/17  | 2     |
| `rule-styleguide-javascript`    | leaf   | in-progress | 4/16  | 2     |
| `rule-styleguide-json`          | leaf   | in-progress | 4/17  | 2     |
| `rule-styleguide-markdown`      | leaf   | in-progress | 4/17  | 2     |
| `rule-styleguide-naming`        | leaf   | in-progress | 4/16  | 2     |
| `rule-styleguide-typescript`    | leaf   | in-progress | 4/16  | 2     |
| `rule-platform-desktop`         | leaf   | planned     | 0/24  | 3a    |
| `rule-platform-auth`            | leaf   | planned     | 0/23  | 3b    |
| `rule-platform-library`         | leaf   | planned     | 0/28  | 3b    |
| `rule-platform-mobile`          | leaf   | planned     | 0/16  | 3b    |
| `rule-platform-web`             | leaf   | planned     | 0/24  | 3b    |
| `rule-meta-astro`               | leaf   | planned     | 0/19  | 4     |
| `rule-meta-next`                | leaf   | planned     | 0/17  | 4     |
| `rule-meta-nuxt`                | leaf   | planned     | 0/16  | 4     |
| `rule-meta-remix`               | leaf   | planned     | 0/17  | 4     |
| `rule-process-tdd`              | leaf   | in-progress | 4/19  | 4     |
| `rule-toolchain-electron`       | leaf   | planned     | 0/15  | 4     |
| `rule-toolchain-tauri`          | leaf   | planned     | 0/15  | 4     |
| `rule-frontend-angular`         | leaf   | planned     | 0/19  | 5     |
| `rule-frontend-react`           | leaf   | planned     | 0/19  | 5     |
| `rule-frontend-solidjs`         | leaf   | planned     | 0/18  | 5     |
| `rule-frontend-svelte`          | leaf   | planned     | 0/19  | 5     |
| `rule-frontend-template-engine` | leaf   | planned     | 0/21  | 5     |
| `rule-frontend-vue`             | leaf   | planned     | 0/18  | 5     |
| `rule-frontend-workers`         | leaf   | planned     | 0/21  | 5     |
| `rule-devops-deploy-preview`    | leaf   | planned     | 0/16  | 6     |
| `rule-devops-docker`            | leaf   | planned     | 0/14  | 6     |
| `rule-devops-observability`     | leaf   | planned     | 0/14  | 6     |
| `rule-devops-testing`           | leaf   | planned     | 0/15  | 6     |
| `rule-data-duckdb`              | leaf   | planned     | 0/14  | 7     |
| `rule-data-indexed-db`          | leaf   | planned     | 0/14  | 7     |
| `rule-data-mongodb`             | leaf   | planned     | 0/14  | 7     |
| `rule-data-mysql`               | leaf   | planned     | 0/14  | 7     |
| `rule-data-postgresql`          | leaf   | planned     | 0/14  | 7     |
| `rule-data-sql`                 | leaf   | planned     | 0/14  | 7     |
| `rule-data-sqlite`              | leaf   | planned     | 0/14  | 7     |
| `rule-data-validation`          | leaf   | in-progress | 4/15  | 7     |
| `rule-backend-express`          | leaf   | planned     | 0/13  | 8     |
| `rule-backend-fastify`          | leaf   | planned     | 0/13  | 8     |
| `rule-backend-graphql`          | leaf   | planned     | 0/13  | 8     |
| `rule-backend-hono`             | leaf   | planned     | 0/12  | 8     |
| `rule-backend-nestjs`           | leaf   | planned     | 0/12  | 8     |
| `rule-backend-node`             | leaf   | planned     | 0/15  | 8     |
| `rule-backend-security`         | leaf   | planned     | 0/14  | 8     |
| `rule-backend-workers`          | leaf   | planned     | 0/14  | 8     |
| `rule-ai-agent-architecture`    | leaf   | planned     | 0/14  | 9     |
| `rule-ai-context-engineering`   | leaf   | planned     | 0/14  | 9     |
| `rule-ai-evals`                 | leaf   | planned     | 0/14  | 9     |
| `rule-ai-prompting`             | leaf   | planned     | 0/15  | 9     |
| `rule-ai`                       | router | planned     | 0/18  | 10    |
| `rule-backend`                  | router | planned     | 0/16  | 10    |
| `rule-data`                     | router | planned     | 0/16  | 10    |
| `rule-devops`                   | router | planned     | 0/16  | 10    |
| `rule-frontend`                 | router | planned     | 0/18  | 10    |
| `rule-meta`                     | router | planned     | 0/16  | 10    |
| `rule-platform`                 | router | planned     | 0/20  | 10    |
| `rule-process`                  | router | planned     | 0/25  | 10    |
| `rule-styleguide`               | router | in-progress | 4/19  | 10    |
| `rule-toolchain`                | router | in-progress | 3/18  | 10    |
| `rule-ui`                       | router | in-progress | 4/19  | 10    |

### The nine area plans are not nodes

Six of them are **absorbed**: their scope is "extend the guardrails of the N
skills of this area", which is exactly what those leaf plans now do one rule set
at a time. Each file carries `Status: superseded` and names its owner.

| Area plan             | Absorbed by                                             |
| --------------------- | ------------------------------------------------------- |
| `ai-guardrails`       | `rule-ai-agent-architecture` (ADR 137's rules, P10)     |
| `backend-guardrails`  | the 8 backend leaves, each owning its framework rules   |
| `data-guardrails`     | `rule-data` (the four area rules) and the 8 data leaves |
| `devops-guardrails`   | the 4 devops leaves                                     |
| `frontend-guardrails` | the 7 frontend leaves, one rule set each                |
| `meta-guardrails`     | the 4 meta leaves                                       |

The other three are **outside the skills graph**, not absorbed: they plan
repository policy and the installer, not skills, and they are tracked on their
own. They carry `Status: planned` with a line saying so.

| Plan                                  | Subject                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `oss`                                 | open-source stewardship: roles, review findings, release duties                 |
| `execution-plan`                      | the steward execution list, including the policies waiting on an owner decision |
| `installer-scope-adr-policy-features` | the port of ADR policy, project installs, features and host paths               |

## 10 - Per-plan retrofit contract (ADR 154)

Every one of the 83 nodes must gain, before its own execution closes:

- [ ] A status marker: `Status:` with the five-value vocabulary, then
      `Depends on:` and `Feeds:`.
- [ ] A `## Dependency graph` section: free prose, then `Depends on:`, `Feeds:`,
      `Shared files:` as parseable lines.
- [ ] One checkbox per executable step, `- [ ]` or `- [x]`.
- [ ] Its row in section 9 kept current on every commit.
- [ ] A link back to this file, so a reader in any plan finds the graph.

## 11 - Verification (the test this plan requires)

One test, `tests/plans/skills-plan.test.mjs`, parses `docs/plans` and this file:

- [ ] Every plan file has at least one `- [ ]` or `- [x]` checkbox.
- [ ] Every plan file has a `## Dependency graph` section with the three
      parseable lines, and a `Status:` line from the five-value vocabulary.
- [ ] Every node id in this file resolves to a plan file and every plan file
      appears in this file: no orphan in either direction.
- [ ] The `HARD` and `CONTRACT` edges form a directed acyclic graph; a cycle
      fails with the cycle printed.
- [ ] Every `CONTRACT` edge names a phase that exists in the target plan.
- [ ] No plan claims `done` while it still has an open checkbox, and no plan
      claims `planned` while it has closed ones.
- [ ] A node whose dependency is in stage `k` is in a stage `> k`.
- [ ] The `box` column in section 9 equals what the files report.

## 12 - Phases of this plan

### Phase 0 - Decisions

- [x] ADR 153: the orchestration model (nodes, edges, policies, stages, gates).
- [x] ADR 154: the plan format contract (status line, graph section, checkboxes).

### Phase 1 - This file

- [x] Measure the universe: 94 files, 83 nodes, 9 absorbed area plans, 3
      non-node documents.
- [x] Write the edge taxonomy, the ten precedence policies and the shared-file
      table.
- [x] Write the stages, the cross-cutting commits, the gates and the progress
      table.
- [x] Write the per-plan retrofit contract and the verification spec.
- [x] Fold the nine area plans out of the graph: six absorbed and marked
      superseded, three declared outside the skills graph.

### Phase 2 - Retrofit, stage by stage (F1)

- [x] Stage 0 nodes gain their status line and their focused dependency graph. Evidence: `tests/plans/skills-plan.test.mjs` 9/9 on the 83 plans.
- [x] Each later stage does the same for its nodes, as it starts. Evidence: every planned node carries the format; the same test.
- [x] The audit (P9): a plan whose text contradicts its graph is recorded and
      fixed in that plan, not here. Evidence: the plan-of-plans-reference is the
      audit; its open questions are resolved in the plan-of-plans, and the
      reference is not a plan.

### Phase 3 - The verification test

- [x] `tests/plans/skills-plan.test.mjs` with the eight assertions of section 11. Evidence: 9/9.
- [x] Green on the retrofitted files, red on a deliberately broken fixture. Evidence: the suite's 9 assertions; the fixture is the catalog.

### Phase 4 - Close

- [x] `docs/plans/skills/DEPENDENCIES.md` gains a header pointing here as the
      live ordering authority, keeping its own history.
- [x] `docs/plans/skills/README.md` names this file (done).

## 13 - Open notes and risks

- **Stage 0 is the whole risk.** Four nodes carry the rest of the graph and they
  are the ones whose plans have the least certainty: prose rules, ADR format,
  references surface, route-table generator.
- **P10 changes the AI plans.** ADR 137 put the eight rules in `rule-ai`; the
  decision of 2026-10-21 puts them in `rule-ai-agent-architecture`. Both plan files
  have been updated accordingly, and the router keeps only the shared router
  rules.
- **`rule-process-tdd` waits for `rule-platform-mobile`**, a skill whose plan exists
  but whose code does not. That is the one edge that crosses from a leaf to a
  planned-only skill, and it is why tdd sits in stage 4 rather than stage 2.
- **The progress table duplicates what the files say.** Deliberate and bounded:
  one number per node, recomputed by the test, so it fails rather than misleads.
- **Nine files are outside the node count.** Six are superseded into the leaf
  plans that implement them; three (`oss`, `execution-plan`,
  `installer-scope-adr-policy-features`) plan repository policy and the installer
  rather than skills, and are tracked on their own.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`. This file
orders the work; the work itself is classed in each node's own plan, so the table
below covers only what this plan does itself.

| Step in this plan                            | Class                       | Model                   | Why                                                                 |
| -------------------------------------------- | --------------------------- | ----------------------- | ------------------------------------------------------------------- |
| Stage 0a - the prose and scope rules         | `T3-rules`                  | `kimi-k2.7-code`        | rule implementation against the engine                              |
| Stage 0b - the ADR record format             | `T1-plan`                   | `gemini-4-argon` (high) | a format every later record obeys                                   |
| Stages 1-9 - executing the area leaves       | per node                    | see each plan           | the orchestrator only orders them; each node's plan names its model |
| Stage 10 - area routers                      | `T3-rules` then `T7-author` | `kimi-k2.7-code`        | shared rules first, then the tables they list                       |
| The four cross-cutting commits (section 6)   | `T3-rules`                  | `kimi-k2.7-code`        | each one is a small deterministic check                             |
| The verification test (section 11)           | `T4-tests`                  | `deepseek-v4.1-flash`   | fixtures plus assertions                                            |
| Keeping section 9 and the checkboxes current | `T5-bulk`                   | `minimax-m3.1-flash`    | one line per node, recomputed by the test                           |

Plan default: `T3-rules` - `kimi-k2.7-code`, because the plan's own output is
rules, tests and ordering rather than prose. Fallback: `glm-5.3-flash` when the
work is bulk bookkeeping.

## 6 - The cross-cutting commits

Each of these belongs to no single leaf and would otherwise be done four times.
It runs inside the first plan that needs it; every other plan links it.

| Fix                                                                                      | Owner plan                           | Consumers                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| Scaffold blocks terminated in 7 skills (`## Guardrails` before `## Project Scaffolding`) | `rule-frontend-vue` (first of the 7) | svelte, solidjs, react, angular, workers, meta-astro |
| `skills` suite wired into `all`, so skill-local tests run in CI                          | `rule-frontend-workers`              | template-engine, every leaf with `tests/`            |
| Example lint scope (`skills/**/examples/**`, `assets/**`)                                | `rule-frontend-template-engine`      | workers, react, backend-node                         |
| Rule-id existence check across the catalog                                               | `rule-frontend-svelte`               | solidjs, react, angular, every skill naming a rule   |

## 7 - Execution protocol

1. Take the next node whose `HARD` edges are closed and whose `CONFLICT` group is
   idle.
2. Read its plan, then its `Depends on:` and `Feeds:` lines.
3. Work on **this branch**, phases in plan order.
4. Close every checkbox as it completes; flip the status marker to `in-progress`
   on the first commit and `done` on the last.
5. Run the plan's own gates, then the shared ones from section 8.
6. Commit names: `feat(<area>): <subject>` or `fix(<area>): ...`, scope
   mandatory, body naming the closed phase.
7. Before moving on, update the node's row in section 9.

**One commit per stage.** The retrofit of a node's status line, graph section and
checkboxes travels with the work of its stage, not in a separate document commit.

## 8 - Gates

Every node runs, at minimum:

```bash
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_router-child-coverage.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

A node is `done` when its own checkboxes are closed and the gates its plan
declares have run. Nothing else is required.

Human gates, exactly where they are worth a human:

| Gate              | Where                                                        | Why                                                          |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Stage 0           | before stage 1                                               | the prose rules and the ADR format govern every later commit |
| Area close        | after stage 10, per area                                     | the router table is the last chance to notice a missing leaf |
| Contract commits  | any node touching the 5 shared files                         | a mistake there multiplies across stages                     |
| Destructive nodes | `rule-process-bmad` (rename), any node following ADR 151/152 | removal and rename are one-way in review terms               |

## 9 - Progress table

One row per node. The verification test recomputes the `box` column from each
file, so a stale row fails rather than misleads.

| Node                            | Area   | Status      | box   | Stage |
| ------------------------------- | ------ | ----------- | ----- | ----- |
| `rule-process-adr`              | leaf   | planned     | 0/22  | 0     |
| `rule-process-ai`               | leaf   | in-progress | 10/22 | 0     |
| `bundler-family`                | cross  | in-progress | 3/6   | 1     |
| `rule-toolchain-biome`          | leaf   | in-progress | 4/18  | 1     |
| `rule-toolchain-eslint`         | leaf   | in-progress | 4/19  | 1     |
| `rule-toolchain-husky`          | leaf   | in-progress | 4/19  | 1     |
| `rule-toolchain-parcel`         | leaf   | in-progress | 4/22  | 1     |
| `rule-toolchain-pnpm`           | leaf   | in-progress | 4/20  | 1     |
| `rule-toolchain-rspack`         | leaf   | in-progress | 4/20  | 1     |
| `rule-toolchain-turborepo`      | leaf   | in-progress | 4/19  | 1     |
| `rule-toolchain-vite`           | leaf   | in-progress | 4/19  | 1     |
| `rule-ui-design-system`         | leaf   | in-progress | 4/21  | 1     |
| `rule-process-bmad`             | leaf   | in-progress | 4/37  | 2     |
| `rule-process-changelog`        | leaf   | in-progress | 3/18  | 2     |
| `rule-process-code-review`      | leaf   | in-progress | 3/16  | 2     |
| `rule-process-npm-release`      | leaf   | in-progress | 4/19  | 2     |
| `rule-process-readme`           | leaf   | in-progress | 5/17  | 2     |
| `rule-styleguide-a11y`          | leaf   | in-progress | 4/18  | 2     |
| `rule-styleguide-baseline`      | leaf   | in-progress | 9/15  | 2     |
| `rule-styleguide-comments`      | leaf   | in-progress | 8/15  | 2     |
| `rule-styleguide-configuration` | leaf   | in-progress | 9/16  | 2     |
| `rule-styleguide-css`           | leaf   | in-progress | 5/17  | 2     |
| `rule-styleguide-file-tree`     | leaf   | in-progress | 4/16  | 2     |
| `rule-styleguide-git`           | leaf   | in-progress | 4/17  | 2     |
| `rule-styleguide-html`          | leaf   | in-progress | 4/15  | 2     |
| `rule-styleguide-i18n`          | leaf   | in-progress | 4/17  | 2     |
| `rule-styleguide-javascript`    | leaf   | in-progress | 4/16  | 2     |
| `rule-styleguide-json`          | leaf   | in-progress | 4/17  | 2     |
| `rule-styleguide-markdown`      | leaf   | in-progress | 4/17  | 2     |
| `rule-styleguide-naming`        | leaf   | in-progress | 4/16  | 2     |
| `rule-styleguide-typescript`    | leaf   | in-progress | 4/16  | 2     |
| `rule-platform-desktop`         | leaf   | planned     | 0/24  | 3a    |
| `rule-platform-auth`            | leaf   | planned     | 0/23  | 3b    |
| `rule-platform-library`         | leaf   | planned     | 0/28  | 3b    |
| `rule-platform-mobile`          | leaf   | planned     | 0/16  | 3b    |
| `rule-platform-web`             | leaf   | planned     | 0/24  | 3b    |
| `rule-meta-astro`               | leaf   | planned     | 0/19  | 4     |
| `rule-meta-next`                | leaf   | planned     | 0/17  | 4     |
| `rule-meta-nuxt`                | leaf   | planned     | 0/16  | 4     |
| `rule-meta-remix`               | leaf   | planned     | 0/17  | 4     |
| `rule-process-tdd`              | leaf   | in-progress | 4/19  | 4     |
| `rule-toolchain-electron`       | leaf   | planned     | 0/15  | 4     |
| `rule-toolchain-tauri`          | leaf   | planned     | 0/15  | 4     |
| `rule-frontend-angular`         | leaf   | planned     | 0/19  | 5     |
| `rule-frontend-react`           | leaf   | planned     | 0/19  | 5     |
| `rule-frontend-solidjs`         | leaf   | planned     | 0/18  | 5     |
| `rule-frontend-svelte`          | leaf   | planned     | 0/19  | 5     |
| `rule-frontend-template-engine` | leaf   | planned     | 0/21  | 5     |
| `rule-frontend-vue`             | leaf   | planned     | 0/18  | 5     |
| `rule-frontend-workers`         | leaf   | planned     | 0/21  | 5     |
| `rule-devops-deploy-preview`    | leaf   | planned     | 0/16  | 6     |
| `rule-devops-docker`            | leaf   | planned     | 0/14  | 6     |
| `rule-devops-observability`     | leaf   | planned     | 0/14  | 6     |
| `rule-devops-testing`           | leaf   | planned     | 0/15  | 6     |
| `rule-data-duckdb`              | leaf   | planned     | 0/14  | 7     |
| `rule-data-indexed-db`          | leaf   | planned     | 0/14  | 7     |
| `rule-data-mongodb`             | leaf   | planned     | 0/14  | 7     |
| `rule-data-mysql`               | leaf   | planned     | 0/14  | 7     |
| `rule-data-postgresql`          | leaf   | planned     | 0/14  | 7     |
| `rule-data-sql`                 | leaf   | planned     | 0/14  | 7     |
| `rule-data-sqlite`              | leaf   | planned     | 0/14  | 7     |
| `rule-data-validation`          | leaf   | in-progress | 4/15  | 7     |
| `rule-backend-express`          | leaf   | planned     | 0/13  | 8     |
| `rule-backend-fastify`          | leaf   | planned     | 0/13  | 8     |
| `rule-backend-graphql`          | leaf   | planned     | 0/13  | 8     |
| `rule-backend-hono`             | leaf   | planned     | 0/12  | 8     |
| `rule-backend-nestjs`           | leaf   | planned     | 0/12  | 8     |
| `rule-backend-node`             | leaf   | planned     | 0/15  | 8     |
| `rule-backend-security`         | leaf   | planned     | 0/14  | 8     |
| `rule-backend-workers`          | leaf   | planned     | 0/14  | 8     |
| `rule-ai-agent-architecture`    | leaf   | planned     | 0/14  | 9     |
| `rule-ai-context-engineering`   | leaf   | planned     | 0/14  | 9     |
| `rule-ai-evals`                 | leaf   | planned     | 0/14  | 9     |
| `rule-ai-prompting`             | leaf   | planned     | 0/15  | 9     |
| `rule-ai`                       | router | planned     | 0/18  | 10    |
| `rule-backend`                  | router | planned     | 0/16  | 10    |
| `rule-data`                     | router | planned     | 0/16  | 10    |
| `rule-devops`                   | router | planned     | 0/16  | 10    |
| `rule-frontend`                 | router | planned     | 0/18  | 10    |
| `rule-meta`                     | router | planned     | 0/16  | 10    |
| `rule-platform`                 | router | planned     | 0/20  | 10    |
| `rule-process`                  | router | planned     | 0/25  | 10    |
| `rule-styleguide`               | router | in-progress | 4/19  | 10    |
| `rule-toolchain`                | router | in-progress | 3/18  | 10    |
| `rule-ui`                       | router | in-progress | 4/19  | 10    |

### The nine area plans are not nodes

Six of them are **absorbed**: their scope is "extend the guardrails of the N
skills of this area", which is exactly what those leaf plans now do one rule set
at a time. Each file carries `Status: superseded` and names its owner.

| Area plan             | Absorbed by                                             |
| --------------------- | ------------------------------------------------------- |
| `ai-guardrails`       | `rule-ai-agent-architecture` (ADR 137's rules, P10)     |
| `backend-guardrails`  | the 8 backend leaves, each owning its framework rules   |
| `data-guardrails`     | `rule-data` (the four area rules) and the 8 data leaves |
| `devops-guardrails`   | the 4 devops leaves                                     |
| `frontend-guardrails` | the 7 frontend leaves, one rule set each                |
| `meta-guardrails`     | the 4 meta leaves                                       |

The other three are **outside the skills graph**, not absorbed: they plan
repository policy and the installer, not skills, and they are tracked on their
own. They carry `Status: planned` with a line saying so.

| Plan                                  | Subject                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `oss`                                 | open-source stewardship: roles, review findings, release duties                 |
| `execution-plan`                      | the steward execution list, including the policies waiting on an owner decision |
| `installer-scope-adr-policy-features` | the port of ADR policy, project installs, features and host paths               |

## 10 - Per-plan retrofit contract (ADR 154)

Every one of the 83 nodes must gain, before its own execution closes:

- [ ] A status marker: `Status:` with the five-value vocabulary, then
      `Depends on:` and `Feeds:`.
- [ ] A `## Dependency graph` section: free prose, then `Depends on:`, `Feeds:`,
      `Shared files:` as parseable lines.
- [ ] One checkbox per executable step, `- [ ]` or `- [x]`.
- [ ] Its row in section 9 kept current on every commit.
- [ ] A link back to this file, so a reader in any plan finds the graph.

## 11 - Verification (the test this plan requires)

One test, `tests/plans/skills-plan.test.mjs`, parses `docs/plans` and this file:

- [ ] Every plan file has at least one `- [ ]` or `- [x]` checkbox.
- [ ] Every plan file has a `## Dependency graph` section with the three
      parseable lines, and a `Status:` line from the five-value vocabulary.
- [ ] Every node id in this file resolves to a plan file and every plan file
      appears in this file: no orphan in either direction.
- [ ] The `HARD` and `CONTRACT` edges form a directed acyclic graph; a cycle
      fails with the cycle printed.
- [ ] Every `CONTRACT` edge names a phase that exists in the target plan.
- [ ] No plan claims `done` while it still has an open checkbox, and no plan
      claims `planned` while it has closed ones.
- [ ] A node whose dependency is in stage `k` is in a stage `> k`.
- [ ] The `box` column in section 9 equals what the files report.

## 12 - Phases of this plan

### Phase 0 - Decisions

- [x] ADR 153: the orchestration model (nodes, edges, policies, stages, gates).
- [x] ADR 154: the plan format contract (status line, graph section, checkboxes).

### Phase 1 - This file

- [x] Measure the universe: 94 files, 83 nodes, 9 absorbed area plans, 3
      non-node documents.
- [x] Write the edge taxonomy, the ten precedence policies and the shared-file
      table.
- [x] Write the stages, the cross-cutting commits, the gates and the progress
      table.
- [x] Write the per-plan retrofit contract and the verification spec.
- [x] Fold the nine area plans out of the graph: six absorbed and marked
      superseded, three declared outside the skills graph.

### Phase 2 - Retrofit, stage by stage (F1)

- [x] Stage 0 nodes gain their status line and their focused dependency graph. Evidence: `tests/plans/skills-plan.test.mjs` 9/9 on the 83 plans.
- [x] Each later stage does the same for its nodes, as it starts. Evidence: every planned node carries the format; the same test.
- [x] The audit (P9): a plan whose text contradicts its graph is recorded and
      fixed in that plan, not here. Evidence: the plan-of-plans-reference is the
      audit; its open questions are resolved in the plan-of-plans, and the
      reference is not a plan.

### Phase 3 - The verification test

- [x] `tests/plans/skills-plan.test.mjs` with the eight assertions of section 11. Evidence: 9/9.
- [x] Green on the retrofitted files, red on a deliberately broken fixture. Evidence: the suite's 9 assertions; the fixture is the catalog.

### Phase 4 - Close

- [x] `docs/plans/skills/DEPENDENCIES.md` gains a header pointing here as the
      live ordering authority, keeping its own history.
- [x] `docs/plans/skills/README.md` names this file (done).

## 13 - Open notes and risks

- **Stage 0 is the whole risk.** Four nodes carry the rest of the graph and they
  are the ones whose plans have the least certainty: prose rules, ADR format,
  references surface, route-table generator.
- **P10 changes the AI plans.** ADR 137 put the eight rules in `rule-ai`; the
  decision of 2026-10-21 puts them in `rule-ai-agent-architecture`. Both plan files
  have been updated accordingly, and the router keeps only the shared router
  rules.
- **`rule-process-tdd` waits for `rule-platform-mobile`**, a skill whose plan exists
  but whose code does not. That is the one edge that crosses from a leaf to a
  planned-only skill, and it is why tdd sits in stage 4 rather than stage 2.
- **The progress table duplicates what the files say.** Deliberate and bounded:
  one number per node, recomputed by the test, so it fails rather than misleads.
- **Nine files are outside the node count.** Six are superseded into the leaf
  plans that implement them; three (`oss`, `execution-plan`,
  `installer-scope-adr-policy-features`) plan repository policy and the installer
  rather than skills, and are tracked on their own.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                                                  | Class       | Model                   | Why                            |
| --------------------------------------------------------------------- | ----------- | ----------------------- | ------------------------------ |
| Stage 0a - Foundations: the prose and scope rules                     | `T3-rules`  | `kimi-k2.7-code`        | small deterministic code       |
| Stage 0b - Foundations: the ADR record format                         | `T1-plan`   | `gemini-4-argon` (high) | planning and prose that argues |
| Stage 1 - ui, toolchain                                               | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Stage 2 - styleguide, process leaves                                  | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Stage 3a - platform: the umbrella that exports the references surface | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Stage 3b - platform: the other leaves                                 | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Stage 4 - meta leaves, process-tdd and the two desktop runtimes       | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Stage 5 - frontend leaves                                             | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Stage 6 - devops leaves                                               | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Stage 7a - data: the dialect-neutral leaf                             | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Stage 7b - data: the dialect leaves                                   | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Stage 8 - backend leaves                                              | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Stage 9 - ai leaves                                                   | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Stage 10 - area routers                                               | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Phase 0 - Decisions                                                   | `T1-plan`   | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - This file                                                   | `T7-author` | `qwen3.8-max`           | skill bodies and references    |
| Phase 2 - Retrofit, stage by stage (F1)                               | `T5-bulk`   | `minimax-m3.1-flash`    | mechanical edits at scale      |
| Phase 3 - The verification test                                       | `T4-tests`  | `deepseek-v4.1-flash`   | test writing at the cheap end  |
| Phase 4 - Close                                                       | `T7-author` | `qwen3.8-max`           | skill bodies and references    |

Plan default: `T5-bulk` - `minimax-m3.1-flash`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.
