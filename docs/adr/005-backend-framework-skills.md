# 005: Backend Framework Skills

- **Date**: 2026-07-10
- **Status**: accepted
- **Tags**: skills, backend, frameworks, new
- **Author**: rule-mcp-architect

## Context

The `rule-backend-*` category had only `api-design` and `security` as dedicated skills, plus the umbrella `rule-backend`. Development teams use a variety of Node.js backend frameworks, each with distinct patterns, tooling, and best practices. Without dedicated skills, agents had no framework-specific guidance.

## Decision

Add four backend framework skills covering the major Node.js HTTP framework ecosystems:

| Skill                  | Framework     | Focus                                                                                          |
| ---------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `rule-backend-nestjs`  | NestJS 10+    | Modular architecture, decorators, DI, guards, interceptors, GraphQL, microservices, TypeORM    |
| `rule-backend-express` | Express.js 5+ | Middleware patterns, error handling, routing, performance, security headers, graceful shutdown |
| `rule-backend-fastify` | Fastify 5+    | Plugin system, hooks lifecycle, JSON Schema validation, serialization, high throughput         |
| `rule-backend-hono`    | Hono 4+       | Edge-compatible, multi-runtime (Node/CF Workers/Bun/Deno), RPC type sharing, minimal footprint |

Each skill covers:

- Architecture and project structure
- Framework-specific patterns and conventions
- Performance optimization
- Testing strategies
- Cross-references to database and API design skills

## Consequences

**Positive:**

- Agents can now generate framework-specific backend code
- Clear separation: NestJS for enterprise, Express for REST APIs, Fastify for high throughput, Hono for edge/serverless
- Cross-references to database skills (PostgreSQL, MySQL, MongoDB) for backend-database integration

**Negative:**

- Four new skills to maintain as frameworks evolve
- Routing may sometimes hit the umbrella `rule-backend` instead of framework-specific skills

## Routing

Section headings include the framework name (e.g. "NestJS Architecture", "Express Middleware Pipeline") to improve keyword matching in the rule-mcp router.
