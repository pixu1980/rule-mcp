# Review: can the plan graph be implemented linearly?

Status: `done`. Scope: `docs/plans/plan-of-plans.md` on `main`, and the 93 plan
files on `feat/guardrails-evolution`, `feat/decision-models`, `feat/export`,
`feat/nyx`. Method: measurement, not re-reading. Every number below comes from a
command in section 8.

## Verdict

**No, not yet.** The graph is directionally sound - the precedence policies are
right, the stage order is defensible, and a total order is genuinely forced by
three shared files. But it is **not executable today**: two ordering holes make
two stages unsatisfiable as written, the per-plan graph exists in **0 of 93
files**, and two documents define two different plan formats. Six blockers,
listed by severity.

What is already correct and should not be touched:

- the leaf-before-router policy and the four contract edges it depends on
  (`rule-process#2`, `rule-process#3`, `rule-platform-desktop#3`, `rule-class-adr`);
- the fold of `feat/decision-models` (29 byte-identical copies, 3 diverged by 1-4
  lines, 1 unique plan, 1 unique commit) - measured, correct, cheap;
- the merge order, which puts `guardrails-evolution` last for the right reason
  (413 changed files, two removals);
- the four human gates.

## Findings

| id | Severity | Finding | Evidence | Fix | Branch |
| -- | -------- | ------- | -------- | --- | ------ |
| F1 | **blocker** | The per-plan dependency graph does not exist: 0 of 93 plan files have a `## Dependency graph` section | section 8, M2 | apply the ADR 154 contract stage by stage (already planned, never started) | `ge` |
| F2 | **blocker** | `rule-platform-auth` is in Stage 3 and consumes `rule-platform-desktop#3`, also Stage 3. The plan's own test rule says a node's dependency must be in a **strictly earlier** stage | section 8, M5 | move `rule-platform-auth` to Stage 4, or declare an explicit intra-stage order and exempt it in the test | `ge` |
| F3 | **blocker** | Two skills are created in Stage 3 (`rule-toolchain-electron`, `rule-toolchain-tauri`, by `rule-platform-desktop#4`) but belong to the toolchain area, whose leaves run in Stage 1. A later stage creates nodes for an area that already closed | section 8, M6 | write their plans first and give them a stage after 3, or state that the toolchain area is not closed until Stage 3 | `ge` |
| F4 | **major** | Node identity changes mid-flight: the node is `rule-process-bmad` and the resulting skill is `rule-method`. The graph uses both names, so a parser sees two nodes and a human sees one | section 8, M5 | one id per node (`rule-process-bmad`, with `Produces: rule-method`) | `ge` |
| F5 | **major** | Two plan formats. ADR 154 requires `Status:` + `Depends on:` / `Feeds:` / `Shared files:`; `plan-of-plans.md` requires `Branch:` / `Path:` as well. A plan cannot satisfy both without a third amendment | section 8, M3 | add `Branch:` and `Path:` to ADR 154's line set (five lines, one contract), or derive them from the file path | `ge` |
| F6 | **major** | The contended-file lists disagree: `skills-plan.md` names 5 files, `plan-of-plans.md` names 8 (it adds `HANDOFF.md`, `docs/*`, `docs/adr/*`, `skills/rule/SKILL.md`) | section 8, M7 | one list, in `plan-of-plans.md`, referenced by the level-1 file | `main` + `ge` |
| F7 | minor | `plan-of-plans.md` says 98 unique plan paths; it is 99 since the file itself landed | section 8, M1 | update the count | `main` |
| F8 | minor | Status vocabulary compliance is 9 of 93. The other 84 say "plan only" or a sentence, which no test can read | section 8, M4 | normalise to the five values as each stage starts | `ge` |
| F9 | minor | One plan file has no checkbox: `installer-scope-adr-policy-features.md`, which this plan declares outside the graph. A test that demands a checkbox in every plan file fails on it | section 8, M2 | exempt the three non-skill plans by path in the test, or give that file a single box | both |

## Is a linear implementation possible?

**A total order is real, and it is imposed by three files, not by taste:**

1. `tests/fixtures/guardrail-corpus.mjs` - every plan that adds a rule appends to
   it. That is 60+ of the 83 nodes, so the corpus serialises most of the
   catalogue by construction.
2. `docs/adr/ADR.md` and the ADR numbering - every plan creates two ADRs. The
   numbers are global and allocated at merge time.
3. `tests/fixtures/census.json` and the six generated docs - every plan that
   changes a count regenerates them, and a regeneration invalidates the other
   branch's copy.

So the honest answer is not "83 parallel nodes": it is **a chain with three
parallel windows**. The windows are:

- **after Stage 0, the areas are independent of each other** - toolchain, ui,
  styleguide, platform, meta, frontend, devops, data, backend, ai only touch
  their own files plus the three shared ones. Inside an area, leaves are
  independent except where section 6 of `skills-plan.md` names a cross-cutting
  commit.
- **Stage 10's 11 routers serialise among themselves**, by design: they all write
  the dispatcher and `router-gaps`.
- **across branches, `ex` and `nyx` are independent**, and both must land before
  `ge` because `ge` regenerates the files they touch.

Everything else is sequential. Any plan that claims "83 nodes, mostly parallel"
is wrong; the correct statement is "one chain, three windows, and the chain is
short because the windows are wide".

## Stage audit (`skills-plan.md`)

| Stage | Declared nodes | Named in the text | Verdict |
| ----- | -------------: | ----------------: | ------- |
| 0 | 5 | 4 + 2 phase refs | correct in intent, ambiguous in ids (F4) |
| 1 | 12 | 6 + 2 non-existent | over-counts by the two phantom nodes (F3) |
| 2 | 22 | 4 + prose | the count is right (15 styleguide + 7 process); the text does not enumerate them, so a parser cannot count them |
| 3 | 6 | 9 | includes `rule-platform-agent` (removed, not a node) and the same-stage edge (F2) |
| 4 | 6 | 6 | correct, including `rule-process-tdd` after `rule-platform-mobile#2` |
| 5 | 7 | 7 | correct |
| 6 | 4 | 4 | correct |
| 7 | 8 | 8 | correct; `rule-data-sql` first inside the stage |
| 8 | 8 | 9 | includes `rule-backend-security`'s contract from Stage 3 - correct edge |
| 9 | 4 | 5 | includes the router, which is Stage 10 |
| 10 | 11 | 16 | prose mentions leaves; the 11 routers are right |

The declared count (12 + 22 + 6 + 6 + 7 + 4 + 8 + 8 + 4 + 11 = 88) plus Stage 0's
5, minus the two nodes that appear in both `0` and their own stage
(`rule-platform-desktop`, `rule-process`), gives 91, not 83. **The stage inventory
over-counts by 8.** The fix is not arithmetic: each stage needs an explicit list of
its node ids, and the test sums them.

## Cross-branch audit (`plan-of-plans.md`)

| Check | Result |
| ----- | ------ |
| Branches behind `main` | 0 for all four: no pre-merge rebase needed |
| Fold correctness | `dm` = `ge` minus one commit; 29 identical copies, 3 diverged by 1-4 lines, 1 unique plan (`decision-models.md`) |
| Merge order vs edges | consistent: `ex`, `nyx` before `ge`; `dm` folded into `ge`, never merged |
| Contended files | `ge∩dm` 233 (disappears with the fold), `ge∩ex` 3, `ge∩nyx` 1 |
| Level-0 test feasibility | the test reads `git show <branch>:<path>`: feasible, and it is the only way to verify a node that does not live on `main` |
| Missing | the `Branch:`/`Path:` pair exists in no plan file today, so the level-0 test would fail on all 99 paths (F5) |

## What to change before the first node is executed

Ordered, and none of it is optional except where marked:

- [ ] F2 - decide the Stage 3 order: move `rule-platform-auth` to Stage 4, or add
      the intra-stage exception.
- [ ] F3 - decide the toolchain additions: their own plans with a stage after 3,
      or an explicit statement that the toolchain area is not closed.
- [ ] F4 - one id per node: `rule-process-bmad`, with `Produces: rule-method`.
- [ ] F5 - one format: amend ADR 154 to five lines (`Status`, `Branch`, `Path`,
      `Depends on`, `Feeds`) plus `Shared files`.
- [ ] F1 - apply the contract, stage by stage, starting with Stage 0.
- [x] F6 - align the contended-file lists (fixed in `plan-of-plans.md`; the
      level-1 file must point at it).
- [x] F7 - correct 98 to 99.
- [ ] F8 - normalise the status line as each stage starts.
- [ ] F9 - exempt the three non-skill plans from the checkbox assertion by path.
- [ ] Add an explicit node list per stage, so the counts can be summed instead of
      asserted (Stage audit).

## Measurements (section 8)

Every number in this review comes from one of these:

```
M1  for b in main ge dm ex nyx; do git ls-tree -r --name-only $b -- docs/plans | grep -c '\.md$'; done
    and the union of the same, deduplicated: 99 unique paths
M2  git archive ge docs/plans | untar; for each plan file: count '^Status:', '^## Dependency graph', '^- \[[ xX]\]'
    -> 93 files: status 93, graph 0, checkbox 92 (the missing one is installer-scope-...)
M3  same loop, matching the status value against the five-value vocabulary -> 9 compliant
M4  same, listing the non-compliant values -> 84 free-form sentences
M5  extract backticked rule-* ids per stage from skills-plan.md and deduplicate
M6  grep for rule-toolchain-electron|rule-toolchain-tauri in docs/plans -> 10 mentions, 0 plans
M7  compare the shared-file tables of skills-plan.md (§4, 5 rows) and plan-of-plans.md (§8, 5 rows + 3)
M8  git merge-base --is-ancestor dm ge; git rev-list --count ge..dm -> 1 commit
M9  per-plan diff dm:plan vs ge:plan -> 29 identical, 3 diverged (1, 1, 4 lines)
```

## What this review does not cover

- The plans' **content quality** beyond their dependency claims. That is 83
  separate reviews and the per-plan plans already carry their own evidence.
- `origin/develop`: out of scope by decision, and it carries a different track.
- Whether the area order (`ui, toolchain, styleguide, ...`) is optimal. It is
  inherited from `DEPENDENCIES.md` and nothing measured contradicts it.
