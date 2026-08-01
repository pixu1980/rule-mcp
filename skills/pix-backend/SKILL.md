---
name: pix-backend
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

# pix-backend — Backend Skill Index

This is the umbrella skill for backend development. It does not contain detailed guidance — that lives in the specialized skills below.

## Backend Frameworks

| Skill | Framework | Best for |
|-------|-----------|----------|
| [pix-backend-nestjs](../pix-backend-nestjs/SKILL.md) | NestJS 10+ | Enterprise, modular, GraphQL, microservices |
| [pix-backend-express](../pix-backend-express/SKILL.md) | Express.js 5+ | REST APIs, middleware, rapid development |
| [pix-backend-fastify](../pix-backend-fastify/SKILL.md) | Fastify 5+ | High throughput, schema validation, plugins |
| [pix-backend-hono](../pix-backend-hono/SKILL.md) | Hono 4+ | Edge, serverless, multi-runtime, ultrafast |
| [pix-backend-node](../pix-backend-node/SKILL.md) | Node.js runtime | Local-first storage, filesystem, IndexedDB |

## Database Skills

| Skill | Database | Type |
|-------|----------|------|
| [pix-data-postgresql](../pix-data-postgresql/SKILL.md) | PostgreSQL 16+ | Relational (SQL), ACID, JSONB |
| [pix-data-mysql](../pix-data-mysql/SKILL.md) | MySQL 8+ / MariaDB 11+ | Relational (SQL) |
| [pix-data-mongodb](../pix-data-mongodb/SKILL.md) | MongoDB 7+ | Document (NoSQL) |
| [pix-data-sql](../pix-data-sql/SKILL.md) | SQL General | Query patterns, design, optimization |

## API & Architecture

| Skill | Focus |
|-------|-------|
| [pix-backend-api-design](../pix-backend-api-design/SKILL.md) | REST API design, OpenAPI, client patterns |
| [pix-backend-graphql](../pix-backend-graphql/SKILL.md) | GraphQL schema, resolver, performance, and abuse controls |
| [pix-backend-security](../pix-backend-security/SKILL.md) | Security hardening, auth, validation |

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

- [pix](../pix/SKILL.md) — Central skill index and dispatcher
