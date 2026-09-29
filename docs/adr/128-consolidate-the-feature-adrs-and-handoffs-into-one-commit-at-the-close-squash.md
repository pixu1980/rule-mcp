# 128: Consolidate the feature ADRs and handoffs into one commit at the close squash

- **Date**: 2026-09-29
- **Status**: accepted
- **Tags**: git, workflow, docs, history
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Closing a feature with `/rule-handoff --close-feature --squash` left the feature's ADRs and handoff documents as their own commits - `docs(adr): ...` and `chore(handoff): ...` - so the "single commit for the feature" existed only for the code. The developer wants the close to fold those documents too, verify which commits are involved, and rewrite the result coherently without losing any detail. The server must not decide the boundary semantically, and must not lose a decision in a synthesized summary.

## Decision

`rule_tool_git action=squash` consolidates the feature's documents before the squash, behind the same single confirmation. Relevance is the deterministic union of three signals: a commit in `merge-base..HEAD` that touched `docs/adr` or `docs/handoff`; a document cited by a commit message in the range or by a handoff in the range; a document whose filename carries the branch slug. The merged ADR and the merged handoff are deterministic concatenations - a header, then every original reproduced verbatim in order - and the originals are deleted; a document matched by citation or name but committed outside the range is cited inside the merged document and never touched. The merged files keep the lowest retired number and the branch slug (`feat/git-workflow` -> `git-workflow`), and `docs/adr/ADR.md` and `docs/handoff/HANDOFF.md` are rebuilt from the files on disk. The order is: consolidate the documents and stage them, `git reset --soft <merge-base>`, one commit, verify that the only paths differing from the pre-squash tree are the planned document paths. The final feature handoff is written after the squash and committed on its own as `chore(handoff): ...`. Consolidation runs only with `--squash`.

## Consequences

The closed feature is one commit holding the code and the consolidated ADR and handoff, and the two indexes. The tree invariant becomes narrower and stronger at once: only the planned document paths may differ from the pre-squash tree, and a single non-document change fails the verification and rolls the branch back with `git reset --hard`. Detail is never summarized away, because the merged file reproduces each original verbatim; the cost is a longer file and a retired set of paths whose numbers external links may still name. A document relevant to the feature but committed outside the range is the one case the operator has to resolve by hand.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep every ADR and handoff as its own commit and only squash the code - the feature closes with N+1 commits and the docs and the code can describe different feature boundaries
1. Let the model rewrite the merged documents - a synthesized summary is exactly where a decision detail gets lost, and it cannot be tested
1. Archive the originals under docs/*/archive/<feature>/ - keeps two copies of the same decision, and the next reader has to know which one is live
1. Merge only the handoffs and leave the ADRs separate - an accepted ADR is a record; one feature would still leave its decisions scattered across commits that no longer exist
1. Match documents by name only - a document renamed or created under another branch would be missed, and a shared document could be pulled in by accident
