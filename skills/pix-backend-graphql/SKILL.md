---
name: rule-backend-graphql
description: >-
  Use when designing, implementing, securing, or operating GraphQL APIs. Covers schema-first contracts, resolver boundaries, N+1 prevention, query abuse controls, caching, and error contracts.
tags:
  - backend
  - api
  - graphql
  - security
  - performance
frameworks: [node, api, graphql]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
inherits: [rule-backend]
---

# GraphQL API Engineering

Use this skill with the applicable runtime skill and
[rule-backend-security](../rule-backend-security/SKILL.md). GraphQL is
an API contract, not a substitute for authorization, validation, or query
planning.

## 1. Design the schema before resolvers

- Define SDL and input/output types before implementation.
- Model capabilities and user tasks; do not mirror persistence schemas.
- Keep the public schema modular by domain and make nullability intentional.
- Use input objects for mutations and return typed payloads that can carry
  domain errors without leaking internals.
- Version through additive evolution. Deprecate fields with a replacement and
  removal date; do not silently change field semantics.

```graphql
type Mutation {
  createOrder(input: CreateOrderInput!): CreateOrderPayload!
}

type CreateOrderPayload {
  order: Order
  errors: [UserError!]!
}

type UserError {
  code: String!
  messageKey: String!
  field: String
}
```

## 2. Keep resolvers thin and authorize at the boundary

Resolvers translate the GraphQL contract to application services. They must
not contain business logic or directly expose ORM entities.

- Authenticate each request and pass the trusted principal in request context.
- Authorize every query and mutation at the resolver/service boundary; never
  rely on a hidden field in the client query.
- Validate every input object before calling a service.
- Return stable `extensions.code` values for expected errors. Log unexpected
  failures with a correlation ID; never expose stack traces or secrets.

## 3. Prevent N+1 queries and unbounded work

- Create request-scoped DataLoaders for repeated entity lookups.
- Batch and cache only within one request unless a deliberate shared-cache
  policy is defined.
- Profile generated SQL and set pagination limits on every connection.
- Enforce query depth, complexity/cost, request size, and execution timeout at
  the gateway or server. Apply rate limits by client identity and route risk.
- Disable or restrict introspection in production according to the product's
  operational needs; never treat it as an authorization mechanism.

## 4. Cache intentionally

- Cache public, read-heavy fields only when invalidation and visibility rules
  are explicit.
- Keep user-specific and permission-dependent responses out of shared caches
  unless the cache key includes the authorization context.
- Consider persisted queries for trusted clients to reduce payload size and
  query parsing cost. Persisted queries complement, but do not replace,
  complexity and rate-limit controls.

## 5. Verify the contract and operational behavior

- Test schema validation, authorization, validation failures, and error codes.
- Test resolver batching with representative list queries to detect N+1
  regressions.
- Exercise rejected depth/complexity/size limits and verify they return a safe
  client error.
- Publish schema changes, deprecations, and examples with the same change.
- Instrument operation name, latency, error class, complexity, and downstream
  dependency failures. Do not log query variables that may contain PII.

## Checklist

- [ ] Schema is task-oriented, modular, and reviewed before implementation.
- [ ] Inputs, outputs, nullability, and error codes form an explicit contract.
- [ ] Every resolver authenticates through trusted context and authorizes data.
- [ ] DataLoader/request batching prevents N+1 access patterns.
- [ ] Pagination, depth, complexity, size, timeout, and rate limits are set.
- [ ] Caching preserves tenant and authorization isolation.
- [ ] Contract, security, and performance tests cover critical operations.
- [ ] Metrics and logs identify failing operations without recording secrets.

## See also

- [rule-backend](../rule-backend/SKILL.md) - Backend skill index
- [rule-backend-security](../rule-backend-security/SKILL.md) - Input, auth, secret, and transport hardening
- [rule-devops-observability](../rule-devops-observability/SKILL.md) - Production telemetry and alerting
- [rule-devops-testing](../rule-devops-testing/SKILL.md) - Test strategy and coverage gates
