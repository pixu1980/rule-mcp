# 026: Rename rule-mcp-agents to rule-mcp-ai-agents and add rule-mcp-ai collector skill

- **Date**: 2026-08-01
- **Status**: accepted
- **Tags**: taxonomy, skills, routing, ai
- **Author**: rule-mcp-architect

## Context

The skill `rule-mcp-agents` was the only AI-domain skill and its name leaked the `rule-mcp-core` dependency into the taxonomy, while the ecosystem naming convention groups domain skills under a collector (e.g. `rule-mcp-frontend` -> `rule-mcp-frontend-*`, `rule-mcp-data` -> `rule-mcp-data-*`). AI/agent work had no collector and no domain classification in the routing scorer.

## Decision

Rename `rule-mcp-agents` to `rule-mcp-ai-agents` (tool becomes `rule_tool_ai_agents`) and add a new `rule-mcp-ai` collector skill that indexes AI/agent skills - `rule-mcp-ai-agents` (@rule-mcp/rule-mcp-core based) and `rule-mcp-platform-agent` (framework-agnostic) - mirroring the `rule-mcp-frontend` / `rule-mcp-frontend-*` pattern. Router gains AI domain classification and treats `rule-mcp-ai` as a collector in framework bias; detector maps `@rule-mcp/rule-mcp-core` to the `agents` framework -> `rule-mcp-ai-agents`.

## Consequences

Positive: AI/agent prompts now route to the `rule-mcp-ai` collector with `rule-mcp-ai-agents` as the concrete skill; naming is dependency-agnostic and consistent with other domain collectors; project auto-detection suggests the right skill for rule-mcp-core repos. Negative: `rule_tool_galaxy_agents` tool name is a breaking rename for any consumer referencing the old tool; the old skill name no longer resolves.

## Alternatives Considered

1. Keep `rule-mcp-agents` name and add collector only (rejected: leaks core-library coupling into taxonomy)
1. Create `rule-mcp-ai` as an alias that just forwards to rule-mcp-ai-agents without indexing rule-mcp-platform-agent (rejected: less useful than a real index)
1. Add AI domain classification only, no collector (rejected: no routing target for broad agent work)
