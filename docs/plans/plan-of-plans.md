# plan-of-plans - cross-branch orchestration

Status: `planned`. This is the level-0 orchestrator: it decides which branch to
work in, which plan to implement next, and in what order the branches return to
`main`. It does not plan a skill.

Format: the contract of ADR 154 (status line, `## Dependency graph`, checkboxes)
applied to this file. ADR 153 and 154 live on `feat/guardrails` and are not on
`feat/evolution` yet; this file follows them in advance, and the merge in stage 5
brings them here.

Topology (2026-10-21): **`feat/evolution` is the convergence branch.** Every feature
branch merges into it, and `main` receives `feat/evolution` once it is reviewed -
so a merge here is `X -> feat/evolution`, never `X -> main` directly. `main` stays
the released line; `feat/evolution` is where the work converges and where the
rebase pain is paid once instead of once per branch.

Scope: the **four local feature branches, `feat/evolution` and `main`**. `origin/develop` is out of
scope: it holds `architect.md`, `backlog.md` and `github.md`, which belong to the
`rule-mcp-architect` track, not to this catalogue.

## 1 - Branch inventory (measured 2026-10-21)

| Branch | Ahead of main | Unique commits | Plan files | Unique plan paths | Contended with `ge` |
| ------ | ------------: | -------------: | ---------: | ----------------: | ------------------: |
| `main` | 0 | - | 2 | 2 | - |
| `feat/evolution` (convergence) | 2 | 2 | 3 | 3 | - |
| `feat/guardrails` (`ge`) | 94 | 94 | 95 | 95 | - |
| `feat/decision-models` (`dm`) | 63 | **1** | 45 | 1 | **233 files** |
| `feat/export` (`ex`) | 5 | 5 | 3 | 1 | 3 files |
| `feat/nyx` (`nyx`) | 6 | 6 | 3 | 1 | 1 file |

Totals: **149 plan-file instances, 99 unique plan paths** across the four
branches and `main` (99 because this file is a plan path too). Every branch is 0
behind `main`, so no rebase onto main is needed before the first merge.

Review of this graph and of the 93 plan files: `docs/reviews/plan-graph.md`.
Verdict there: the graph is directionally sound and not yet executable, with six
blockers listed by severity. Its fixes are tracked in section 13 here.

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

`feat/guardrails` already carries a level-1 orchestrator,
`docs/plans/skills/skills-plan.md`: 83 nodes, stages 0-10, edge taxonomy, ten
precedence policies, human gates, and ADR 153/154 behind it. This file **delegates
to it**: for anything inside `ge`, the answer is in that file, not here.

The hierarchy is the decision, and it has one rule: **every branch that carries
more than one plan gets its own level-1 orchestrator, or this file says why not.**

| Branch | Level-1 orchestrator | State |
| ------ | -------------------- | ----- |
| `ge` | `docs/plans/skills/skills-plan.md` | exists, 83 nodes |
| `dm` | none, and it does not need one | folded into `ge` in stage 2 |
| `ex` | `docs/plans/export.md` gains a dependency section | retrofit |
| `nyx` | `docs/plans/2026-10-01-scripts-mcp-layout.md` gains a dependency section | retrofit |
| `feat/evolution` | this file | plus the per-branch orchestrators it delegates to |
| `main` | none | `execution-plan.md` and `oss.md` stay there, outside the skills graph |

## 3 - Nodes, two levels

**Level 1 - branches.** Six nodes: `feat/evolution` (the convergence), `main`,
`ge`, `dm`, `ex`, `nyx`. They carry the merge order and the rebase work.

**Level 2 - plans.** 98 nodes, one per unique plan path, each owned by exactly one
branch. A path that appears on two branches is one node with an owner and, when
the contents differ, a `DIVERGENCE` edge.

Every level-2 node carries these parseable lines in its own plan:

```
Status: planned
Branch: feat/guardrails
Path: docs/plans/skills/data/rule-data-sql.md
Depends on: rule-process#2 (CONTRACT), rule-data-sql (HARD)
Feeds: rule-data (HARD)
Shared files: tests/fixtures/guardrail-corpus.mjs
```

That is **six lines**, and ADR 154 currently specifies four. The review's finding
F5 records the divergence: ADR 154 is amended to this set rather than a third
format being invented. `Branch:` and `Path:` are what make a node findable from
`feat/evolution`, so they cannot be derived from the file location as long as the
file is not on `feat/evolution`.

## 4 - Edge taxonomy

Four kinds inherited from ADR 153, four new ones for the cross-branch layer:

| Kind | Meaning | Executor rule |
| ---- | ------- | ------------- |
| `HARD` | B cannot start before A is closed | block |
| `ORDER` | B can start, but after A avoids churn | warn |
| `CONFLICT` | A and B edit the same shared file, same branch | serialise |
| `CONTRACT` | A exports a surface B consumes, named by phase | block on that phase |
| `MERGE` | Branch A must enter `feat/evolution` before B | block the merge, not the work |
| `REBASE` | A and B touch the same path on different branches; one rebases after the other | order the rebase |
| `DIVERGENCE` | The same plan path exists on two branches with different content | reconcile before either is implemented |
| `SUPERSEDES` | A replaces B; B is not executed | retire B |

## 5 - The level-1 graph

```
dm --FOLD--> ge          (1 commit cherry-picked; 45 plan files removed, 1 kept)
ex --MERGE--> feat/evolution    (3 contended files with ge)
nyx --MERGE--> feat/evolution   (1 contended file with ge)
ge --MERGE--> feat/evolution    (last: 413 changed files, carries the removals)
feat/evolution --MERGE--> main  (one reviewed merge, after the four above)
```

Edges, spelled out:

| From | To | Kind | Why |
| ---- | -- | ---- | --- |
| `dm` | `ge` | `SUPERSEDES` | 29 identical copies, 3 diverged by ≤4 lines, 1 unique plan, 1 unique commit |
| `dm` -> `decision-models.md` | `ge` | `MERGE` | the one plan that survives the fold, and it moves with the commit |
| `ex` | `feat/evolution` | `MERGE` | independent content (7 files), 3 shared generated files |
| `nyx` | `feat/evolution` | `MERGE` | independent content (19 files), 1 shared generated file |
| `ge` | `feat/evolution` | `MERGE` | largest diff, carries ADR 151/152 removals |
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
6. `git switch feat/evolution` and update the node's row here, then take the next node.
7. At the end of a stage, return to `feat/evolution`, run the contended-file checks from
   section 8, and only then merge.

A node that cannot be finished on its branch is marked `blocked` with the edge
that blocks it, never moved to another branch.

## 7 - Stages

### Stage 0 - Project policy decisions (prerequisite to everything else)

These steps were `docs/plans/execution-plan.md` and `docs/plans/oss.md` on `main`.
They move here because nothing in this graph can be finished while five public
commitments are undecided, and because the two files are not part of this branch
any more: the originals stay on `main` until this stage closes them.

The dependency is not a formality. Six of the eight findings wait on the owner's
decisions, and the eighth is a README link sweep that waits on nothing.

**The five decisions (owner):**

- [ ] Signing: is every release tag signed, with which key, and where is the key
      documented? (`v0.1.0` has no signature: `git tag -v v0.1.0` exits 1)
- [ ] Supported version line: which released pre-1.0 series receives security
      fixes? (`SECURITY.md` names 1.0.x while the package and tag are 0.1.0)
- [ ] Conduct escalation: who is the independent contact when the BDFL is the
      subject, and through which confidential channel?
- [ ] Funding disclosure: is sponsorship active, and what may be published as an
      aggregate without exposing donors?
- [ ] Inbound license: is the policy inbound=outbound MIT, with the DCO as
      provenance certification only?

**OSS-01 (high) - the release workflow accepts unsigned annotated tags:**

- [ ] 1.1 Confirm the signed-tag and key-management policy; do not rewrite the
      existing release tag.
- [ ] 1.2 Add and test a cryptographic signature verification gate in
      `.github/workflows/release.yml`, distinguishing annotated from verified.
- [ ] 1.3 On a new signed test tag, assert the gate passes and that an unsigned
      annotated tag fails before release creation.

**OSS-02 (medium) - the security support table disagrees with the release:**

- [ ] 2.1 Confirm which version line receives security fixes.
- [ ] 2.2 Align `SECURITY.md` with the policy and with `package.json` and
      `server.json`; check the release tag.
- [ ] 2.3 Validate that the advisory and README links resolve to the updated
      support policy.

**OSS-03 (medium) - the code of conduct appeal routes back to the BDFL:**

- [ ] 3.1 Nominate a willing independent contact and agree a confidential
      escalation channel; never publish a person's address without consent.
- [ ] 3.2 Update `CODE_OF_CONDUCT.md` and `GOVERNANCE.md` with reporting,
      recusal, appeal and response handling when the BDFL is involved.
- [ ] 3.3 Test that every public link reaches a working private reporting
      channel without exposing reporter identity.

**OSS-04 (low) - response targets disagree between documents:**

- [ ] 4.1 Confirm which triage and review targets are sustainable.
- [ ] 4.2 Align `CONTRIBUTING.md` and `MAINTAINERS.md`, and say business or
      calendar days.
- [ ] 4.3 Check the issue templates and contributor links reference the policy.

**OSS-05 (medium) - local lint and generated-document checks fail on a dirty tree:**

- [ ] 5.1 Run `pnpm lint` and `pnpm census:check` on a clean checkout before
      attributing anything to `main`.
- [ ] 5.2 For confirmed failures, fix only the failing files and regenerate the
      named census outputs with `pnpm census`.
- [ ] 5.3 Re-run `pnpm test:all`, `pnpm lint` and `pnpm census:check` and record
      the results.

**OSS-06 (low) - funding promises transparency with no cadence:**

- [ ] 6.1 Confirm whether sponsorship is active and what may be disclosed.
- [ ] 6.2 If donations are accepted, document the reporting location and period
      in `GOVERNANCE.md`, keeping sponsor preferences out of the roadmap.
- [ ] 6.3 Verify `.github/FUNDING.yml` points at the approved channel without
      claiming unverified balances.

**OSS-07 (medium) - the contribution guide calls the DCO a license:**

- [ ] 7.1 Confirm the intended inbound=outbound MIT policy; obtain legal review
      if it is uncertain.
- [ ] 7.2 Correct `CONTRIBUTING.md` so provenance certification and licensing
      are separate, without introducing a CLA.
- [ ] 7.3 Recheck `LICENSE`, `REUSE.toml`, the installed commit-msg hook and the
      DCO CI gate for consistent language and behaviour.

**OSS-08 (low) - the README entry page links no policy:**

- [ ] 8.1 Add concise links to `CONTRIBUTING.md`, `GOVERNANCE.md`,
      `CODE_OF_CONDUCT.md`, `MAINTAINERS.md` and `SECURITY.md`.
- [ ] 8.2 Check every link locally and keep the handbook links intact.

**Closing the stage:**

- [ ] Refresh the records with the evidence and the statuses. On this branch
      that means the summary in section 9; `docs/audits/oss.md`,
      `docs/reviews/oss.md` and `docs/plans/oss.md` live on `main` and are
      updated there by the merge that closes this stage.
- [ ] `GOVERNANCE.md` names where the branch-protection setting is recorded
      (owner action 16.5) without pointing at a file this branch does not carry.

Gate: **human**, on all five decisions. Nothing in stages 1-7 starts before it,
and the four merge stages stay blocked while the policy questions are open.

### Stage 1 - Fold `dm` (1 node, mechanical)

- [ ] Cherry-pick `b27c088a` onto `ge`.
- [ ] Delete the 32 skill-plan copies from `dm` (29 identical, 3 superseded by
      `ge`'s versions after the `DIVERGENCE` check).
- [ ] Move `docs/plans/decision-models.md` to `ge` with its own status line.
- [ ] Retire `feat/decision-models`: `Status: superseded` in
      `decision-models.md` names the owner.
- [ ] Verify: `ge` now carries 96 unique plan paths and `dm` carries none.

Gate: human, because it deletes 32 files.

### Stage 2 - Retrofit `ex` and `nyx`

- [ ] `export.md` gains `Branch:`, `Path:`, `Depends on:`, `Feeds:`,
      `Shared files:` and its own `## Dependency graph`.
- [ ] `2026-10-01-scripts-mcp-layout.md` gains the same.
- [ ] `execution-plan.md` and `oss.md` on `main` are declared outside the skills
      graph, with their status line.
- [ ] Every plan listed in section 2 exists on its declared branch, and the
      `Branch:`/`Path:` pair matches the tree.

Gate: the test of section 10 goes green for these four plans.

### Stage 3 - Merge `ex` into `feat/evolution`

- [ ] Rebase `ex` onto `feat/evolution`; resolve `docs/handoff/HANDOFF.md`,
      `docs/02-architecture.md` and `tests/fixtures/census.json` by
      **regenerating** the last two, never by hand-editing.
- [ ] Human gate: any change to `census.json` and the generated docs.

### Stage 4 - Merge `nyx` into `feat/evolution`

- [ ] Rebase onto `feat/evolution`; resolve `HANDOFF.md` by regeneration.
- [ ] Human gate: `nyx` carries real code (`feat(nyx)` commits), not documents.

### Stage 5 - Merge `ge` into `feat/evolution` (last)

- [ ] Rebase onto `feat/evolution` after stages 3 and 4, so the catalogue's generated files
      are regenerated once, at the end.
- [ ] Human gate: ADR 151 and 152 are one-way in review terms.
- [ ] After the merge, `feat/evolution` carries the plans, `skills-plan.md`,
      ADR 153/154 and the 81-skill catalogue.

### Stage 6 - `feat/evolution` into `main`

- [ ] Only after stages 0-5: one merge, reviewed as a whole, with the full gate set.
- [ ] Human gate: this is the merge that changes what `main` ships (81 skills
      instead of 89, ADRs 153/154, the plan catalogue).
- [ ] `main` then equals `feat/evolution`, and the branch is kept for the next cycle.

### Stage 7 - Bring the format to every plan

- [x] The contract exists (ADR 154, on `ge`).
- [ ] Every one of the 98 plan paths carries the status line, the graph section and
      checkboxes, applied **branch by branch** as each branch is worked.
- [ ] `dm`'s retired copies are gone, so they are not retrofitted at all.

## 8 - Contended files across branches

This is **the** list: `skills-plan.md` names five of these and must point here
instead of keeping its own copy (review finding F6).

| File | Branches | Resolution |
| ---- | -------- | ---------- |
| `docs/handoff/HANDOFF.md` | `ge`, `ex`, `nyx` | regenerate the index, never merge by hand |
| `tests/fixtures/census.json` | `ge`, `ex` | `pnpm census`, once, at each merge |
| `docs/02-architecture.md` | `ge`, `ex` | regenerated by census |
| `docs/08-skills.md`, `docs/09-tools.md`, `docs/15-resources.md`, `docs/16-surface-map.md` | `ge`, `ex` | regenerated by census |
| `docs/adr/ADR.md` + ADR numbering | `ge`, `dm`, `ex`, `nyx` | one allocator: numbers taken at merge time, collisions re-numbered |
| `docs/0*.md` (other generated docs) | `ge`, `dm` | `dm` folds into `ge`, so the conflict disappears with the branch |
| `skills/rule/SKILL.md` | `ge` only | no cross-branch conflict, heavy intra-branch conflict |
| `tests/fixtures/guardrail-corpus.mjs` | `ge` only | append-only, one plan at a time |

## 9 - Gates

Automatic, on every node: the corpus and router-coverage suites, `census:check`,
lint and typecheck.

Human, and only there:

| Gate | Where | Why |
| ---- | ----- | --- |
| Every merge into `main` | stages 3, 4, 5 | nothing lands unreviewed |
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
Feeds: every level-2 node, and `main`'s final state after stage 5.
Shared files: `docs/plans/plan-of-plans.md` only. The contended files in section 8
belong to the merged branches, not to this plan.

## 12 - Open notes and risks
- **The 3 divergent plans are cheap and must not be skipped.** 1, 1 and 4 lines
  apart. Reconciling them is minutes; discovering them after the fold is a lost
  afternoon. Stage 2 takes `ge`'s version as authoritative, because `ge` is where
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

## 13 - Fixes the review requires before the first node

From `docs/reviews/plan-graph.md`. **All of them are resolved on
`feat/guardrails`** (`3553780c` test, `6cda42ea` fix), where the plans
live; this list is kept so a reader on `main` knows the state without switching
branch. The files themselves arrive with the merge in stage 5.

- [x] F1 - every plan carries a `## Dependency graph` section: 92 files
      retrofitted, checked by `tests/plans/skills-plan.test.mjs`.
- [x] F2 - the same-stage edge is gone: stages split into `0a/0b`, `3a/3b`,
      `7a/7b`, and a `CONTRACT` edge is exempt because a phase closes first.
- [x] F3 - `rule-toolchain-electron` and `rule-toolchain-tauri` have their own
      plans (index #86, #87) as Stage 4 nodes.
- [x] F4 - one id per node: `rule-process-bmad`, with `Produces: rule-method`.
- [x] F5 - ADR 154 amended in place: four lines inside a branch, six in a
      cross-branch document.
- [x] F8 - the five-value status line on all 95 plan files, original wording on
      the `Notes:` line.
- [x] F9 - `installer-scope-adr-policy-features.md` has its step; the three
      non-skill plans stay in scope of the checkbox assertion.
- [x] Stage lists - a table per stage, 85 nodes, counts summed by the test
      instead of asserted.
- [x] F6 - one contended-file list (section 8), referenced by `skills-plan.md`.
- [x] F7 - the unique path count is 99, not 98.

One finding came out of the fix work and is not resolved: the sync guard prepends
a `⚠️ Base branch ... advanced` banner as the first content item, and six tests
read `content[0]` or `content[1]`. They pass in a detached worktree and fail in
a checkout whose base advanced. It needs a decision - change the banner position
and its contract test, or give every affected test a shared reader - and it is
not part of this graph.
