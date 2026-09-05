# 041: Port the complete rule evolution as a rule-native additive union

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: architecture, porting, parity, tdd
- **Author**: rule-mcp

## Context

rule-mcp develop@12d60a9 has evolved to 90 skills, 106 tools, 186 resources, 33 prompts, 43 source-only runtime modules, 9 source-only scripts, and 61 source-only tests. rule-mcp contains target-only skills, rules, extensions, modular runtime structure, and release safeguards that must not be removed.

## Decision

Port source behavior into rule-mcp without modifying the source repository. Keep rule_tool__, rule-_ and rule:// public namespaces; expose the complete union; let source content prevail for common skills; preserve and actively route target-only capabilities; archive upstream decision history separately; keep version 1.0.0 during migration; execute by TDD phases with approval gates.

## Consequences

Expected final public surface is 94 skills, 110 tools, 194 resources and 34 prompts before any registry-derived adjustments. The migration is intentionally additive and requires parity fixtures, source-to-target branding checks, architecture-aware merges, full CI validation, and documentation count updates. Historical ADR numbering cannot be copied into the target series directly.

## Alternatives Considered

1. Replace the target with the source and reapply target-only work
1. Keep advanced source capabilities behind feature flags
1. Renumber every upstream ADR into the target chronology
1. Expose legacy rule aliases
