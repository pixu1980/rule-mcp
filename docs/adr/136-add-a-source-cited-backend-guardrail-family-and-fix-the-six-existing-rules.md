# 136: Add a source-cited backend guardrail family and fix the six existing rules

- **Date**: 2026-10-17
- **Status**: proposed
- **Tags**: guardrails, backend, security, quality-gate
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Nine rule-mcp-backend skills exist, but only rule-mcp-backend owns guardrails and it owns six rules (cors-explicit, error-exposure, helmet-headers, input-validation, rate-limiting, sql-injection). rule-mcp-backend-security, rule-mcp-backend-node, rule-mcp-backend-workers, rule-mcp-backend-graphql and the four framework skills carry rich guidance with no deterministic check. Three of the six rules also miss the Hono forms (secureHeaders, hono-rate-limiter, @hono/zod-validator), which turns them into false positives for a framework this repo serves. OWASP API Security Top 10, ASVS, the OWASP Node/GraphQL/SSRF/Prototype Pollution/Auth cheatsheets, RFC 8725, the Node.js docs, Express security and the Fastify/Hono/NestJS guides all publish de facto rules that map to static checks.

## Decision

Extend the patterns of the six existing backend rules to the framework equivalents, then add twenty-five guardrails split by owner: fifteen shared in rule-mcp-backend (auth, static analysis, resource limits, outbound timeout and runtime resilience), five in rule-mcp-backend-graphql, one in rule-mcp-backend-node and four in the framework skills. Rules ship advisory and are promoted to blocking only after the corpus gate reports 100% precision and recall for the rule id. Triggers stay content heuristics narrowed to server or route files under src/, plus framework-scoped activation when the file imports the framework. Two questions stay open for the owner: the Tier A/Tier B split of the twenty-five, and whether the runtime rules live in rule-mcp-backend-node with rule-mcp-backend-node added to the inherits of the server-bearing children.

## Consequences

Positive: the backend family stops being narrative only; the Hono false positives disappear; every rule is traceable to a public source. Negative: twenty-five rules need fifty corpus fixtures plus a framework fixture per family, the inheritance graph may change for the runtime rules, and Tier B rules add advisory noise until they earn promotion.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the six rules and document the rest as prose only
1. Add only the ten Tier A rules and leave the advisory set out
1. Put every new rule in rule-mcp-backend and skip the per-skill ownership split
1. Make the new rules blocking from day one instead of proving them against the corpus
