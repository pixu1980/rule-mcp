# 098: develop merges into main by area, and stays as an integration branch

- **Date**: 2026-09-15
- **Status**: accepted
- **Tags**: process, git, merge, governance
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

main and develop diverged for 95 and 71 commits from d8788ed, with 213 conflicting paths. main had built the OSS, legal and CI layer (SPDX on 950 files, DCO, CodeQL, Scorecard, REUSE, governance, the docs site, verified release artifacts) and develop had built the TokenSave integration, the three-layer skill resolution, guardrails-in-skills, the SDK surface and the full-screen wizard. Six commits existed on both sides with different hashes. Eight features had been implemented twice, independently, and git could not see most of them: the same rules split into per-rule files under different directories, the same bootstrap scripts rewritten, the same test file rewritten, the same close-session archiving written twice.

## Decision

One merge commit, resolved by area rather than by hunk, followed by reconciliation commits. The OSS, legal and CI layer comes from main; the restructured subsystems come from develop, because a restructure resolved half is broken. For each duplicated feature a single side wins, recorded in the plan that drove the merge: develop's close-session archiving, develop's wizard without main's git-hook step, develop's Open Source Steward persona, develop's bootstraps with main's pinned URL, main's numbering for ADRs with develop's unique decisions appended from 088, main's scaffold test against main's implementation, and both sides' additions to the numbering doctor. develop is not deleted: it is reset onto main and kept as the integration branch.

## Consequences

The 71 develop commits stay readable in the graph instead of being replayed, which a rebase would have done against two cross-cutting mechanical passes on main. Every in-code ADR reference develop carried was remapped to main's numbering, so the two numbering schemes do not coexist. Four main features were found switched off rather than deleted - their code survived the merge while the call site did not - which is the failure mode an area-resolved merge produces and the test suite is what caught it. Resetting develop onto main after every merge keeps this from recurring at this scale.

## What would end this

A second long-lived branch, or a policy that main is the only branch. Either removes the integration branch this keeps alive.

## Alternatives Considered

1. Rebase develop's 71 commits onto main (rejected: the three cross-cutting restructures on develop would replay against two on main, multiplying the same conflicts by commit)
1. Squash develop into thematic commits (rejected: loses the M0-M8 and B-1..B-5 tracking the plans reference)
1. Take develop wholesale (rejected: 135 files main added after the fork are absent from develop, including the entire OSS and legal layer)
