# 021: Rename rule-mcp-agents to rule-mcp-agents and add rule-mcp collector skill

- **Date**: 2026-08-01
- **Status**: accepted
- **Tags**: taxonomy, skills, routing, ai
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The skill `rule-mcp-agents` was the only AI-domain skill and its name leaked the `rule-mcp-core` dependency into the taxonomy, while the ecosystem naming convention groups domain skills under a collector (e.g. `rule-frontend` -> `rule-frontend-*`, `rule-data` -> `rule-data-*`). AI/agent work had no collector and no domain classification in the routing scorer.

## Decision

Rename `rule-mcp-agents` to `rule-mcp-agents` (tool becomes `pix_galaxy_agents`) and add a new `rule-mcp` collector skill that indexes AI/agent skills - `rule-mcp-agents` (@rule/rule-mcp-core based) and `rule-platform-agent` (framework-agnostic) - mirroring the `rule-frontend` / `rule-frontend-*` pattern. Router gains AI domain classification and treats `rule-mcp` as a collector in framework bias; detector maps `@rule/rule-mcp-core` to the `agents` framework -> `rule-mcp-agents`.

## Consequences

Positive: AI/agent prompts now route to the `rule-mcp` collector with `rule-mcp-agents` as the concrete skill; naming is dependency-agnostic and consistent with other domain collectors; project auto-detection suggests the right skill for rule-mcp-core repos. Negative: `pix_galaxy_agents` tool name is a breaking rename for any consumer referencing the old tool; the old skill name no longer resolves.

## Alternatives Considered

1. Keep `rule-mcp-agents` name and add collector only (rejected: leaks core-library coupling into taxonomy)
1. Create `rule-mcp` as an alias that just forwards to rule-mcp-agents without indexing rule-platform-agent (rejected: less useful than a real index)
1. Add AI domain classification only, no collector (rejected: no routing target for broad agent work)
