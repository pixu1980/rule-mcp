# 125: Normalize history on the merge base and hold every rewrite to a tree invariant

- **Date**: 2026-09-28
- **Status**: accepted
- **Tags**: git, workflow, history
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

WS4 removes merge commits from a feature branch while preserving exactly what the branch contains. The obvious commands are wrong in two different ways: `git rebase <base>` also pulls the base's new commits in and changes the tree, and squashing each merge into its neighbour loses any content a merge resolved in a way neither parent had (an "evil merge"). A history rewrite that quietly changes what the repository holds is worse than leaving the merges in.

## Decision

Linearization runs `git rebase <merge-base>`: replaying the feature commits onto the fork point drops the merges and leaves the final tree exactly as it was. Every rewrite - reword (via `git filter-branch --msg-filter`) and linearize - captures `HEAD^{tree}` before and re-reads it after, and if the two differ the branch is rolled back with `git reset --hard <original>` and the rewrite is refused. A conflict aborts and rolls back the same way, and the conflicted files are reported, never resolved. Destructive proposals require `force: true` (the `/rule-git --force` flag); execution always requires `confirm: true`, and `force` never substitutes for it.

## Consequences

A merge commit that carried no unique content disappears and the content is provably unchanged, because the tree hash matches. A merge that did carry unique content cannot be flattened without changing the tree, so the tool refuses instead of silently dropping it. The cost is that a legitimate but non-trivial merge history has to be resolved by hand. Both rewrites are local-only and never push, and the confirmation gate means an agent cannot rewrite history on its own.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Squash each merge into its neighbor - the plan names this as the wrong assumption; a merge whose tree differs from both parents loses that content
1. Rebase onto the base tip - that also pulls the base's commits in and changes the branch content, which is WS2's job, not normalization
1. git filter-branch for the merges too - rewrites messages, not topology, so it cannot drop a merge
1. Force-push a cleaned branch and let CI sort it out - loses the local safety and the invariant check
