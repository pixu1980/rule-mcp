# skills-plan - the orchestration plan for every plan in the catalogue

Status: `planned`. This is the one plan that does not plan a skill: it plans the
execution of the other 92 plans, in dependency order, on this branch.

Where it lives: `docs/plans/skills/skills-plan.md`, inside the skills catalogue it
orchestrates, so the structure used to plan the skills is the structure used to
plan their execution.

Scope: **this branch only** (`feat/guardrails-evolution`). Other branches
(`feat/decision-models`, `feat/export`, `feat/nyx`, `develop`) are out of scope
and named here only so nobody looks for their plans in this graph.

## 1 - The universe

Measured on 2026-10-21 on this branch: **94 files** under `docs/plans`.

| Kind | Count | In the graph |
| ---- | ----- | ------------ |
| Skill plans (`docs/plans/skills/<area>/<skill>.md`) | 82 | yes, one node each |
| Cross-skill plan (`docs/plans/skills/toolchain/bundler-family.md`) | 1 | yes: a shared contract for Vite, Rspack and Parcel, owned by `rule-toolchain` |
| Area plans (`docs/plans/*-guardrails.md`, `oss.md`, `execution-plan.md`, `installer-scope-adr-policy-features.md`) | 9 | yes, one node each |
| `docs/plans/skills/README.md` | 1 | no: it is the index table |
| `docs/plans/skills/DEPENDENCIES.md` | 1 | no: superseded by section 5 of this file, kept as history |
| `docs/plans/skills/skills-plan.md` | 1 | no: this file orchestrates, it is not work |

**Graph nodes: 92** (82 skill plans + 1 cross-skill plan + 9 area plans). The
three documents that are not nodes are covered by this table; they are not work
units, so they never carry checkboxes of their own.

Every one of the 83 plan files already has `- [ ]` checkboxes except two of the
nine area plans. The gaps are uniform: **no plan carries a status marker**, **no
plan has a `## Dependency graph` section** (39 mention dependencies somewhere in
prose, 4 have a heading named for them), and progress lives nowhere except inside
each file. 35 plans have at least one closed box; none is `done`.

## 2 - Vocabulary

**Node** = one plan file. Its id is the skill name (`rule-data-sql`) or the area
plan name (`frontend-guardrails`).

**Edge** - four kinds, and each kind means something different to the executor:

| Kind | Meaning | Executor rule |
| ---- | ------- | ------------- |
| `HARD` | B cannot start before A is closed | block |
| `ORDER` | B can start, but starting after A avoids rebase churn | warn |
| `CONFLICT` | A and B edit the same shared file | serialise: never both in flight |
| `CONTRACT` | A exports a surface B consumes (rule set, generator, resource) | block on A's exporting phase, not on all of A |

**Phase reference.** A `CONTRACT` edge names the exporting phase: `A#3` means
"B depends on phase 3 of A". This is what keeps nodes at plan granularity while
still allowing wave-0 contracts.

**Status marker** - one line, first line of every plan after the title:
`Status: \`planned\` | \`in-progress\` | \`done\` | \`superseded\``, followed by
`Depends on: ...` and `Feeds: ...`.

**Checkbox contract** - every step is `- [ ]` while open and `- [x]` when closed.
No other marker forms. A phase that is not a step does not get a box.

## 3 - Precedence policies

These are the rules the graph is built from. Each one exists because a plan in
this catalogue states it or because a measurement forced it.

| id | Policy | Source |
| -- | ------ | ------ |
| P1 | `rule-process-ai` closes before any other plan starts | `DEPENDENCIES.md`: it owns prose, scope and gates, and every plan is a document |
| P2 | A leaf closes before the router of its area | a router table can only list children that exist |
| P3 | `rule-process-bmad` (= `rule-method`) closes before `rule-process` | its plan edits the `rule-process` table and removes the BMAD row |
| P4 | `rule-process#2` (shared router rules) and `rule-process#3` (route-table generator) close before the 7 routers that consume them | measured: ai, backend, data, devops, frontend, meta, platform each wait for both |
| P5 | `rule-platform-desktop#3` (served-references surface) closes before the 9 plans that move files into `references/` | measured: 9 plan files name that surface |
| P6 | Areas run in the order `ui, toolchain, styleguide, process, platform, meta, frontend, devops, data, backend, ai`, except where P4/P5/P7 move a node earlier | `DEPENDENCIES.md` |
| P7 | A plan that removes or renames a skill runs alone, after its area's leaves, with a human gate | ADR 151, ADR 152 |
| P8 | Two plans that share a file in section 4 never run concurrently | measured: 5 shared files |
| P9 | When a plan's text contradicts this graph, the contradiction is an audit finding, not a silent override | this plan |

## 4 - Shared files and conflict edges

Five files are written by many plans. Each row is a `CONFLICT` edge class.

| File | Written by | Serialisation |
| ---- | ---------- | ------------- |
| `skills/rule/SKILL.md` (dispatcher) | every plan that opens a door, plus `rule-process` (regeneration) | one plan at a time; regenerate once at the end of a stage |
| `scripts/data/router-gaps.data.mjs` | 5 router plans and the leaf plans that delete their own entry | one plan at a time |
| `docs/adr/ADR.md` + ADR numbering | every plan (2 ADRs each) | allocation is global: a merged PR takes the next free numbers; a rebase that collides re-numbers |
| `tests/fixtures/census.json` + the 6 generated docs | every plan that changes a skill, a rule or a count | regenerate at the end of each stage, never mid-plan |
| `tests/fixtures/guardrail-corpus.mjs` | every plan that adds a rule (most of them) | one plan at a time, append-only in practice |

## 5 - The graph, stage by stage

Stages are ordered. Inside a stage, nodes are parallel unless a `HARD` edge says
otherwise. The gate column names what must pass before the next stage starts.

### Stage 0 - Foundations (contract exports)

| Node | Exports | Notes |
| ---- | ------- | ----- |
| `rule-process-ai` | prose, scope and gate rules | P1 |
| `rule-process-adr` | ADR conventions, `reviewed:` mechanism | ADRs 149-152 already exist, written by hand |
| `rule-platform-desktop#3` | served-references surface | P5, unblocks stage 4 |
| `rule-process#2` | the 6 shared router rules | P4, unblocks stage 8 |
| `rule-process#3` | the route-table generator | P4, unblocks stage 8 |

Gate: the export phases are closed and their contracts are named in the plans
that consume them. Human gate on `rule-process-adr` (it defines the record format
for every later plan).

### Stage 1 - ui, toolchain

12 nodes: `rule-ui`, `rule-ui-design-system`, the 8 `rule-toolchain-*` skill plans,
`rule-toolchain` (the router, which P2 pushes to stage 10) and
`bundler-family` (the cross-skill contract those three bundler leaves inherit).

`rule-toolchain-electron` and `rule-toolchain-tauri` do not exist yet and have no
plan: they are deliverables of `rule-platform-desktop#4`, and they become nodes
when their plans are written.

Gate: `_router-child-coverage` and `_corpus` green.

### Stage 2 - styleguide, process leaves

15 styleguide nodes, then the 8 process leaves. `rule-process-bmad` closes here
(P3) and exports the `rule-method` family. `rule-process-tdd` carries a `CONTRACT`
edge to `rule-platform-mobile#2` (the `mobile-test-runner` rule it cites today as
a rule that does not exist).

Gate: corpus green; human gate on `rule-process-bmad` (it renames a family).

### Stage 3 - platform leaves

6 nodes: `rule-platform-web`, `rule-platform-library`, `rule-platform-auth`,
`rule-platform-desktop`, `rule-platform` (the router, stage 10) and
`rule-platform-mobile` - the planned skill whose plan already exists as row `#85`.

`rule-platform-agent` is not a node: it was removed in ADR 151 and its plan with
it. The catalogue's tombstone test keeps it from returning.

`rule-platform-desktop#4` creates `rule-toolchain-electron` and
`rule-toolchain-tauri`, which become nodes only when their own plans are written.

Gate: the 9 references-consuming plans in stage 4+ can now start.

### Stage 4 - meta leaves

5 nodes: `rule-meta-astro` (the 347-line scaffold defect), `rule-meta-next`,
`rule-meta-nuxt`, `rule-meta-remix`, and `rule-meta` (the router, stage 10).

### Stage 5 - frontend leaves

7 nodes: `rule-frontend-workers`, `rule-frontend-vue`, `rule-frontend-svelte`,
`rule-frontend-solidjs`, `rule-frontend-react`, `rule-frontend-angular`,
`rule-frontend-template-engine`. The area router is stage 10, and the
scaffold-termination fix that 7 leaves share is a cross-cutting commit in
section 6, not a node.

### Stage 6 - devops leaves

4 nodes: `rule-devops-testing` (exports the runner policy),
`rule-devops-docker`, `rule-devops-observability`,
`rule-devops-deploy-preview`. The router is stage 10.

### Stage 7 - data leaves

8 nodes: `rule-data-sql`, `rule-data-sqlite`, `rule-data-postgresql`,
`rule-data-mysql`, `rule-data-mongodb`, `rule-data-duckdb`,
`rule-data-indexed-db`, `rule-data-validation`. One `HARD` edge inside the stage:
`rule-data-sql` closes first, because the four dialect leaves link its generic
DDL. The router is stage 10.

### Stage 8 - backend leaves

8 nodes: `rule-backend-security`, `rule-backend-node`, `rule-backend-nestjs`,
`rule-backend-hono`, `rule-backend-graphql`, `rule-backend-fastify`,
`rule-backend-express`, `rule-backend-workers`. `rule-backend-security` carries a
`CONTRACT` edge from `rule-platform-auth` (the auth boundary decided there,
applied here).

### Stage 9 - ai leaves

4 nodes: `rule-ai-prompting`, `rule-ai-evals`, `rule-ai-context-engineering`,
`rule-ai-agent-architecture`. All four depend on `rule-ai#2` for ADR 137's eight
rules, which live in the router: this is the one area where the router must
export before its leaves finish, the inverse of P2. Recorded as an explicit
exception.

### Stage 10 - area routers

The 11 routers: `rule-ai`, `rule-backend`, `rule-data`, `rule-devops`,
`rule-frontend`, `rule-meta`, `rule-platform`, `rule-process`, `rule-styleguide`,
`rule-toolchain`, `rule-ui`. Each is `HARD`-blocked by its own leaves (P2) and by
`rule-process#2` and `#3` (P4). They are `CONFLICT` with each other on the
dispatcher and on `router-gaps`, so they serialise.

Gate: human gate at area close, per area.

### Stage 11 - area plans

9 nodes: `ai-guardrails`, `backend-guardrails`, `data-guardrails`,
`devops-guardrails`, `frontend-guardrails`, `meta-guardrails`, `oss`,
`execution-plan`, `installer-scope-adr-policy-features`. `frontend-guardrails`
is `HARD`-blocked by the frontend leaves it audits; `execution-plan` is
superseded by this file and is a `done` node by that fact.

## 6 - The cross-cutting commits

Four fixes belong to no single leaf and would otherwise be done four times. Each
one runs inside the first plan that needs it, and every other plan links it
instead of repeating it:

| Fix | Owner plan | Consumers |
| --- | ---------- | --------- |
| Scaffold blocks terminated in 7 skills (`## Guardrails` before `## Project Scaffolding`) | `rule-frontend-vue` (first of the 7) | svelte, solidjs, react, angular, workers, meta-astro |
| `skills` suite wired into `all` (so skill-local tests run in CI) | `rule-frontend-workers` | template-engine, custom-element tests, every leaf with `tests/` |
| Example lint scope (`skills/**/examples/**`, `assets/**`) | `rule-frontend-template-engine` | workers, react, backend-node |
| Rule-id existence check across the catalog | `rule-frontend-svelte` | solidjs, react, angular, every skill naming a rule |

## 7 - Execution protocol

1. Take the next node whose `HARD` edges are closed and whose `CONFLICT` group is
   idle.
2. Read its plan, then its `Depends on:` and `Feeds:` lines.
3. Work on **this branch**, one commit per phase, phases in plan order.
4. Close every checkbox as it is completed; flip the status marker to
   `in-progress` on first commit and `done` on the last.
5. Run the plan's own gates, then the shared ones from section 8.
6. Commit names: `feat(<area>): <plan subject>` or `fix(<area>): ...`, scope
   mandatory, body naming the closed phase.
7. Before moving on, update the progress row for this node in section 9.

## 8 - Gates

Every node runs, at minimum:

```bash
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_router-child-coverage.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

And these human gates, exactly where they are worth a human:

| Gate | Where | Why |
| ---- | ----- | --- |
| Area close | after stage 10, per area | the router table is the last chance to notice a missing leaf |
| Contract PRs | any node touching the 5 shared files in section 4 | a mistake there multiplies across stages |
| Destructive nodes | `rule-process-bmad` (rename), any node following ADR 151/152 | removal and rename are one-way in review terms |
| Stage 0 | before anything else starts | the prose rules and the ADR format govern every later commit |

## 9 - Progress table

Status is `planned` for every node today. `box` counts closed over total
checkboxes in the plan, and is the only progress number this file carries: the
plan is the record, this table is the summary.

| Area | Nodes | Status | box (closed/total) | Stage |
| ---- | ----: | ------ | ------------------ | ----- |
| process | 9 | `in-progress` (7 of 9 started) | adr 0/22, ai 10/22, bmad 4/37, changelog 3/18, code-review 3/16, npm-release 4/19, readme 5/17, tdd 4/19, process 0/25 | 0, 2, 10 |
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
| area plans | 9 | `planned` | 0 each | 11 |

No node is `done`. 35 of 92 have at least one closed step, all of them in process,
styleguide, toolchain, ui and one data plan: the work that landed before this
graph existed. Every other node starts at zero, which is the honest baseline
rather than a claim about the past.

## 10 - Per-plan retrofit contract

Every one of the 92 nodes must gain, before its own execution closes:

- [ ] A status marker: `Status:`, `Depends on:`, `Feeds:` as the first lines
      after the title (section 2).
- [ ] A `## Dependency graph` section, hand-written and focused on that plan: its
      own `HARD` and `CONTRACT` edges, the shared files it touches, and the nodes
      it unblocks. Short is fine; absent is not.
- [ ] One checkbox per executable step, in `- [ ]` / `- [x]` form only.
- [ ] Its row in section 9 of this file kept current on every commit.
- [ ] A link back to this file, so a reader in any plan can find the graph.

## 11 - Verification (the test this plan requires)

A single test, `tests/plans/skills-plan.test.mjs`, parses `docs/plans` and this
file and asserts:

- [ ] Every plan file has at least one `- [ ]` or `- [x]` checkbox.
- [ ] Every plan file has a `## Dependency graph` section and a `Status:` line.
- [ ] Every node id in this file resolves to a plan file, and every plan file
      appears in this file: no orphan in either direction.
- [ ] The `HARD` and `CONTRACT` edges form a directed acyclic graph; a cycle
      fails with the cycle printed.
- [ ] Every `CONTRACT` edge names a phase that exists in the target plan.
- [ ] No plan claims a status of `done` while it still has an open checkbox.
- [ ] The stage number in this file is consistent with the edges: a node whose
      dependency is in stage `k` is in stage `> k`.

## 12 - Phases of this plan

### Phase 0 - Decisions

- [ ] ADR: the orchestration model. Nodes are plans, edges are four kinds,
      execution is one commit per plan on this branch, gates are the four in
      section 8. Includes the AI-area exception (router exports before its
      leaves finish).
- [ ] ADR: the plan format contract. Status marker, `## Dependency graph` section,
      checkbox syntax, progress row; and the rule that a plan without them fails
      the test.

### Phase 1 - This file

- [x] Measure the universe: 94 files, 92 nodes, 2 indexes.
- [x] Write the edge taxonomy, the nine precedence policies and the shared-file
      table.
- [x] Write the stages, the cross-cutting commits, the gates and the progress
      table.
- [x] Write the per-plan retrofit contract and the verification spec.
- [ ] Create the two ADRs from Phase 0.

### Phase 2 - Retrofit, in stage order

- [ ] Stage 0 nodes gain their status marker and their focused dependency graph.
- [ ] Each later stage does the same for its nodes, as it starts.
- [ ] The audit (P9): any plan whose text contradicts its graph is recorded and
      fixed in that plan, not here.

### Phase 3 - The verification test

- [ ] `tests/plans/skills-plan.test.mjs` with the seven assertions of section 11.
- [ ] The test is green on the retrofitted files and red on a deliberately broken
      fixture.

### Phase 4 - Close

- [ ] `docs/plans/skills/DEPENDENCIES.md` gains a header pointing here as the
      live ordering authority, keeping its own history.
- [ ] `docs/plans/skills/README.md` gains one line naming this file.
- [ ] The two ADRs are indexed.

## 13 - Open notes and risks

- **Stage 0 is the whole risk.** `rule-process-ai` and `rule-process-adr` govern
  every later commit, the references surface unblocks nine plans, and the
  generator unblocks seven routers. Five nodes carry the rest of the graph, and
  four of them are the ones with the least certainty in their plans.
- **The AI area inverts P2.** Its router must export ADR 137's rules before its
  leaves can finish. That is the only place where a router precedes a leaf, and
  it is recorded as an exception rather than hidden.
- **`rule-process-tdd` cites a rule that does not exist** (`mobile-test-runner`,
  today written as "the `expo` rule"). It is a `CONTRACT` edge to
  `rule-platform-mobile`, a skill that is only planned. Either the mobile plan
  lands early or the tdd plan lands with a dangling reference and the rule stays
  red: the graph chooses the first, the schedule may not allow it.
- **Stage 11 contains one node that is already done by definition**:
  `execution-plan` is superseded by this file. It is listed so the count matches
  the 94 files, and it is not work.
- **The progress table duplicates what the files already say.** That duplication
  is deliberate and bounded: the table carries one number per node, and the test
  recomputes it, so a stale row fails rather than misleads.
