# 154: Every plan carries a status line, a dependency graph and checkbox steps

- **Date**: 2026-10-21
- **Status**: accepted
- **Tags**: plans, convention, format, governance, testing
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The 83 plan files were written across eleven areas over several sessions. Each one invented its own head: some say 'Status: plan only', some say nothing, four have a heading that mentions dependencies, none has a graph, and the checkbox step is the only convention that survived because it was useful immediately. A test cannot verify a convention that does not exist, and an executor cannot pick the next plan from prose.

## Decision

A plan file carries, in this order: an H1; a status line with one of five values (planned, in-progress, done, blocked, superseded) plus a reason when it is blocked or superseded; a '## Dependency graph' section with free prose plus three parseable lines - Depends on:, Feeds:, Shared files:; and checkbox steps in the form - [ ] while open and - [x] when closed, lowercase x, no other marker form. The progress table in skills-plan.md keeps one row per node and the verification test recomputes it, so a stale row fails. A node is done when its boxes are closed and the gates its own plan declares have run; nothing else is required.

**Amendment 2026-10-21 (finding F5 of `docs/reviews/plan-graph.md`):** a plan that
lives inside a branch carries four lines - `Depends on:`, `Feeds:`, `Shared files:`
- while a document that coordinates plans across branches additionally carries
`Branch:` and `Path:`. The owner's decision was the conditional form: six lines
where a node must be findable from another branch, four where the file's location
already says everything. `plan-of-plans.md` on `main` is the six-line case.
A `CONTRACT` edge names a phase (`target#2`) and is exempt from the rule that a
dependency sits in an earlier stage, because what closes first is the phase.


## Consequences

The verification test can assert the format, so a plan written next month fails instead of drifting. Cost: 83 files need the head and the graph section, added stage by stage as their work begins, and the five status values are one more thing to get right on every commit. The status line also makes 'blocked' explicit, which is the state nine plans are actually in today without saying so.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Three parseable lines with no prose (rejected: the prose is where the reason for an edge lives, and a bare edge list invites deleting it)
1. A machine-readable table of edges in every plan (rejected: 83 tables to maintain by hand, and the orchestrator already holds the graph)
1. Generate the status line and the graph section from skills-plan.md (rejected: the plan is the record; the orchestrator is the summary, and reversing that makes every edit a two-file edit)
1. Uppercase - [X] as the closed marker (rejected: every existing file uses lowercase and the test normalises anyway)
