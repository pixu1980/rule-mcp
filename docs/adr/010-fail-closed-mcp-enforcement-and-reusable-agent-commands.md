# 010 - Fail-closed MCP enforcement and reusable agent commands

- **Date**: 2026-07-11
- **Status**: accepted
- **Tags**: architecture, security, mcp, guardrails, agents
- **Author**: pix-architect

## Context

LLM clients can submit malformed or adversarial arguments, consume invalid tool output, invent skill/tool identifiers, assume undeclared dependencies, suppress errors, or bypass project workflow. The same evidence-first workflow must be reusable across supported coding agents.

## Decision

Wrap every MCP handler with mandatory preprocessing and postprocessing. Reject unsafe input and malformed output, verify pix routes against live registries, attach auditable enforcement metadata, make pix_tool_check failures blocking, expose manifest-derived allowedDependencies, and install the pix-galaxy-mcp workflow using each host verified command or agent mechanism. Rename the dispatcher skill to pix while retaining pix-galaxy-mcp as the product name.

## Consequences

Positive: deterministic fail-closed behavior, visible audit contract, fewer hallucinated dependencies and completion claims, consistent cross-agent workflow. Negative: stricter schemas may reject formerly tolerated payloads; clients must provide dependency context for import verification; host command paths require maintenance as agent conventions evolve.

## Alternatives Considered

1. Rely only on prompt instructions and non-blocking after hooks.
1. Apply enforcement only to the pix router rather than every tool.
1. Assume one universal slash-command filesystem convention for all agents.
