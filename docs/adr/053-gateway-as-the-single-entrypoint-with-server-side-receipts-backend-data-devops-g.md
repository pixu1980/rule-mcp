# 053: Gateway as the single entrypoint with server-side receipts; backend/data/devops guardrail families

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: gateway, guardrails, determinism, receipt, backend
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The determinism+backend/data/devops guardrails plan (2026-07-15, from the post mega-review) argued MCP cannot enforce tool call order: the model can skip the router, call skill tools directly, or misreport check results. Axis A delivered rule_tool_gateway as the single orchestrating entrypoint (server-side routing, evidence, guardrail check, receipt) and Axis B delivered the backend, database, devops and security guardrail families plus the guardrail-to-skill mapping. All deliverables are live; the checklist file was never ticked and is now redundant.

## Decision

Gateway is the single server-side orchestrating entrypoint for every implementation flow; it issues a bound receipt the write path must present; backend/database/devops/security guardrails are first-class families mapped to their skills, not frontend annexes.

## Consequences

Positive: unvalidated code cannot be delivered (fail-closed at a single server-side entrypoint), server-side receipts bind writes to what was checked, and backend/database/devops/security guardrail families run on every check regardless of the frontend rule set. Negative: the gateway becomes the choke point for every read-modify-write flow, so its determinism and receipt handling are security-sensitive (covered by gateway-cache-receipt tests).

## Alternatives Considered

1. Model-first enforcement alone: rely on the model to call tools in order and respect gateway results
1. Per-call CLI verification wrapper around the model's writes
