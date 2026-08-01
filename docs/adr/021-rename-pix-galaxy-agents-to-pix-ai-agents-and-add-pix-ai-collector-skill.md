# 021: Rename pix-galaxy-agents to pix-ai-agents and add pix-ai collector skill

- **Date**: 2026-08-01
- **Status**: accepted
- **Tags**: taxonomy, skills, routing, ai
- **Author**: pix-architect

## Context

The skill `pix-galaxy-agents` was the only AI-domain skill and its name leaked the `pix-galaxy-core` dependency into the taxonomy, while the ecosystem naming convention groups domain skills under a collector (e.g. `pix-frontend` → `pix-frontend-*`, `pix-data` → `pix-data-*`). AI/agent work had no collector and no domain classification in the routing scorer.

## Decision

Rename `pix-galaxy-agents` to `pix-ai-agents` (tool becomes `pix_ai_agents`) and add a new `pix-ai` collector skill that indexes AI/agent skills — `pix-ai-agents` (@pix/pix-galaxy-core based) and `pix-platform-agent` (framework-agnostic) — mirroring the `pix-frontend` / `pix-frontend-*` pattern. Router gains AI domain classification and treats `pix-ai` as a collector in framework bias; detector maps `@pix/pix-galaxy-core` to the `agents` framework → `pix-ai-agents`.

## Consequences

Positive: AI/agent prompts now route to the `pix-ai` collector with `pix-ai-agents` as the concrete skill; naming is dependency-agnostic and consistent with other domain collectors; project auto-detection suggests the right skill for pix-galaxy-core repos. Negative: `pix_galaxy_agents` tool name is a breaking rename for any consumer referencing the old tool; the old skill name no longer resolves.

## Alternatives Considered

1. Keep `pix-galaxy-agents` name and add collector only (rejected: leaks core-library coupling into taxonomy)
1. Create `pix-ai` as an alias that just forwards to pix-ai-agents without indexing pix-platform-agent (rejected: less useful than a real index)
1. Add AI domain classification only, no collector (rejected: no routing target for broad agent work)
