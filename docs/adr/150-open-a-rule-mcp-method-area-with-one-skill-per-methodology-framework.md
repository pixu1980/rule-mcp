# 150: Open a rule-mcp-method area with one skill per methodology framework

- **Date**: 2026-10-21
- **Status**: accepted
- **Tags**: skills, method, bmad, spec-kit, openspec, gsd, breaking
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

ADR 149 kept rule-process-bmad as the single methodology skill with a chooser, and refused peer skills for Spec Kit, OpenSpec and GSD. The owner reversed that on 2026-10-21: the four frameworks have genuinely different workflows, install stories and artifacts, so one skill has to either mirror all four or teach none of them in depth. The chooser alone also left the dual-framework anti-pattern unenforced while the catalog offered exactly one way in.

## Decision

Open a new area rule-mcp-method with a router skill rule-mcp-method plus one leaf per framework: rule-mcp-method-bmad (renamed from rule-process-bmad), rule-mcp-method-spec-kit, rule-mcp-method-openspec, rule-mcp-method-gsd. Each leaf declares inherits: [rule-mcp-method] and owns only framework-specific content; the router owns the chooser and the cross-framework guardrails (method-single-framework, method-output-not-in-src). The generated tool name follows: rule_tool_process_bmad becomes rule_tool_method_bmad, a breaking rename for clients. rule-process keeps its other children and points methodology questions at rule-mcp-method.

## Consequences

Four new router rows and one renamed skill: 85 skills become 89, the method area owns two cross-framework rules, and every client calling rule_tool_process_bmad breaks. The leaf skills stay thin because the router owns the comparison; the cost is one more directory level to navigate and a rename that must be finished in one census run or the docs accuracy test fails.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep one rule-process-bmad skill with an internal chooser (ADR 149; rejected by the owner: four frameworks cannot share one body)
1. Create the three new skills under rule-process and leave the family split across two areas (rejected: the ids would promise a taxonomy the directory tree does not carry)
1. Create rule-process-spec-kit and friends and rename them in a following commit (rejected: a rename commit that carries no information; the plan creates final names directly)
