# 137: Give the AI area its first source-cited guardrail family

- **Date**: 2026-10-17
- **Status**: proposed
- **Tags**: guardrails, ai, agents, quality-gate
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Five rule-ai skills exist and none owns a guardrail: rule-ai, rule-ai-agent-architecture, rule-ai-context-engineering, rule-ai-evals and rule-ai-prompting are narrative only, and none declares inherits. The code the area describes is real agent code, where the checkable claims are the tool schema, the model call timeout, the output cap, output validation, prompt secrecy and the generation span. OWASP Top 10 for LLM Applications, MCP Security Best Practices, NIST AI RMF and the OpenTelemetry GenAI conventions publish the supporting practice.

## Decision

Create rule-ai/guardrails with eight rules split into Tier A (ai-tool-schema, ai-call-timeout, ai-max-tokens, ai-output-validated, ai-no-secrets-in-prompt, ai-trace-span) and Tier B (ai-eval-presence, ai-mcp-token-validation). Rules ship advisory and are promoted to blocking after the corpus gate reports 100% precision and recall. The rest of the area stays narrative. One question stays open: whether the four children add inherits: [rule-ai] so the shared rules reach them.

## Consequences

Positive: the AI area gains its first deterministic checks and every rule cites OWASP, MCP or OpenTelemetry. Negative: the rules only reach the children if the inherits graph changes; ai-trace-span overlaps with obs-span-versioning and needs one owner; Tier B rules add advisory noise until they earn promotion.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Leave the AI area fully narrative with a human checklist and no deterministic rule
1. Put every candidate in the corpus, including weak signals such as eval presence
1. Create guards in every AI skill instead of one shared family in rule-ai
