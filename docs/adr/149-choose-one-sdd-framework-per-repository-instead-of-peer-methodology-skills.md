# 149: Choose one SDD framework per repository instead of peer methodology skills

- **Date**: 2026-10-21
- **Status**: superseded by [150](150-open-a-rule-mcp-method-area-with-one-skill-per-methodology-framework.md)
- **Tags**: skills, process, bmad, methodology, guardrails
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

rule-mcp-process-bmad mirrored BMAD upstream in 421 lines while the 2026 landscape (BMAD, GitHub Spec Kit, OpenSpec, Kiro, GSD/Ralph/Task Master, plain AGENTS.md) offers alternative frameworks, not layers. The old plan proposed one skill with a chooser, but no rule measured the dual-framework anti-pattern the chooser warns about, and a second pack ('.specify/') could appear next to '_bmad/' with nothing failing.

## Decision

Keep rule-mcp-process-bmad as the single methodology skill. Its body stays structurally as it is for now; the plan moves the cut to references/ into a deferred phase. In exchange the skill accepts enforceable rules: a repository may run one SDD framework, declared in FRAMEWORK.md when a second pack is present. Spec Kit, OpenSpec and GSD are documented as alternatives inside this skill, never as peer skills in the catalog, until the routing corpus shows sustained demand for them.

## Consequences

One methodology skill, one ADR-visible policy, and a rule that can fail. Cost: the plan gains two phases before the body is trimmed, so the mirror lives a while longer. Reversal is cheap - promoting Spec Kit later is another skill plus a routing decision.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Add rule-mcp-process-spec-kit, rule-mcp-process-openspec and rule-mcp-process-gsd as peer skills (rejected: the market treats these as alternatives; equal skills invite 'install both')
1. Delete rule-mcp-process-bmad and link upstream only (rejected: the chooser is the useful part, and the deletion leaves the router without a methodology answer)
1. Keep the skill unchanged and rely on prose warnings (rejected: a warning with no rule is what shipped before and nothing measured it)
