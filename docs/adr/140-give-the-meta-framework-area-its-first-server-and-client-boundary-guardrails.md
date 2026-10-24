# 140: Give the meta-framework area its first server and client boundary guardrails

- **Date**: 2026-10-17
- **Status**: proposed
- **Tags**: guardrails, meta, frontend, quality-gate
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Five meta-framework skills exist (rule-meta plus next, astro, nuxt and remix) and none owns a guardrail or declares inherits. The recurring failures in this area are at the server and client boundary: a public environment variable that carries a secret, a loader that serializes a secret field to the client, a render that reads the clock and breaks hydration, and a route that trusts unvalidated input.

## Decision

Create rule-meta/guardrails with seven rules. Tier A: meta-public-env-secret, meta-server-data-leak, hydration-safe, meta-route-validation. Tier B: meta-client-directive, astro-client-directive, meta-cache-explicit. Rules ship advisory and are promoted to blocking after the corpus gate reports full precision and recall. One question stays open: whether the four children add inherits: [rule-meta] so the shared rules reach them.

## Consequences

Positive: the server and client boundary becomes checkable and every rule cites Next.js, Astro, React Router or Vite documentation. Negative: the shared rules need the inherits graph; the Nuxt runtime config source is not stable; Tier B rules add advisory noise until they earn promotion.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Leave the meta area narrative and rely on the frontend rules only
1. Create guards in each meta-framework skill with no shared family
1. Make the advisory rules blocking from the start
