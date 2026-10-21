# plan-of-plans - cross-branch orchestration

Status: `planned`. This is the level-0 orchestrator: it decides which branch to
work in, which plan to implement next, and in what order the branches return to
`main`. It does not plan a skill.

Format: the contract of ADR 154 (status line, `## Dependency graph`, checkboxes)
applied to this file. ADR 153 and 154 live on `feat/guardrails-evolution` and are
not on `main` yet; this file follows them in advance, and the fold in stage 0
brings them here.

Scope: the **four local feature branches plus `main`**. `origin/develop` is out of
scope: it holds `architect.md`, `backlog.md` and `github.md`, which belong to the
`rule-mcp-architect` track, not to this catalogue.

## 1 - Branch inventory (measured 2026-10-21)

| Branch | Ahead of main | Unique commits | Plan files | Unique plan paths | Contended with `ge` |
| ------ | ------------: | -------------: | ---------: | ----------------: | ------------------: |
| `main` | 0 | - | 2 | 2 | - |
| `feat/guardrails-evolution` (`ge`) | 92 | 92 | 95 | 95 | - |
| `feat/decision-models` (`dm`) | 63 | **1** | 45 | 1 | **233 files** |
| `feat/export` (`ex`) | 5 | 5 | 3 | 1 | 3 files |
| `feat/nyx` (`nyx`) | 6 | 6 | 3 | 1 | 1 file |

Totals: **148 plan-file instances, 98 unique plan paths** across the four
branches and `main`. Every branch is 0 behind `main`, so no rebase onto main is
needed before the first merge.

### What the measurement says about `dm`

`feat/decision-models` is **`ge` minus one commit**:

- 29 of its 32 skill plans are **byte-identical** to `ge`'s;
- 3 differ by 1, 1 and 4 lines (`rule-process-ai.md`, `rule-styleguide-javascript.md`,
  `rule-ui.md`);
- the only plan it has that `ge` does not is `docs/plans/decision-models.md`;
- its only commit not in `ge` is `b27c088a chore(handoff): point session 24 at feat/decision-models`.

So `dm` is not a parallel branch. It is an earlier state of `ge` plus one handoff
pointer, and its 32 skill plans are **demanded to `ge`**: they belong to the
branch that owns the catalogue.

## 2 - What this file is not

`feat/guardrails-evolution` already carries a level-1 orchestrator,
`docs/plans/skills/skills-plan.md`: 83 nodes, stages 0-10, edge taxonomy, ten
precedence policies, human gates, and ADR 153/154 behind it. This file **delegates
to it**: for anything inside `ge`, the answer is in that file, not here.

The hierarchy is the decision, and it has one rule: **every branch that carries
more than one plan gets its own level-1 orchestrator, or this file says why not.**

| Branch | Level-1 orchestrator | State |
| ------ | -------------------- | ----- |
| `ge` | `docs/plans/skills/skills-plan.md` | exists, 83 nodes |
| `dm` | none, and it does not need one | folded into `ge` in stage 0 |
| `ex` | `docs/plans/export.md` gains a dependency section | retrofit |
| `nyx` | `docs/plans/2026-10-01-scripts-mcp-layout.md` gains a dependency section | retrofit |
| `main` | this file | plus `execution-plan.md` and `oss.md`, outside the skills graph |

## 3 - Nodes, two levels

**Level 1 - branches.** Five nodes: `main`, `ge`, `dm`, `ex`, `nyx`. They carry
the merge order and the rebase work.

**Level 2 - plans.** 98 nodes, one per unique plan path, each owned by exactly one
branch. A path that appears on two branches is one node with an owner and, when
the contents differ, a `DIVERGENCE` edge.

Every level-2 node carries these parseable lines in its own plan:

```
Branch: feat/guardrails-evolution
Path: docs/plans/skills/data/rule-data-sql.md
Depends on: rule-process#2 (CONTRACT), rule-data-sql (HARD)
Feeds: rule-data (HARD)
Shared files: tests/fixtures/guardrail-corpus.mjs
```

## 4 - Edge taxonomy

Four kinds inherited from ADR 153, four new ones for the cross-branch layer:

| Kind | Meaning | Executor rule |
| ---- | ------- | ------------- |
| `HARD` | B cannot start before A is closed | block |
| `ORDER` | B can start, but after A avoids churn | warn |
| `CONFLICT` | A and B edit the same shared file, same branch | serialise |
| `CONTRACT` | A exports a surface B consumes, named by phase | block on that phase |
| `MERGE` | Branch A must enter `main` before B | block the merge, not the work |
| `REBASE` | A and B touch the same path on different branches; one rebases after the other | order the rebase |
| `DIVERGENCE` | The same plan path exists on two branches with different content | reconcile before either is implemented |
| `SUPERSEDES` | A replaces B; B is not executed | retire B |

## 5 - The level-1 graph

```
dm --FOLD--> ge          (1 commit cherry-picked; 45 plan files removed, 1 kept)
ex --MERGE--> main       (3 contended files with ge)
nyx --MERGE--> main      (1 contended file with ge)
ge --MERGE--> main       (last: 413 changed files, carries the removals)
main --SUPERSEDES--> nothing; main receives, it does not orbit
```

Edges, spelled out:

| From | To | Kind | Why |
| ---- | -- | ---- | --- |
| `dm` | `ge` | `SUPERSEDES` | 29 identical copies, 3 diverged by ≤4 lines, 1 unique plan, 1 unique commit |
| `dm` -> `decision-models.md` | `ge` | `MERGE` | the one plan that survives the fold, and it moves with the commit |
| `ex` | `main` | `MERGE` | independent content (7 files), 3 shared generated files |
| `nyx` | `main` | `MERGE` | independent content (19 files), 1 shared generated file |
| `ge` | `main` | `MERGE` | largest diff, carries ADR 151/152 removals |
| `ex`, `nyx` | `ge` | `REBASE` | both touch `docs/handoff/HANDOFF.md`; `ex` also touches `docs/02-architecture.md` and `tests/fixtures/census.json` |
| `decision-models.md` (3 divergent copies) | `ge`'s versions | `DIVERGENCE` | 1, 1 and 4 lines; reconcile before implementing either |

The merge order is **derived, not chosen**: `ge` is last because it carries the
most files and the two removals; `dm` is first because it is the cheapest fold;
`ex` and `nyx` are in between and independent of each other.

## 6 - Protocol: how the agent moves between branches

The per-plan steps stay **inside each plan** (it is the plan that knows its
phases). This file owns only the choice of node and the movement between branches:

1. Read section 7 for the current stage and pick the first node whose edges are
   closed.
2. `git switch <Branch:>` from the node's graph line. Never implement a node on a
   branch that does not own it.
3. Work the node's own phases, in order, closing its checkboxes as they complete.
4. Run the node's gates plus the shared ones in section 9.
5. Commit on that branch, in the format the branch already uses.
6. `git switch main` and update the node's row here, then take the next node.
7. At the end of a stage, return to `main`, run the contended-file checks from
   section 8, and only then merge.

A node that cannot be finished on its branch is marked `blocked` with the edge
that blocks it, never moved to another branch.

## 7 - Stages

### Stage 0 - Fold `dm` (1 node, mechanical)

- [ ] Cherry-pick `b27c088a` onto `ge`.
- [ ] Delete the 32 skill-plan copies from `dm` (29 identical, 3 superseded by
      `ge`'s versions after the `DIVERGENCE` check).
- [ ] Move `docs/plans/decision-models.md` to `ge` with its own status line.
- [ ] Retire `feat/decision-models`: `Status: superseded` in
      `decision-models.md` names the owner.
- [ ] Verify: `ge` now carries 96 unique plan paths and `dm` carries none.

Gate: human, because it deletes 32 files.

### Stage 1 - Retrofit `ex` and `nyx`

- [ ] `export.md` gains `Branch:`, `Path:`, `Depends on:`, `Feeds:`,
      `Shared files:` and its own `## Dependency graph`.
- [ ] `2026-10-01-scripts-mcp-layout.md` gains the same.
- [ ] `execution-plan.md` and `oss.md` on `main` are declared outside the skills
      graph, with their status line.
- [ ] Every plan listed in section 2 exists on its declared branch, and the
      `Branch:`/`Path:` pair matches the tree.

Gate: the test of section 10 goes green for these four plans.

### Stage 2 - Merge `ex`

- [ ] Rebase `ex` onto `main`; resolve `docs/handoff/HANDOFF.md`,
      `docs/02-architecture.md` and `tests/fixtures/census.json` by
      **regenerating** the last two, never by hand-editing.
- [ ] Human gate: any change to `census.json` and the generated docs.

### Stage 3 - Merge `nyx`

- [ ] Rebase onto `main`; resolve `HANDOFF.md` by regeneration.
- [ ] Human gate: `nyx` carries real code (`feat(nyx)` commits), not documents.

### Stage 4 - Merge `ge` (last)

- [ ] Rebase onto `main` after stages 2 and 3, so the catalogue's generated files
      are regenerated once, at the end.
- [ ] Human gate: ADR 151 and 152 are one-way in review terms.
- [ ] After the merge, `main` carries the 98 plans, `skills-plan.md`, ADR 153/154
      and the 81-skill catalogue.

### Stage 5 - Bring the format to every plan

- [x] The contract exists (ADR 154, on `ge`).
- [ ] Every one of the 98 plan paths carries the status line, the graph section and
      checkboxes, applied **branch by branch** as each branch is worked.
- [ ] `dm`'s retired copies are gone, so they are not retrofitted at all.

## 8 - Contended files across branches

| File | Branches | Resolution |
| ---- | -------- | ---------- |
| `docs/handoff/HANDOFF.md` | `ge`, `ex`, `nyx` | regenerate the index, never merge by hand |
| `tests/fixtures/census.json` | `ge`, `ex` | `pnpm census`, once, at each merge |
| `docs/02-architecture.md` | `ge`, `ex` | regenerated by census |
| `docs/0*.md`, `docs/adr/*` | `ge`, `dm` | `dm` folds into `ge`, so the conflict disappears with the branch |
| `skills/rule/SKILL.md` | `ge` only | no cross-branch conflict, heavy intra-branch conflict |

## 9 - Gates

Automatic, on every node: the corpus and router-coverage suites, `census:check`,
lint and typecheck.

Human, and only there:

| Gate | Where | Why |
| ---- | ----- | --- |
| Every merge into `main` | stages 2, 3, 4 | nothing lands unreviewed |
| Contended files | any PR touching the five files in section 8 | a mistake there multiplies |
| Destructive plans | `ge`'s ADR 151/152 removals, and the `dm` fold that deletes 32 files | one-way in review terms |
| Any commit that changes this graph | this file | the graph is the contract |

## 10 - Verification

`tests/plans/plan-of-plans.test.mjs`, reading the branches with
`git show <branch>:<path>`:

- [ ] Every level-2 node's `Branch:` and `Path:` resolve on that branch.
- [ ] Every plan path claimed by two branches has a `DIVERGENCE` or
      `SUPERSEDES` entry in section 5.
- [ ] Every plan file in scope has a status line, a `## Dependency graph` section
      and at least one checkbox.
- [ ] The level-1 graph is acyclic.
- [ ] The merge order in section 5 is consistent with the `MERGE` edges: a branch
      never appears before a branch it depends on.
- [ ] A plan marked `done` has no open checkbox.

## 11 - Dependency graph

Depends on: nothing. This is the level-0 node: it waits only on the decisions
already recorded (ADR 153, ADR 154) and on the branch states measured above.
Feeds: every level-2 node, and `main`'s final state after stage 4.
Shared files: `docs/plans/plan-of-plans.md` only. The contended files in section 8
belong to the merged branches, not to this plan.

## 12 - Open notes and risks

- **The 3 divergent plans are cheap and must not be skipped.** 1, 1 and 4 lines
  apart. Reconciling them is minutes; discovering them after the fold is a lost
  afternoon. Stage 0 takes `ge`'s version as authoritative, because `ge` is where
  those plans were rewritten.
- **`dm` looks like a branch and is not one.** 29 byte-identical copies and a
  single unique commit mean any merge from it is a rebase disguised as a merge.
  The fold is the cheap path, and it removes 32 files a reader would otherwise
  maintain twice.
- **`ge` last is deliberate.** It changes 413 files, removes two skills and
  rewrites the counts. Merging it first would force `ex` and `nyx` to rebase onto
  a catalogue that moved under them.
- **The level-1 orchestrator exists for one branch out of four.** `ex` and `nyx`
  get a dependency section because their plans are single documents; a full
  `skills-plan.md` for a 3-file branch would be ceremony. The rule stays in
  section 2 so a fifth branch cannot arrive silently without one.
- **`develop` is out of scope and stays that way** until the architect track is
  brought into this repository's plans.
