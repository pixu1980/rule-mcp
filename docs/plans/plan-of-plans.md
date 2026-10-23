# plan-of-plans - cross-branch orchestration

Status: `in-progress`. This is the level-0 orchestrator: it decides which branch to
work in, which plan to implement next, and in what order the branches merge into
`feat/evolution`. It does not plan a skill, and it never touches `main`.

Format: the contract of ADR 154 (status line, `## Dependency graph`, checkboxes)
applied to this file. ADR 153 and 154 live on `feat/guardrails`; the Stage 4
merge brought them here, and this file follows them.

Topology (2026-10-21): **`feat/evolution` is the only destination.** Every feature
branch merges into it, every commit of every stage lands there, and `main` is out
of scope for this work: the owner opens the merge request when the catalog is
ready. No stage touches `main`, and nothing here waits on it.

Scope: the **four feature branches plus `feat/evolution`**. Two things are out of
scope: `main` (the owner opens the merge request, no stage reads or writes it) and
`origin/develop`, which carries `architect.md`, `backlog.md` and `github.md` for
the `rule-mcp-architect` track.

## 1 - Branch inventory (measured 2026-10-21)

| Branch                             | Commits ahead of the common base | Plan files |       Unique plan paths | Contended with `ge` |
| ---------------------------------- | -------------------------------: | ---------: | ----------------------: | ------------------: |
| `feat/evolution` (the destination) |                                5 |          2 |                       2 |                   - |
| `feat/guardrails` (`ge`)           |                               97 |         97 | 95 plans plus 2 indexes |                   - |
| `feat/decision-models` (`dm`)      |                               66 |         45 |                       1 |       **233 files** |
| `feat/export` (`ex`)               |                                8 |          3 |                       1 |             3 files |
| `feat/nyx` (`nyx`)                 |                                9 |          3 |                       1 |              1 file |

Totals: **150 plan-file instances, 102 unique plan paths** across the five
branches. `ge` carries every plan this work needs; `evolution` carries this file
and its reference; `dm`, `ex` and `nyx` add one plan each. The branches share the
same base, so the first merge needs no rebase.

After Stage 1 (2026-10-22): `ge` carries **98 files** under `docs/plans`
(96 plans plus the two indexes) and `dm` carries **none**. The fold moved the
one unique plan and the decision-models evidence to `ge`, so the table above
stays as the measurement that motivated the stage, not as the current count.

Order amendment (2026-10-22): `ge` merges before `nyx` (Stage 4), because the
decision-models track lives on `ge` and `nyx` rewrites the same shortlist
pipeline. The counts above remain the measurement, not a merge order.

Reference for this plan: [`plan-of-plans-reference.md`](plan-of-plans-reference.md)

- the audit that asked whether the graph allows a linear implementation, with its
  findings and their resolution.

### What the measurement says about `dm`

The 2026-10-21 measurement said `feat/decision-models` was **`ge` minus one
commit**. The fold measured it again on 2026-10-22 and found a larger, older
branch:

- **44 of 44** shared plan files diverged, not 3. `ge` carries the ADR 154
  status lines and `## Dependency graph` sections and the ADR 152 removals;
  `dm` still says `Status: plan only` and still names the retired
  `rule-frontend-custom-element` and `rule-frontend-vanilla-reactive` skills. No
  `dm` line survives the comparison, so `ge`'s versions supersede all of them.
- `dm` carries **33** skill plans and **11** shared orchestrator/index
  documents, 45 plan paths in all with `decision-models.md`; not 32.
- It has **four** commits not in `ge`, not one: three are rebased twins of
  commits `ge` already has (`eba6861c`/`32e2ea08`, `775270f8`/`c9d24fc1`,
  `4564ea95`/`e0389952`) and `b27c088a` is the `dm` half of the split `ge`
  recorded as `7afaf605`.
- It also owns the audit, the review and the probe harness, which `7afaf605`
  had moved off `ge`. Those moved back with the plan.

So `dm` was not a parallel branch, but it was not `ge` minus one commit either:
it was an earlier state of the catalogue plus a track `ge` had split away. The
fold retires it as a plan owner and keeps `ge` as the only catalogue.

## 2 - What this file is not

`feat/guardrails` already carries a level-1 orchestrator,
`docs/plans/skills/skills-plan.md`: 83 nodes, stages 0-10, edge taxonomy, ten
precedence policies, human gates, and ADR 153/154 behind it. This file **delegates
to it**: for anything inside `ge`, the answer is in that file, not here.

The hierarchy is the decision, and it has one rule: **every branch that carries
more than one plan gets its own level-1 orchestrator, or this file says why not.**

| Branch           | Level-1 orchestrator                                                     | State                                             |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------------- |
| `ge`             | `docs/plans/skills/skills-plan.md`                                       | exists, 83 nodes                                  |
| `dm`             | none, and it does not need one                                           | folded into `ge` in stage 1                       |
| `ex`             | `docs/plans/export.md` gains a dependency section                        | retrofitted (stage 2)                             |
| `nyx`            | `docs/plans/2026-10-01-scripts-mcp-layout.md` gains a dependency section | retrofitted (stage 2)                             |
| `feat/evolution` | this file                                                                | plus the per-branch orchestrators it delegates to |

## 3 - Nodes, two levels

**Level 1 - branches.** Five nodes: `feat/evolution` (the destination), `ge`,
`dm`, `ex`, `nyx`. They carry the merge order and the rebase work.

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

| Kind         | Meaning                                                                        | Executor rule                          |
| ------------ | ------------------------------------------------------------------------------ | -------------------------------------- |
| `HARD`       | B cannot start before A is closed                                              | block                                  |
| `ORDER`      | B can start, but after A avoids churn                                          | warn                                   |
| `CONFLICT`   | A and B edit the same shared file, same branch                                 | serialize                              |
| `CONTRACT`   | A exports a surface B consumes, named by phase                                 | block on that phase                    |
| `MERGE`      | Branch A must enter `feat/evolution` before B                                  | block the merge, not the work          |
| `REBASE`     | A and B touch the same path on different branches; one rebases after the other | order the rebase                       |
| `DIVERGENCE` | The same plan path exists on two branches with different content               | reconcile before either is implemented |
| `SUPERSEDES` | A replaces B; B is not executed                                                | retire B                               |

## 5 - The level-1 graph

```
dm --FOLD--> ge          (commit skipped: 7afaf605 records the split; 45 plans removed, 1 kept)
ex --MERGE--> feat/evolution    (3 contended files with ge)
ge --MERGE--> feat/evolution    (before nyx: decision-models, ADR 153/154, the removals)
nyx --MERGE--> feat/evolution   (last: rebases onto the settled shortlist)
feat/evolution                (the destination: every merge above lands here)
```

Edges, spelled out:

| From                                  | To                          | Kind         | Why                                                                                            |
| ------------------------------------- | --------------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| `dm`                                  | `ge`                        | `SUPERSEDES` | 44 of 44 shared plans superseded, 1 unique plan, 4 commits (3 rebased twins, 1 split mirror)   |
| `dm` -> `decision-models.md`          | `ge`                        | `MERGE`      | the one plan that survives the fold, and it moves with the commit                              |
| `ex`                                  | `feat/evolution`            | `MERGE`      | independent content (7 files), 3 shared generated files                                        |
| `ge`                                  | `feat/evolution`            | `MERGE`      | before `nyx`: carries the decision-models track, ADR 153/154 and the ADR 151/152 removals      |
| `nyx`                                 | `feat/evolution`            | `MERGE`      | last: rebases onto the settled shortlist contract, 1 shared generated file plus the env docs   |
| `nyx`                                 | `ge`                        | `REBASE`     | nyx rewrites the router pipeline and `05-env-variables.md` after the decision layer settles    |
| `ge`'s `decision-models.md`           | `nyx`                       | `ORDER`      | both rewrite `src/tools/router/call/_pipeline.js` and `_stages.js`; settle the shortlist first |
| `dm`'s 44 shared plan files           | `ge`'s versions             | `DIVERGENCE` | all 44 superseded: ADR 154 format and ADR 152 removals; no dm-only content                     |
| `ex`'s `docs/plans/execution-plan.md` | Stage 0 of `feat/evolution` | `SUPERSEDES` | retired: its three phases are section 7 of this file, which closed them                        |
| `ex`'s `docs/plans/oss.md`            | Stage 0 of `feat/evolution` | `SUPERSEDES` | retired: OSS-01 to OSS-08 are closed in section 7 of this file                                 |

The merge order is **derived, not chosen**: `dm` is first because it is the
cheapest fold; `ex` follows because its generated files are the smallest set;
`ge` lands before `nyx` because it carries the decision-models track and ADR
153/154, and `nyx` rewrites the same shortlist pipeline; `nyx` is last and
rebases onto that contract.

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

These steps were `docs/plans/execution-plan.md` and `docs/plans/oss.md`, which
this branch no longer carries. They move here because nothing in this graph can
be finished while five public commitments are undecided. `main` is out of scope:
the work happens on `feat/evolution` and the owner handles the merge request.

The dependency is not a formality. Six of the eight findings wait on the owner's
decisions, and the eighth is a README link sweep that waits on nothing.

**The five decisions (owner):**

- [x] Signing: is every release tag signed, with which key, and where is the key
      documented? (`v0.1.0` has no signature: `git tag -v v0.1.0` exits 1) -
      decided (ADR 135): dedicated Ed25519 GPG key
      (`37D68446F3ADCF1C8C37C07A15571530D4B63084`), public key committed at
      `.github/release-signing-key.asc` and documented in `CONTRIBUTING.md` and
      `SECURITY.md`; `v0.1.0` stays unchanged.
- [x] Supported version line: which released pre-1.0 series receives security
      fixes? (`SECURITY.md` names 1.0.x while the package and tag are 0.1.0) -
      decided (ADR 135): active `0.1.x` minor line supported, `< 0.1.0`
      unsupported until `1.0.0` ships.
- [x] Conduct escalation: who is the independent contact when the BDFL is the
      subject, and through which confidential channel? - decided (ADR 135):
      mandatory BDFL recusal once a co-maintainer is listed in
      `MAINTAINERS.md`, and direct confidential escalation via GitHub Trust &
      Safety (`https://github.com/contact/report-abuse`) while bus factor is
      one.
- [x] Funding disclosure: is sponsorship active, and what may be published as an
      aggregate without exposing donors? - decided (ADR 135): GitHub Sponsors
      (`pixu1980` in `.github/FUNDING.yml`) active with zero funds received to
      date, and an annual aggregate summary in `GOVERNANCE.md` without exposing
      donor identities.
- [x] Inbound license: is the policy inbound=outbound MIT, with the DCO as
      provenance certification only? - decided (ADR 135): `inbound = outbound
MIT` with the DCO `Signed-off-by` trailer certifying provenance only and
      no CLA.

**OSS-01 (high) - the release workflow accepts unsigned annotated tags:**

- [x] 1.1 Confirm the signed-tag and key-management policy; do not rewrite the
      existing release tag (`v0.1.0` left intact; GPG key committed at
      `.github/release-signing-key.asc`).
- [x] 1.2 Add and test a cryptographic signature verification gate in
      `.github/workflows/release.yml`, distinguishing annotated from verified
      (`git verify-tag` after `git cat-file -t`, covered in
      `tests/release/workflow.test.mjs`).
- [x] 1.3 On a new signed test tag, assert the gate passes and that an unsigned
      annotated tag fails before release creation (verified on `v0.1.0-sigtest`
      vs `v0.1.0-unsigned` and in `tests/release/workflow.test.mjs`).

**OSS-02 (medium) - the security support table disagrees with the release:**

- [x] 2.1 Confirm which version line receives security fixes (`0.1.x`).
- [x] 2.2 Align `SECURITY.md` with the policy and with `package.json` and
      `server.json`; check the release tag (`v0.1.0`).
- [x] 2.3 Validate that the advisory and README links resolve to the updated
      support policy (`tests/docs/security-policy.test.mjs`,
      `tests/docs/link-integrity.test.mjs`).

**OSS-03 (medium) - the code of conduct appeal routes back to the BDFL:**

- [x] 3.1 Nominate a willing independent contact and agree a confidential
      escalation channel; never publish a person's address without consent
      (bus-factor-1 recusal policy plus `https://github.com/contact/report-abuse`).
- [x] 3.2 Update `CODE_OF_CONDUCT.md` and `GOVERNANCE.md` with reporting,
      recusal, appeal and response handling when the BDFL is involved.
- [x] 3.3 Test that every public link reaches a working private reporting
      channel without exposing reporter identity
      (`tests/docs/security-policy.test.mjs`).

**OSS-04 (low) - response targets disagree between documents:**

- [x] 4.1 Confirm which triage and review targets are sustainable (2 business
      days for issue triage, 7 business days for PR review).
- [x] 4.2 Align `CONTRIBUTING.md` and `MAINTAINERS.md`, and say business or
      calendar days (`2 business days` and `7 business days`).
- [x] 4.3 Check the issue templates and contributor links reference the policy
      (`tests/docs/security-policy.test.mjs`).

**OSS-05 (medium) - local lint and generated-document checks fail on a dirty tree:**

- [x] 5.1 Run `pnpm lint` and `pnpm census:check` on a clean checkout before
      attributing anything to another branch (confirmed 22 ESLint errors across
      13 files and stale `tests/fixtures/census.json`).
- [x] 5.2 For confirmed failures, fix only the failing files and regenerate the
      named census outputs with `pnpm census`.
- [x] 5.3 Re-run `pnpm test:all`, `pnpm lint` and `pnpm census:check` and record
      the results (`pnpm lint` exits 0 with 0 errors and 36 warnings;
      `pnpm census:check` exits 0; `README.md` tool count aligned to 110;
      `tests/release/workflow.test.mjs`, `tests/docs/security-policy.test.mjs`,
      `tests/docs/dco.test.mjs`, `tests/docs/link-integrity.test.mjs` and
      `tests/docs/docs-accuracy.test.mjs` all pass).

**OSS-06 (low) - funding promises transparency with no cadence:**

- [x] 6.1 Confirm whether sponsorship is active and what may be disclosed
      (GitHub Sponsors `pixu1980` active, annual aggregate summary).
- [x] 6.2 If donations are accepted, document the reporting location and period
      in `GOVERNANCE.md`, keeping sponsor preferences out of the roadmap.
- [x] 6.3 Verify `.github/FUNDING.yml` points at the approved channel without
      claiming unverified balances (`tests/docs/security-policy.test.mjs`).

**OSS-07 (medium) - the contribution guide calls the DCO a license:**

- [x] 7.1 Confirm the intended inbound=outbound MIT policy; obtain legal review
      if it is uncertain (`inbound = outbound MIT` confirmed).
- [x] 7.2 Correct `CONTRIBUTING.md` so provenance certification and licensing
      are separate, without introducing a CLA.
- [x] 7.3 Recheck `LICENSE`, `REUSE.toml`, the installed commit-msg hook and the
      DCO CI gate for consistent language and behavior
      (`tests/docs/dco.test.mjs`).

**OSS-08 (low) - the README entry page links no policy:**

- [x] 8.1 Add concise links to `CONTRIBUTING.md`, `GOVERNANCE.md`,
      `CODE_OF_CONDUCT.md`, `MAINTAINERS.md` and `SECURITY.md`.
- [x] 8.2 Check every link locally and keep the handbook links intact
      (`tests/docs/link-integrity.test.mjs`).

**Closing the stage:**

- [x] Refresh the records with the evidence and the statuses. On this branch
      that means section 9 of this file and the evidence inside each closed
      step; the three documents that used to hold it are not on this branch.
- [x] `GOVERNANCE.md` names where the branch-protection setting is recorded
      (owner action 16.5) without pointing at a file this branch does not carry.

Gate: **human**, on all five decisions (confirmed 2026-10-22, ADR 135). Nothing
in stages 1-7 starts before it, and the four merge stages are now unblocked on
policy.

### Stage 1 - Fold `dm` (1 node, mechanical, done 2026-10-22)

- [x] Skip the cherry-pick of `b27c088a`: it is the `dm` half of the split
      `ge` recorded as `7afaf605`, and applying it would repoint this branch's
      merge-only session record at the retired branch. Deviation recorded below.
- [x] Delete the 45 plan paths from `dm`: 33 skill plans and 11 shared
      orchestrator/index documents superseded by `ge` (44 of 44 diverged, not
      3), plus `decision-models.md`, which moved.
- [x] Move `docs/plans/decision-models.md` to `ge` as `planned`, with the
      ADR 154 status line, a `Notes` line naming `feat/guardrails`, and the
      three graph lines.
- [x] Move the audit, the review and the probe harness to `ge`, so the track
      survives the retirement whole; `ge`'s catalogue now names it as local.
- [x] Retire `feat/decision-models` as a plan owner: it carries no plan file.
- [x] Verify: `ge` carries 96 unique plan paths (98 files with the two
      indexes); `dm` carries none.

Gate: human, because it deletes 45 files (confirmed 2026-10-22).

Stage 1 gate record (2026-10-22):

- `ge` `a747508a` `chore(decision-models): fold the track into feat/guardrails`.
- `dm` `2ec1db4e` `docs(plans): retire the copies the fold supersedes`.
- `node --test tests/plans/skills-plan.test.mjs` on `ge`: 9/9 pass.
- Deviation: `b27c088a` was cherry-picked first and aborted. It conflicts on
  the session record `7afaf605` renamed, and resolving it would undo the split.
  The split is already recorded on both sides, so skipping it loses nothing.

### Stage 2 - Retrofit `ex` and `nyx` (2 plans, done 2026-10-22)

- [x] `export.md` gains `Branch:`, `Path:`, `Depends on:`, `Feeds:`,
      `Shared files:` and its own `## Dependency graph`.
- [x] `2026-10-01-scripts-mcp-layout.md` gains the same.
- [x] The two retired plans are recorded as superseded by Stage 0 here, and no
      stage reads a file from another branch.
- [x] Every plan listed in section 2 exists on its declared branch, and the
      `Branch:`/`Path:` pair matches the tree.

Gate: the test of section 10 goes green for these four plans.

Stage 2 gate record (2026-10-22):

- `ex` `c63636da` and `nyx` `9ecc49ab`: `docs(plans): give the branch plans the
cross-branch node`.
- `feat/evolution` `bfbbb59c`: `test(plans): assert the cross-branch node from
the git tree`.
- `node --import ./scripts/alias-hook.mjs --test tests/plans/plan-of-plans.test.mjs`:
  `7/7` pass.
- Section 9 suites: `src/tools/router/__tests__/*.test.mjs` `32/32`; the four
  corpus suites `14/14` in a detached worktree at this commit. In this checkout
  `_routing-corpus` parses the `⚠️ Base branch advanced` banner as its first
  content item, the residual section 13 already records.
- The four plans: `docs/plans/export.md` on `feat/export`,
  `docs/plans/2026-10-01-scripts-mcp-layout.md` on `feat/nyx`, and the retired
  `docs/plans/execution-plan.md` and `docs/plans/oss.md` on both.
- Deviation: `2026-10-01-scripts-mcp-layout.md` had a numbered execution order
  and no checkbox; ADR 154 requires a checkbox step, so its ten items became
  `- [ ]` boxes.
- `feat/guardrails` keeps its copies of `execution-plan.md` and `oss.md` as
  `planned`: the retirement is effective through section 5, and Stage 4 resolves
  those two paths there.
- Section 2 also corrects `dm`'s fold from stage 2 to stage 1, which is where it
  happened.

### Stage 3 - Merge `ex` into `feat/evolution` (done 2026-10-22)

- [x] Rebase `ex` onto `feat/evolution`; resolve `docs/handoff/HANDOFF.md`,
      `docs/02-architecture.md` and `tests/fixtures/census.json` by
      **regenerating** the last two, never by hand-editing.
- [x] Human gate: any change to `census.json` and the generated docs
      (confirmed 2026-10-22: neither file changes).

Stage 3 gate record (2026-10-22):

- `feat/export` rebased from `c63636da` onto `6b681d3a`: seven commits replayed,
  then `756f0daf` `style(docs): format the export session documents` made the
  Prettier gate pass. `feat/evolution` fast-forwards to that tip.
- `docs/02-architecture.md`: the marker conflict keeps `feat/evolution`'s 135
  ADRs (ADR 135 is Stage 0's). `tests/fixtures/census.json` is regenerated with
  `censusOutputs` + `snapshotText`, not written by hand; `pnpm census:check`
  confirms both. The two files are byte-identical to the pre-merge
  `feat/evolution`.
- `docs/plans/execution-plan.md` and `oss.md`: four replayed commits touch them
  and meet evolution's deletion; three resolve with `git rm`, and `c2ff412c`
  becomes empty. Keeping them deleted is the `SUPERSEDES` record of section 5,
  not a lost edit.
- `docs/handoff/HANDOFF.md`: regenerated by `handoff doctor`, so it now carries
  sessions 23 and 24; the doctor reports it current.
- Human gate: the only generated file that changes is `HANDOFF.md` (+2 rows).
  `docs/adr/ADR.md` is stale on both sides (11 historical rows still print `->`
  where the source ADRs hold `→`), is out of Stage 3's scope, and stays for the
  `ge` regeneration in Stage 4.
- Gates: `pnpm census:check` current; `pnpm format` clean; `pnpm lint` 0 errors,
  36 warnings; `tests/docs` 139/141. The two failures pre-exist: the ADR 154
  citations of the Stage 2 test file land only with `ge` in Stage 4, and
  `file-size-budget` names the two residuals of section 13.
- Deviation: `11c2854b` (census digest) is superseded by the regenerated
  snapshot on the merged tree, and `git rebase` drops both it and `c2ff412c`
  as empty commits.
- `tests/plans/plan-of-plans.test.mjs` is red after the rebase by construction:
  it is the Stage 2 snapshot of `ex` and `nyx`, and a merged `ex` no longer
  describes a branch that carries the two retired plans. It is in no CI suite;
  Stage 7 widens it to the merged shape.

### Stage 3.5 - Quick-start before the engineering guides

- [ ] Create `docs/07-quick-start.md`: the main flows in short, practical
      examples - init, check, fix, handoff/handon, personas, the cache and the
      decision layer - so a reader can use the server without reading a guide.
- [ ] Renumber `docs/07-engineering-guides.md` to `docs/08-engineering-guides.md`
      and update the README index, every cross-reference and the docs numbering
      tests. The quick-start is the shallow entry; the engineering guides stay
      the deep version.
- [ ] Gate: the docs numbering doctor and the docs tests pass with the new
      number, and the quick-start covers every flow the engineering guides list
      as a chapter.

### Stage 4 - Close `decision-models` on `ge`, then merge `ge`

- [x] Rebase `ge` onto `feat/evolution` after Stage 3. Evidence: the evolution fast-forwarded to `1ecb14ef`.
- [x] Close `docs/plans/decision-models.md` on `ge`: nine steps, failing test
      first, each step ships against its kill criterion or is deleted. Evidence:
      Steps 1-7 implemented, Step 8 rejected, Step 9 closed; DM-04 and DM-10 stay
      open, and Step 5.4 stays open for a live Julia-1 run.
- [x] Re-derive the node's model table per step before the first commit: the
      table currently names one class for the whole plan, and section 14 assigns
      the class of the work. Evidence: the plan's model table names every step.
- [x] Keep `execution-plan.md` and `oss.md` deleted at the merge: the same
      `SUPERSEDES` resolution Stage 3 applied to `ex`. Evidence: the merge removed both.
- [x] Regenerate the catalog's generated files once (`census`, `HANDOFF`,
      `ADR`), then merge. Evidence: `census` current, `HANDOFF` regenerated, ADR index rebuilt.
- [x] Human gate: ADR 151/152 are one-way in review terms, and the
      decision-models outcome is recorded step by step (shipped against its
      number, or killed and deleted). Evidence: the owner confirmed; ADR 156 is accepted in `1ecb14ef`.
- [x] After the merge, `feat/evolution` carries the plans, `skills-plan.md`,
      ADR 153/154, the 81-skill catalog and the decision layer as far as the
      criteria allow. Evidence: the merge and the plan tests below.

### Stage 5 - Merge `nyx` into `feat/evolution` (last)

- [x] Rebase/merge onto `feat/evolution` after Stage 4; regenerate `HANDOFF.md`,
      `tests/fixtures/census.json` and `docs/02-architecture.md`; reconcile
      `docs/05-env-variables.md` (both sides add variables) and the router
      pipeline (the decision layer is the base). Evidence: merge `896d320d`; the
      handoff 24 collision renumbered to 26; both variable sets kept; the nyx L2
      tier and the decision layer coexist.
- [x] Keep `execution-plan.md` and `oss.md` deleted at this merge too. Evidence: the merge removed both.
- [x] Human gate: `nyx` carries real code (`feat(nyx)` commits), and its
      reranker consumes the settled shortlist instead of adding a second
      arbiter. Evidence: the owner confirmed; `rerankSkillScores` runs before the
      top, the decision layer arbitrates the six, and both ship off.

### Stage 6 - Hand over to the owner

- [x] Only after stages 0-5: the catalog is complete on `feat/evolution`. Evidence: the 16/16 plan tests and the merged catalogue.
- [ ] The owner opens the merge request. This plan does not touch `main`, does
      not rebase onto it, and does not merge into it: `feat/evolution` is the
      destination, and the merge request is the owner's step. Nothing is pushed.

### Stage 7 - Bring the format to every plan

- [x] The contract exists (ADR 154, on `ge`).
- [x] Every one of the 98 plan paths carries the status line, the graph section and
      checkboxes, applied **branch by branch** as each branch is worked. Evidence:
      `tests/plans/skills-plan.test.mjs` 9/9, `tests/plans/plan-of-plans.test.mjs`
      7/7, the level-0 format on `feat/export`.
- [x] `dm`'s retired copies are gone, so they are not retrofitted at all.

### Stage 8 - Rename `rule-mcp` to `rule-mcp` (GitHub and local, last)

- [ ] GitHub: rename the repository to `rule-mcp`, update the remote, the badges,
      the issue/PR templates and the release references; keep the old URL as the
      redirect GitHub provides.
- [ ] Local: rename the checkout folder, the package names, the bin names, the
      project names and the paths in scripts, CI, docs and MCP client configs
      from `rule-mcp` to `rule-mcp`; leave the `rule-mcp-architect`
      sibling under its own name.
- [ ] Gate: `pnpm census`, the docs tests, the install scripts and the plan
      tests pass from the renamed checkout; no `rule-mcp` remains outside
      the historical ADRs and the migration note.

## 8 - Contended files across branches

This is **the** list: `skills-plan.md` names five of these and must point here
instead of keeping its own copy (review finding F6).

| File                                                                                      | Branches                | Resolution                                                         |
| ----------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| `docs/handoff/HANDOFF.md`                                                                 | `ge`, `ex`, `nyx`       | regenerate the index, never merge by hand                          |
| `tests/fixtures/census.json`                                                              | `ge`, `ex`              | `pnpm census`, once, at each merge                                 |
| `docs/02-architecture.md`                                                                 | `ge`, `ex`              | regenerated by census                                              |
| `docs/08-skills.md`, `docs/09-tools.md`, `docs/15-resources.md`, `docs/16-surface-map.md` | `ge`, `ex`              | regenerated by census                                              |
| `docs/05-env-variables.md`                                                                | `ge`, `nyx`             | rebase `nyx`; keep both variable sets, decision variables first    |
| `src/tools/router/call/_pipeline.js`, `src/tools/router/call/_stages.js`                  | `ge`, `nyx`             | `ge` settles the shortlist; `nyx` rebases onto it                  |
| `docs/adr/ADR.md` + ADR numbering                                                         | `ge`, `dm`, `ex`, `nyx` | one allocator: numbers taken at merge time, collisions re-numbered |
| `docs/0*.md` (other generated docs)                                                       | `ge`, `dm`              | `dm` folds into `ge`, so the conflict disappears with the branch   |
| `skills/rule/SKILL.md`                                                                     | `ge` only               | no cross-branch conflict, heavy intra-branch conflict              |
| `tests/fixtures/guardrail-corpus.mjs`                                                     | `ge` only               | append-only, one plan at a time                                    |

## 9 - Gates

Automatic, on every node: the corpus and router-coverage suites, `census:check`,
lint and typecheck.

Stage 0 gate record (2026-10-22, ADR 135):

- `pnpm lint`: exit `0` (`0 errors, 36 warnings`, under `--max-warnings 50`).
- `pnpm census:check`: exit `0` (`the census is current` after regenerating `tests/fixtures/census.json`).
- `node --import ./scripts/alias-hook.mjs --test tests/release/workflow.test.mjs tests/docs/security-policy.test.mjs tests/docs/dco.test.mjs tests/docs/link-integrity.test.mjs tests/docs/docs-accuracy.test.mjs`: `25/25` pass.
- `pnpm test:all`: exit `1`. Neutralizing the machine's global `core.hooksPath`
  (a temporary `GIT_CONFIG_GLOBAL` carrying only `user.*`) takes the 119 `✖`
  down to the pre-existing failures outside Stage 0: the sync-banner
  `content[0]` shift in four suites (section 13), and
  `tests/docs/file-size-budget.test.mjs` naming
  `src/core/__tests__/_prompt-directive.test.mjs` (152) and
  `src/core/self-update/_run.js` (202). Two further failures were stale
  assertions, corrected in `test(drift)`: the core-tool constant in
  `_minimal-tools` (23 -> 24) and the spacing in `_install-skills`.

Human, and only there:

| Gate                               | Where                                                                | Why                                  |
| ---------------------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| Every merge into `feat/evolution`  | stages 3, 4, 5                                                       | nothing lands unreviewed             |
| Decision-models kill criteria      | Stage 4, before the `ge` merge                                       | a step ships only against its number |
| Contended files                    | any PR touching the files in section 8                               | a mistake there multiplies           |
| Destructive plans                  | `ge`'s ADR 151/152 removals, and the `dm` fold that deletes 45 files | one-way in review terms              |
| Any commit that changes this graph | this file                                                            | the graph is the contract            |

## 10 - Verification

`tests/plans/plan-of-plans.test.mjs`, reading the branches with
`git show <branch>:<path>`:

- [x] Every level-2 node's `Branch:` and `Path:` resolve on that branch.
- [x] Every plan path claimed by two branches has a `DIVERGENCE` or
      `SUPERSEDES` entry in section 5.
- [x] Every plan file in scope has a status line, a `## Dependency graph` section
      and at least one checkbox.
- [x] The level-1 graph is acyclic.
- [x] The merge order in section 5 is consistent with the `MERGE` edges: a branch
      never appears before a branch it depends on.
- [x] A plan marked `done` has no open checkbox.

Green 16/16 after Stage 7 on 2026-10-23: `tests/plans/plan-of-plans.test.mjs`
7/7 for the `ex`/`nyx` level-0 and plans, `tests/plans/skills-plan.test.mjs`
9/9 for the 83 skill plans, and the `dm` copies retired.

## Dependency graph

Depends on: nothing. This is the level-0 node: it waits only on the decisions
already recorded (ADR 153, ADR 154) and on the branch states measured above.
Feeds: every level-2 node, and the owner's merge request after stage 5.
Shared files: `docs/plans/plan-of-plans.md` only. The contended files in section 8
belong to the merged branches, not to this plan.

## 12 - Open notes and risks

- **The divergent plans are not cheap, and the fold must not skip them.** All 44
  shared files differ, because `ge` carries the ADR 154 format and the ADR 152
  removals. Stage 1 takes `ge`'s version as authoritative, because `ge` is where
  those plans were rewritten.
- **`dm` looks like a branch and is not one.** 44 superseded copies and four
  commits that are three rebased twins plus one split mirror mean any merge from
  it is a rebase disguised as a merge. The fold is the cheap path, and it removes
  45 files a reader would otherwise maintain twice.
- **`ge` before `nyx` is deliberate.** The decision-models track lives on `ge`
  (Stage 1 moved the plan, the review and ADR 153/154 there), and `nyx` rewrites
  the same shortlist pipeline. Merging `ge` first settled the contract before the
  reranker merged; the generated files were regenerated at each merge (the `ge`
  and `nyx` merges), not merged by hand.
- **The decision-models track is code, not a plan-file merge.** Nine steps with
  kill criteria and a deletion rule: Steps 1-7 shipped, Step 8 was rejected,
  Step 9 closed, and the plan stays because DM-04/DM-10 and Step 5.4 are still
  open. The commit-lint closeout archived it once; it was restored, and the
  premature ADR 157 removed.
- **The level-1 orchestrator now lives on the merged branch.** `feat/guardrails`
  carries `skills-plan.md`; the Stage 4 merge brought it to `feat/evolution`, and
  the `ex`/`nyx` plans keep their single-document dependency sections. The rule
  stays in section 2 so a fifth branch cannot arrive silently without one.
- **`develop` is out of scope and stays that way** until the architect track is
  brought into this repository's plans.

## 14 - Task classes and model assignment

Every plan in every branch carries a `## Model assignment` section that maps its
own steps to one of these classes. This is the taxonomy those sections cite, so
a plan can be executed without re-deciding which model to reach for.

**Pool:** the models this pi instance can reach, minus OpenAI and Anthropic
families (excluded by decision, including those served through other providers).
Evidence gathered 2026-10-22 from three sources, cited per claim:

- **Artificial Analysis** model leaderboard: intelligence index, price per 1M
  tokens, output speed in tokens/s.
- **Arena (LMArena)** Agent leaderboard: share of head-to-head wins, plus its
  cost-per-task Pareto frontier.
- **Aider polyglot** leaderboard: percentage of edits applied correctly, which is
  the closest public measure of "can it change a file without breaking it".

### The classes

| Class       | Task                                                               | Model                      | Why, from the evidence                                                                                                                                              |
| ----------- | ------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `T1-plan`   | Planning, architecture, ADRs, prose that argues                    | `gemini-4-argon` (high)    | Arena Agent #6 overall and AA index 53 at $1.99; the Google family leads public edit-format compliance (Gemini 2.5 Pro 83.1% on Aider, the best non-excluded score) |
| `T2-git`    | Cross-branch work: fold, rebase, merge resolution                  | `grok-4.7` (xhigh)         | AA index 46 with 500k context; Grok 4 scored 79.6% on Aider, the strongest agentic-coding family outside the excluded two                                           |
| `T3-rules`  | Guardrail rules: small deterministic code, regex, engine contracts | `kimi-k2.7-code`           | A code-tuned family (Kimi K2: 59.1% Aider at $1.24) at $0.54 per 1M; the cheap end of the code-correctness range                                                    |
| `T4-tests`  | Test writing: node:test suites, fixtures, assertions               | `deepseek-v4.1-flash`      | AA index 45 at **$0.26** and 206 tokens/s; DeepSeek's reasoning line scored 74.2% on Aider at a tenth of the frontier price                                         |
| `T5-bulk`   | Mechanical edits at scale: retrofits, renames, regeneration        | `minimax-m3.1-flash`       | AA index 43 at $0.22, 93 tokens/s, 1M context; MiMo-V2.6-Flash ($0.06) is the cheaper alternate and sits on the Arena cost/task Pareto                              |
| `T6-review` | Audits, contradiction hunting, evidence measurement                | `muse-wonder-full` (max)   | AA index **56**, the highest reachable score, with a 1M context window; Arena Agent #7                                                                              |
| `T7-author` | Skill bodies: framework content, references, prose trimming        | `qwen3.8-max`              | AA index 45 with the broadest framework knowledge of the pool (Qwen3-235B: 59.6% Aider)                                                                             |
| `T8-verify` | Verification loops, gate runs, small format fixes                  | `gemini-3.8-flash` (high)  | AA index 41 at $1.24 with 137 tokens/s: fast enough to re-run a gate loop without waiting                                                                           |
| `T9-local`  | Offline checks with no network                                     | `llama.cpp/Laya-GGUF:Q8_0` | The only local model served here; use it for trivial mechanical reads, never for judgment                                                                           |

Two alternates worth naming because the pool is deep: `step-5-preview` (AA 44,
$1.03, 95 tokens/s) for `T7` when Qwen is unavailable, and `glm-5.3-flash`
(AA 42, $0.28) for `T5` when MiniMax is.

### How a plan uses this

Each plan's `## Model assignment` section lists its own phases against these
classes, with the model and one line of reasoning, and names a fallback. A step
that mixes classes takes the class of its **riskier** half: a rule implementation
that also writes prose is `T3-rules`, not `T7-author`.

The classes are about the work, not the file: the same `T4-tests` step in a
frontend plan and a data plan gets the same model, because the work is the same
and the evidence does not distinguish them.

## 13 - Fixes the review requires before the first node

From `docs/reviews/plan-graph.md`. **All of them are resolved on
`feat/guardrails`** (`3553780c` test, `6cda42ea` fix), where the plans
live on this branch; this list is kept so the state is readable without opening
the other branches.

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

## 15 - Model assignment

| Step in this plan                            | Class       | Model                    | Why                                                                                 |
| -------------------------------------------- | ----------- | ------------------------ | ----------------------------------------------------------------------------------- |
| Stage 0 - policy decisions                   | `T1-plan`   | `gemini-4-argon` (high)  | five public commitments argued from evidence; needs long context and careful prose  |
| Stage 0 - OSS-01/02/07 code and config edits | `T3-rules`  | `kimi-k2.7-code`         | workflow gates, SECURITY.md tables, DCO wording: small precise edits                |
| Stage 1 - fold `dm`                          | `T2-git`    | `grok-4.7` (xhigh)       | skip a cherry-pick, move a track, delete 45 files, retire a branch: git judgment    |
| Stage 2 - retrofit `ex` and `nyx`            | `T5-bulk`   | `minimax-m3.1-flash`     | the same section added to a handful of files                                        |
| Stages 4-5 - merges and rebases              | `T2-git`    | `grok-4.7` (xhigh)       | conflict resolution on generated files; the risk is a wrong merge, not a wrong line |
| Stage 6 - hand over to the owner             | `T1-plan`   | `gemini-4-argon` (high)  | a status summary the owner reads before opening the merge request                   |
| Stage 7 - format across every plan           | `T5-bulk`   | `minimax-m3.1-flash`     | mechanical, 95 files, checked by the test                                           |
| Section 14 - keep the evidence current       | `T6-review` | `muse-wonder-full` (max) | re-reading three leaderboards and re-deriving the mapping                           |

Fallback: if `muse-wonder-full` is unreachable, `glm-5.3` (max) is the next
highest allowed index at 45, and it is on the Arena open-model trend list.
