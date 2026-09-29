# 126: Close a feature with reset --soft onto the merge base and one validated commit

- **Date**: 2026-09-29
- **Status**: accepted
- **Tags**: git, workflow, history
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

WS6 closes a feature as one Conventional Commit that becomes the PR title, the changelog entry and the version input. The operation must preserve exactly what the branch contains and must pick the boundary from git, not from a model. Choosing the message is the model's job; deciding the range and proving the content survived is not.

## Decision

The close runs `git reset --soft <merge-base>` (the same deterministic boundary every other consumer reads) and then one `git commit`. A soft reset leaves the index holding the tip tree, so the new commit's tree is the tip tree by construction; the rewrite still captures `HEAD^{tree}` before and after and rolls the branch back on any mismatch or on a commit count other than one. The final message is supplied by the caller, validated against the one Conventional Commit rule, and committed with `--no-verify` so a project hook cannot reject the commit this contract just proved conforming. `force: true` (the `--close-feature --squash` intent) is required to propose; `confirm: true` is required to run.

## Consequences

A feature of any shape - linear or merged - becomes one commit whose tree is provably the same as before, and whose message is validated before it is written. The verification re-reads the commit count, the tree, the violations and the working tree, so a squash that produced two commits or a dirty tree is rolled back rather than left behind. The cost is that the intermediate history is only recoverable through the reflog, which is why the operation is confirmed and never automatic.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Squash with an interactive rebase todo - a scripted sequence editor is fragile to quote and cannot be tested without a pty
1. `git commit --amend` per commit and cherry-pick them into one - rebuilds the history by hand for no benefit when `reset --soft` already holds the tree
1. `git merge --squash` then commit - only works while merging, not when the feature is already merged or linear
1. Leave the feature commits and let the PR squash on merge - loses the local linear history the plan asks for, and the message would be chosen at merge time from the last session
