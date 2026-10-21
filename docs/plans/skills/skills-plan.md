# skills-plan - the orchestration plan for every plan in the catalogue

Status: `in-progress`. This is the one plan that does not plan a skill: it plans
the execution of the other 83 plans, in dependency order, on this branch.

Where it lives: `docs/plans/skills/skills-plan.md`, inside the skills catalogue it
orchestrates, so the structure used to plan the skills is the structure used to
plan their execution.

Scope: **this branch only** (`feat/guardrails-evolution`). Other branches
(`feat/decision-models`, `feat/export`, `feat/nyx`, `develop`) are out of scope
and named here only so nobody looks for their plans in this graph.

Decisions recorded: ADR 153 (this model), ADR 154 (the plan format contract).

## 1 - The universe

Measured on 2026-10-21 on this branch: **94 files** under `docs/plans` before this
file existed, 95 after.

| Kind | Count | In the graph |
| ---- | ----- | ------------ |
| Skill plans (`docs/plans/skills/<area>/<skill>.md`) | 82 | yes, one node each |
| Cross-skill plan (`docs/plans/skills/toolchain/bundler-family.md`) | 1 | yes: a shared contract for Vite, Rspack and Parcel, owned by `rule-toolchain` |
| Area plans (`docs/plans/*-guardrails.md`, `oss.md`, `execution-plan.md`, `installer-scope-adr-policy-features.md`) | 9 | **no**: absorbed, see section 9 |
| `docs/plans/skills/README.md` | 1 | no: it is the index table |
| `docs/plans/skills/DEPENDENCIES.md` | 1 | no: superseded by section 5, kept as history |
| `docs/plans/skills/skills-plan.md` | 1 | no: this file orchestrates, it is not work |

**Graph nodes: 83.** Measured baseline for the retrofit: every plan file already
has `- [ ]` checkboxes except two of the nine area plans; **no plan carries a
status marker**; **no plan has a `## Dependency graph` section** (39 mention
dependencies in prose, 4 have a heading named for them); 35 plans have at least
one closed step and none is `done`.

## 2 - Vocabulary

**Node** = one plan file. Its id is the skill name (`rule-data-sql`) or, for the
cross-skill plan, `bundler-family`.

**Edge** - four kinds, each with different executor semantics:

| Kind | Meaning | Executor rule |
| ---- | ------- | ------------- |
| `HARD` | B cannot start before A is closed | block |
| `ORDER` | B can start, but starting after A avoids rebase churn | warn |
| `CONFLICT` | A and B edit the same shared file | serialise: never both in flight |
| `CONTRACT` | A exports a surface B consumes (rule set, generator, resource) | block on A's exporting phase, not on all of A |

**Phase reference.** A `CONTRACT` edge names the exporting phase: `A#3` means
"B depends on phase 3 of A". That keeps nodes at plan granularity while still
allowing Stage 0 contracts.

**Status marker** - first line after the H1, five values:

| Value | Means |
| ----- | ----- |
| `planned` | written, not started |
| `in-progress` | at least one step closed, not all |
| `blocked` | waiting on a `HARD` or `CONTRACT` edge that is not exported yet |
| `done` | every step closed and the plan's own gates have run |
| `superseded` | replaced by another document, which the line names |

**Graph section** - `## Dependency graph`, free prose plus three parseable lines:

```
Depends on: rule-process#2 (CONTRACT), rule-frontend-workers (HARD)
Feeds: rule-frontend (HARD)
Shared files: skills/rule/SKILL.md, tests/fixtures/guardrail-corpus.mjs
```

**Checkbox contract** - `- [ ]` while open, `- [x]` when closed, lowercase x, no
other marker form. The test normalises `[X]` rather than rejecting it.

## 3 - Precedence policies

| id | Policy | Source |
| -- | ------ | ------ |
| P1 | `rule-process-ai` closes before any other plan starts | `DEPENDENCIES.md`: it owns prose, scope and gates, and every plan is a document |
| P2 | A leaf closes before the router of its area | a router table can only list children that exist |
| P3 | `rule-process-bmad` (= `rule-method`) closes before `rule-process` | its plan edits the `rule-process` table and removes the BMAD row |
| P4 | `rule-process#2` (shared router rules) and `rule-process#3` (route-table generator) close before the 7 routers that consume them | measured: ai, backend, data, devops, frontend, meta, platform each wait for both |
| P5 | `rule-platform-desktop#3` (served-references surface) closes before the 9 plans that move files into `references/` | measured: 9 plan files name that surface |
| P6 | Areas run in the order `ui, toolchain, styleguide, process, platform, meta, frontend, devops, data, backend, ai`, except where P3-P5 or P7 move a node | `DEPENDENCIES.md` |
| P7 | A plan that removes or renames a skill runs alone, after its area's leaves, with a human gate | ADR 151, ADR 152 |
| P8 | Two plans that share a file in section 4 never run concurrently | measured: 5 shared files |
| P9 | When a plan's text contradicts this graph, the contradiction is an audit finding, not a silent override | this plan |
| P10 | Every area follows P2 with no exception, including AI: ADR 137's eight rules live in `rule-ai-agent-architecture`, the leaf that consumes them, not in the router | decision of 2026-10-21 |

## 4 - Shared files and conflict edges

| File | Written by | Serialisation |
| ---- | ---------- | ------------- |
| `skills/rule/SKILL.md` (dispatcher) | every plan that opens a door, plus `rule-process` (regeneration) | one plan at a time; regenerate once at the end of a stage |
| `scripts/data/router-gaps.data.mjs` | 5 router plans and the leaf plans that delete their own entry | one plan at a time |
| `docs/adr/ADR.md` + ADR numbering | every plan (2 ADRs each) | allocation is global: a merged commit takes the next free numbers; a rebase that collides re-numbers |
| `tests/fixtures/census.json` + the 6 generated docs | every plan that changes a skill, a rule or a count | regenerate at the end of each stage, never mid-plan |
| `tests/fixtures/guardrail-corpus.mjs` | every plan that adds a rule (most of them) | one plan at a time, append-only in practice |

## 5 - The graph, stage by stage

Stages are ordered. Inside a stage, nodes are parallel unless a `HARD` edge says
otherwise.

### Stage 0 - Foundations (contract exports, in this order)

| Order | Node | Exports |
| ----- | ---- | ------- |
| 1 | `rule-process-ai` | prose, scope and gate rules (P1) |
| 2 | `rule-process-adr` | ADR record format, `reviewed:` mechanism |
| 3 | `rule-platform-desktop#3` | served-references surface (P5) |
| 4 | `rule-process#2`, `rule-process#3` | the 6 shared router rules and the route-table generator (P4) |

The order inside the stage is deliberate: the prose rules govern every later
commit, the ADR format governs every later record, and only then do the two
contracts that unblock 9 and 7 plans respectively.

Gate: the export phases are closed and their contracts are named in the plans
that consume them. **Human gate** on `rule-process-adr` (it defines the record
format for every later plan) and on the whole stage before stage 1 starts.

### Stage 1 - ui, toolchain (12 nodes)

`rule-ui`, `rule-ui-design-system`, the 8 `rule-toolchain-*` skill plans,
`bundler-family` (the shared contract those bundler leaves inherit) and
`rule-toolchain` if P2 lets it in. `rule-toolchain-electron` and
`rule-toolchain-tauri` do not exist yet and have no plan: they are deliverables of
`rule-platform-desktop#4` and become nodes when their plans are written.

Gate: `_router-child-coverage` and `_corpus` green.

### Stage 2 - styleguide, process leaves (22 nodes)

15 styleguide nodes and the 7 process leaves. `rule-process-bmad` closes here (P3)
and exports the `rule-method` family. `rule-process-tdd` is **not** in this stage:
it carries a `CONTRACT` edge to `rule-platform-mobile#2` and moves to stage 4.

Gate: corpus green. **Human gate** on `rule-process-bmad` (it renames a family).

### Stage 3 - platform leaves (6 nodes)

`rule-platform-web`, `rule-platform-library`, `rule-platform-auth`,
`rule-platform-desktop`, `rule-platform-mobile`, and `rule-platform` if P2 lets it
in. `rule-platform-agent` is not a node: removed in ADR 151, its plan with it.

`rule-platform-desktop#4` creates `rule-toolchain-electron` and
`rule-toolchain-tauri`, which become nodes only when their plans are written.

Gate: the 9 references-consuming plans in stage 4+ can now start.

### Stage 4 - meta leaves, plus `rule-process-tdd` (6 nodes)

`rule-meta-astro` (the 347-line scaffold defect), `rule-meta-next`, `rule-meta-nuxt`,
`rule-meta-remix`, and `rule-process-tdd` once `rule-platform-mobile#2` has exported
`mobile-test-runner`.

### Stage 5 - frontend leaves (7 nodes)

`rule-frontend-workers`, `rule-frontend-vue`, `rule-frontend-svelte`,
`rule-frontend-solidjs`, `rule-frontend-react`, `rule-frontend-angular`,
`rule-frontend-template-engine`. The scaffold-termination fix that 7 leaves share
is a cross-cutting commit in section 6, not a node.

### Stage 6 - devops leaves (4 nodes)

`rule-devops-testing` (exports the runner policy), `rule-devops-docker`,
`rule-devops-observability`, `rule-devops-deploy-preview`.

### Stage 7 - data leaves (8 nodes)

`rule-data-sql` closes first (the four dialect leaves link its generic DDL), then
`rule-data-sqlite`, `rule-data-postgresql`, `rule-data-mysql`, `rule-data-mongodb`,
`rule-data-duckdb`, `rule-data-indexed-db`, `rule-data-validation`.

### Stage 8 - backend leaves (8 nodes)

`rule-backend-security` (carries a `CONTRACT` edge from `rule-platform-auth`),
`rule-backend-node`, `rule-backend-nestjs`, `rule-backend-hono`,
`rule-backend-graphql`, `rule-backend-fastify`, `rule-backend-express`,
`rule-backend-workers`.

### Stage 9 - ai leaves (4 nodes)

`rule-ai-prompting`, `rule-ai-evals`, `rule-ai-context-engineering`,
`rule-ai-agent-architecture`. The last one owns ADR 137's eight rules (P10), so the
area needs no exception and no early router: the rules land in the leaf, and
`rule-ai` lists them in stage 10 like every other router.

### Stage 10 - area routers (11 nodes)

`rule-ai`, `rule-backend`, `rule-data`, `rule-devops`, `rule-frontend`, `rule-meta`,
`rule-platform`, `rule-process`, `rule-styleguide`, `rule-toolchain`, `rule-ui`. Each
is `HARD`-blocked by its own leaves (P2) and, for the seven that carry route
tables, by `rule-process#2` and `#3` (P4). They are `CONFLICT` with each other on
the dispatcher and on `router-gaps`, so they serialise.

**Human gate** at area close, per area.

## 6 - The cross-cutting commits

Each of these belongs to no single leaf and would otherwise be done four times.
It runs inside the first plan that needs it; every other plan links it.

| Fix | Owner plan | Consumers |
| --- | ---------- | --------- |
| Scaffold blocks terminated in 7 skills (`## Guardrails` before `## Project Scaffolding`) | `rule-frontend-vue` (first of the 7) | svelte, solidjs, react, angular, workers, meta-astro |
| `skills` suite wired into `all`, so skill-local tests run in CI | `rule-frontend-workers` | template-engine, every leaf with `tests/` |
| Example lint scope (`skills/**/examples/**`, `assets/**`) | `rule-frontend-template-engine` | workers, react, backend-node |
| Rule-id existence check across the catalog | `rule-frontend-svelte` | solidjs, react, angular, every skill naming a rule |

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

| Gate | Where | Why |
| ---- | ----- | --- |
| Stage 0 | before stage 1 | the prose rules and the ADR format govern every later commit |
| Area close | after stage 10, per area | the router table is the last chance to notice a missing leaf |
| Contract commits | any node touching the 5 shared files | a mistake there multiplies across stages |
| Destructive nodes | `rule-process-bmad` (rename), any node following ADR 151/152 | removal and rename are one-way in review terms |

## 9 - Progress table

One row per node. The verification test recomputes the `box` column from each
file, so a stale row fails rather than misleads. No node is `done`; 35 have at
least one closed step, all of them the work that landed before this graph existed.

| Area | Nodes | Status | box (closed/total) | Stage |
| ---- | ----: | ------ | ------------------ | ----- |
| process | 9 | `in-progress` (7 of 9 started) | adr 0/22, ai 10/22, bmad 4/37, changelog 3/18, code-review 3/16, npm-release 4/19, readme 5/17, tdd 4/19, process 0/25 | 0, 2, 4, 10 |
| ui | 2 | `in-progress` | 4/21, 4/19 | 1, 10 |
| toolchain | 10 | `in-progress` | bundler-family 3/6; the 8 skill plans 4 of 18-22 each; toolchain 3/18 | 1, 10 |
| styleguide | 15 | `in-progress` | 4-9 closed of 15-19 each (baseline and configuration lead at 9) | 2, 10 |
| platform | 6 | `planned` | 0 each | 3, 10 |
| meta | 5 | `planned` | 0 each | 4, 10 |
| frontend | 8 | `planned` | 0 each | 5, 10 |
| devops | 5 | `planned` | 0 each | 6, 10 |
| data | 9 | `planned` | validation 4/15; the rest 0 | 7, 10 |
| backend | 9 | `planned` | 0 each | 8, 10 |
| ai | 5 | `planned` | 0 each | 9, 10 |

### The nine area plans are not nodes

Six of them are **absorbed**: their scope is "extend the guardrails of the N
skills of this area", which is exactly what those leaf plans now do one rule set
at a time. Each file carries `Status: superseded` and names its owner.

| Area plan | Absorbed by |
| --------- | ----------- |
| `ai-guardrails` | `rule-ai-agent-architecture` (ADR 137's rules, P10) |
| `backend-guardrails` | the 8 backend leaves, each owning its framework rules |
| `data-guardrails` | `rule-data` (the four area rules) and the 8 data leaves |
| `devops-guardrails` | the 4 devops leaves |
| `frontend-guardrails` | the 7 frontend leaves, one rule set each |
| `meta-guardrails` | the 4 meta leaves |

The other three are **outside the skills graph**, not absorbed: they plan
repository policy and the installer, not skills, and they are tracked on their
own. They carry `Status: planned` with a line saying so.

| Plan | Subject |
| ---- | ------- |
| `oss` | open-source stewardship: roles, review findings, release duties |
| `execution-plan` | the steward execution list, including the policies waiting on an owner decision |
| `installer-scope-adr-policy-features` | the port of ADR policy, project installs, features and host paths |

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

### Phase 2 - Retrofit, stage by stage

- [ ] Stage 0 nodes gain their status line and their focused dependency graph.
- [ ] Each later stage does the same for its nodes, as it starts.
- [ ] The audit (P9): a plan whose text contradicts its graph is recorded and
      fixed in that plan, not here.

### Phase 3 - The verification test

- [ ] `tests/plans/skills-plan.test.mjs` with the eight assertions of section 11.
- [ ] Green on the retrofitted files, red on a deliberately broken fixture.

### Phase 4 - Close

- [ ] `docs/plans/skills/DEPENDENCIES.md` gains a header pointing here as the
      live ordering authority, keeping its own history.
- [ ] `docs/plans/skills/README.md` names this file (done).

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
