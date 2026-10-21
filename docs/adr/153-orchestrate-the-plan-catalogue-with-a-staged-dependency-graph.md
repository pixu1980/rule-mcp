# 153: Orchestrate the plan catalogue with a staged dependency graph

- **Date**: 2026-10-21
- **Status**: accepted
- **Tags**: plans, orchestration, dependency-graph, process, governance
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

docs/plans holds 94 files on feat/guardrails-evolution: 82 skill plans, one cross-skill plan (bundler-family), 9 area plans, and three documents that are not work. Nobody knows what to run first. DEPENDENCIES.md states four edges and stops there, while the plans themselves force more: rule-method must close before rule-process, the served-references surface of rule-platform-desktop unblocks nine plans, and the route-table generator in rule-process unblocks seven routers. Measured baseline: no plan carries a status marker, none has a dependency graph section, 35 plans have at least one closed box and none is done.

## Decision

One orchestrator at docs/plans/skills/skills-plan.md, inside the catalogue it orders. Nodes are whole plans: 83 of them (82 skill plans plus the bundler-family cross-skill plan). The 9 area plans are absorbed into the leaf and router plans that implement their content and leave the graph. Edges have four kinds with different executor semantics: HARD blocks, ORDER warns, CONFLICT serialises on the five shared files (dispatcher, router-gaps, ADR index and numbering, census snapshot and generated docs, guardrail corpus), CONTRACT blocks on one exporting phase of a plan. Nine precedence policies govern the edges, and a contradiction between a plan's text and the graph is an audit finding rather than a silent override. Twelve stages order the work; Stage 0 runs rule-process-ai, then rule-process-adr, then rule-platform-desktop#3, then rule-process#2 and #3. The AI area needs no exception: ADR 137's eight rules move to rule-ai-agent-architecture, the leaf that consumes them, so a leaf precedes its router in all eleven areas. rule-process-tdd carries a CONTRACT edge to rule-platform-mobile#2 because the rule it cites lives there. Execution is on this branch, one commit per stage, four human gates: Stage 0 before anything, area close, any node touching the five shared files, and any destructive node.

## Consequences

The catalogue gains one file that says what to do next, and every plan gains the three lines that make the answer checkable. Cost: 83 plans must be retrofitted stage by stage, and a stale progress row now fails a test instead of going unnoticed. The AI plans change: the eight rules move from rule-ai to rule-ai-agent-architecture, which inverts nothing else. The nine area plans become superseded documents and their content lives where it is implemented.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Run the plans in the alphabetical order the index already has (rejected: it puts routers before leaves and ignores the seven-plan generator contract)
1. One branch per plan or per area (rejected: the five shared files conflict on every merge, and the branch already carries the plans)
1. Generate the graph from a data file (rejected for now: the plans' dependency prose is the source, and a data file would be a second place to keep true before the first is stable)
1. Keep the nine area plans as verification nodes in a final stage (rejected: their content duplicates what the leaf plans implement, and a node that verifies another node's output is a review, not a plan)
