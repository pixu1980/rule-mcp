# 076: The persona trio is kept by a deterministic helper, not by model discipline

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: personas, docs, tools, determinism
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

A review persona run owns three documents with stable per-role paths: docs/audits/<role>.md is overwritten because an audit is a snapshot of now, docs/reviews/<role>.md accumulates findings and flips them as they close, docs/plans/<role>.md is re-derived from what is still open and is deleted when nothing is. ADR 072 shipped that contract as text in the filled role template, which meant the rules held exactly as long as the model remembered them. They are mechanical rules: read the last run's table, flip what is no longer reported, drop what was already resolved, sort by severity, delete a file on an empty set. A review whose statuses have drifted is worse than no review, because a reader takes it as current, and drift is the failure mode a text instruction produces first.

## Decision

src/core/review-docs.js does the bookkeeping and pix_plan_docs exposes it: give it a role and the findings this run reported, and it writes the three skeletons with their headers, merges the findings against what the review already records, flips anything the run no longer reports to resolved, prunes what was resolved in the previous run, re-derives the plan worst-severity-first, and deletes the plan file when nothing is open. Reported means open, which is what makes the merge a function of one run's output rather than of a status the model has to maintain. The review table is the storage format and is parsed back on the next run, so pipes in a summary are escaped on the way out and unescaped on the way in. The tool writes no content: evidence, the wording of each finding and what each step takes stay the agent's work, and the role template now names the helper so the agent reaches for it instead of hand-rolling the tables. Surface grows by one tool to 108, which moves the two committed assertions that count it.

## Consequences

A persona run that ignores pix_plan_docs still works and writes whatever it writes, so the helper is the easy path rather than a gate; C.3's docs-scan extension is what turns the contract into something enforced, and it is not built yet. The review table is now a parsed format, so a hand edit that breaks a row silently drops that finding on the next merge, and the format has no version marker to notice a future change. Documents are written under the caller's projectDir, which means the tool writes files as a side effect of an ordinary tool call, in a repository the caller names. A finding whose id changes between runs reads as one finding closing and another opening, so ids have to be stable to be useful. The trio for a deprecated role is still removed by hand or by a superseding role, unchanged by this ADR.

## Alternatives Considered

1. Leave the contract as template text: it is what ADR 072 shipped, and the drift it allows is silent, which is the kind this repository has already paid for once
1. Make pix_plan write the documents itself: the audit content is the model's work and cannot be generated deterministically, so the tool would have to be two things at once
1. Store the findings as JSON beside the markdown: a second file to keep in sync, and the markdown table already round-trips
1. Add seven per-role document tools: the tools/list budget is why B.4 was deferred, and one tool that takes a role id answers the same question
