---
name: rule-backend
description: >-
  Use when designing or building backend services to route to the correct backend framework, API, or database skill. Covers REST, GraphQL, Express, Fastify, NestJS, Hono, and database integrations.
tags:
  - "backend"
  - "api"
  - "server"
  - "umbrella"
  - "index"
frameworks: [all]
---

# rule-backend — Backend Skill Index

This is the umbrella skill for backend development. It does not contain detailed guidance — that lives in the specialized skills below.

## Backend Frameworks

| Skill                                                  | Framework       | Best for                                    |
| ------------------------------------------------------ | --------------- | ------------------------------------------- |
| [rule-backend-nestjs](../rule-backend-nestjs/SKILL.md)   | NestJS 10+      | Enterprise, modular, GraphQL, microservices |
| [rule-backend-express](../rule-backend-express/SKILL.md) | Express.js 5+   | REST APIs, middleware, rapid development    |
| [rule-backend-fastify](../rule-backend-fastify/SKILL.md) | Fastify 5+      | High throughput, schema validation, plugins |
| [rule-backend-hono](../rule-backend-hono/SKILL.md)       | Hono 4+         | Edge, serverless, multi-runtime, ultrafast  |
| [rule-backend-node](../rule-backend-node/SKILL.md)       | Node.js runtime | Local-first storage, filesystem, IndexedDB  |

## Database Skills

| Skill                                                  | Database               | Type                                 |
| ------------------------------------------------------ | ---------------------- | ------------------------------------ |
| [rule-data-postgresql](../rule-data-postgresql/SKILL.md) | PostgreSQL 16+         | Relational (SQL), ACID, JSONB        |
| [rule-data-mysql](../rule-data-mysql/SKILL.md)           | MySQL 8+ / MariaDB 11+ | Relational (SQL)                     |
| [rule-data-mongodb](../rule-data-mongodb/SKILL.md)       | MongoDB 7+             | Document (NoSQL)                     |
| [rule-data-sql](../rule-data-sql/SKILL.md)               | SQL General            | Query patterns, design, optimization |

## API & Architecture

| Skill                                                        | Focus                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| [rule-backend-api-design](../rule-backend-api-design/SKILL.md) | REST API design, OpenAPI, client patterns                 |
| [rule-backend-graphql](../rule-backend-graphql/SKILL.md)       | GraphQL schema, resolver, performance, and abuse controls |
| [rule-backend-security](../rule-backend-security/SKILL.md)     | Security hardening, auth, validation                      |

## Quick Reference

```
Framework:   Express / Fastify / Hono / NestJS
Database:    PostgreSQL / MySQL / SQLite / MongoDB / DuckDB
Local:       IndexedDB / Filesystem / SQLite
API:         REST / OpenAPI-first / GraphQL
Layers:      routes → handlers → services → repositories
Validation:  Zod / JSON Schema at the boundary
Deploy:      Node.js / Docker / Serverless / Electron
```

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
