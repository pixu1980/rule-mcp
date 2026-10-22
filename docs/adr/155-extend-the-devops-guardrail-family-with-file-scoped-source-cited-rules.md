# 155: Extend the devops guardrail family with file-scoped, source-cited rules

- **Date**: 2026-10-17
- **Status**: proposed
- **Tags**: guardrails, devops, quality-gate
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The five rule-devops skills cover pipelines, containers, testing, observability and preview environments, but only four deterministic rules exist: env-gitignore, secret-detection, docker-healthcheck and docker-non-root. Three skills (testing, observability, deploy-preview) have no guardrails directory at all. OWASP, Docker, GitLab, SLSA, Google SRE, DORA and Vitest all publish de facto rules that map to static checks on a small set of target files.

## Decision

Add twenty guardrails across the five devops skills, each scoped to its target file name (Dockerfile, .dockerignore, docker-compose.autodeploy.yml, .gitlab-ci.yml, vitest.config.*, _.test._, server entry, .do/review-app.yaml) and each citing the public source it derives from. Split them into Tier A (promotion path to blocking) and Tier B (advisory, no promotion yet). CI/CD rules live in rule-devops and reach the children through the existing inherits edges. Rules ship advisory and are promoted to blocking only after tests/core/guardrails-precision-recall.test.mjs reports 100% precision and recall for that rule id. Observability and preview behavior that no static check can prove is verified by CI scripts outside rule_tool_check.

## Consequences

Positive: the devops skills stop being narrative only; every rule is traceable to a public source; the engine stays predictable because triggers are file-scoped. Negative: twenty rules need forty corpus fixtures and a promotion review before any of them blocks; Tier B rules add advisory noise until they earn promotion; the engine gains an optional severity field that must not change existing pass semantics.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the four existing rules and document best practices as prose only
1. Ship all twenty rules as blocking from day one
1. Put the CI rules in a new rule-devops-ci skill instead of rule-devops
1. Verify observability and preview behavior with runtime probes only, with no static rules
