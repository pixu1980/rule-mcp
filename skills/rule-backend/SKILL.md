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
guardrails: [cors-explicit, error-exposure, helmet-headers, input-validation, rate-limiting, sql-injection]
---

# rule-backend - Backend Skill Index

This is the umbrella skill for backend development. It does not contain detailed guidance - that lives in the specialized skills below.

## Backend Frameworks

| Skill                                                    | Framework       | Best for                                    |
| -------------------------------------------------------- | --------------- | ------------------------------------------- |
| [rule-backend-nestjs](../rule-backend-nestjs/SKILL.md)   | NestJS 10+      | Enterprise, modular, GraphQL, microservices |
| [rule-backend-express](../rule-backend-express/SKILL.md) | Express.js 5+   | REST APIs, middleware, rapid development    |
| [rule-backend-fastify](../rule-backend-fastify/SKILL.md) | Fastify 5+      | High throughput, schema validation, plugins |
| [rule-backend-hono](../rule-backend-hono/SKILL.md)       | Hono 4+         | Edge, serverless, multi-runtime, ultrafast  |
| [rule-backend-node](../rule-backend-node/SKILL.md)       | Node.js runtime | Local-first storage, filesystem, IndexedDB  |

## Database Skills

| Skill                                                    | Database               | Type                                 |
| -------------------------------------------------------- | ---------------------- | ------------------------------------ |
| [rule-data-postgresql](../rule-data-postgresql/SKILL.md) | PostgreSQL 16+         | Relational (SQL), ACID, JSONB        |
| [rule-data-mysql](../rule-data-mysql/SKILL.md)           | MySQL 8+ / MariaDB 11+ | Relational (SQL)                     |
| [rule-data-mongodb](../rule-data-mongodb/SKILL.md)       | MongoDB 7+             | Document (NoSQL)                     |
| [rule-data-sql](../rule-data-sql/SKILL.md)               | SQL General            | Query patterns, design, optimization |

## API & Architecture

| Skill                                                      | Focus                                                             |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| [rule-backend-graphql](../rule-backend-graphql/SKILL.md)   | GraphQL schema, resolver, performance, and abuse controls         |
| [rule-backend-security](../rule-backend-security/SKILL.md) | Security hardening, auth, validation                              |
| [rule-backend-workers](../rule-backend-workers/SKILL.md)   | Event loop, libuv thread pool, `worker_threads`, piscina, cluster |

## Six ideas that replace memorizing architectures

Most architecture questions are the same six questions wearing different
clothes. Knowing the six is worth more than knowing twenty diagrams, because the
diagram is derived and the questions are not.

**1. Where does the state live?** A process that holds nothing between requests
can be duplicated, replaced and killed freely, which is what horizontal scaling
actually requires. State that must exist goes somewhere designed to be shared: a
database, a cache, a signed token. Session state in process memory is the common
version of this mistake, and it survives until the second instance.

**2. What is cached, and how stale may it be?** Caching is not a speed feature,
it is a trade of freshness for speed, and every cache needs an answer to how
wrong it is allowed to be. Where the answer is "not at all", the honest move is
not to cache.

**3. Where does consistency actually matter?** Not everywhere, and pretending
otherwise makes systems both slow and complicated. A balance and a permission
must be right now. A follower count, a search index and a dashboard can be a few
seconds behind and nobody is harmed. Under a network partition the choice is
between refusing to answer and answering with something possibly stale, and that
choice is per operation, not per system.

**4. What can be asynchronous?** Anything the caller does not need before it gets
a response. Moving it behind a queue turns a slow synchronous chain into a fast
acknowledgment plus work that can be retried, rate limited and scaled on its own.
The cost is that failure becomes invisible unless somebody designed for it, so
the queue arrives with retries, a dead-letter path and a way to see both.

**5. What guarantees does the data actually need?** Transactions, constraints and
joins are worth a great deal when several things must be true together, and they
are what a relational database is for. A document or key-value store is the right
answer when the access pattern is known, the shape varies, and the scale is in
one dimension. **The question is the access pattern, not which is modern.**

**6. What is the contract, and who is holding it?** An interface is a promise to
people you will not meet. Adding a field is safe; removing one, renaming one, or
changing what a status code means is a breaking change whatever the version
number says. Design for the consumer who cannot be redeployed with you.

Two more that show up once a system is real:

- **Backpressure.** Every component needs a way to say "not so fast" that is not
  falling over. A bounded queue that refuses is kinder than an unbounded one that
  runs out of memory.
- **Failure domains.** Ask what one failure takes with it. If a single dependency
  being slow makes every request slow, there is no isolation, and adding capacity
  will not create any.

Applied to any system, in order: where is the state, what is cached, where does
consistency matter, what can be asynchronous, what guarantees does the data
need, what is the contract. Six answers describe the architecture, and every
pattern with a name is one particular set of them.

## Structuring a backend: the layouts, and when each stops paying

There is no correct structure, only the one that matches the size of the team
and the lifetime of the code. Each layout below is right until a specific
symptom appears, and the symptom is the signal to move, not a blog post.

| Layout                                                                             | Fits                                                                                        | Stops paying when                                                                                                                      |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Routes, models and handlers, nothing else                                          | One or two people, a service that fits in a head                                            | Handlers grow business logic and two of them start disagreeing about it                                                                |
| A service layer under the handlers                                                 | A small team, moderate ambition                                                             | The service folder becomes a second dumping ground and nothing says which service owns what                                            |
| Feature folders, one per domain, each with its own routes, service and data access | Several people who want to work without colliding                                           | A feature needs another feature's internals, and the import that crosses the boundary is the warning                                   |
| Ports and adapters, with the framework at the edge                                 | Long-lived code that outlives its framework, or several delivery mechanisms over one domain | Never for the domain that earns it, and immediately for the one that does not: the indirection costs a reader on every trace           |
| Separate services with separate deployments                                        | Many teams that need to ship and scale independently                                        | Before the organization is actually several teams. Then it is a distributed monolith, with the coupling kept and the transactions lost |

Two rules that outlast the table:

- **Move when the symptom appears, not before.** Each step adds a layer someone
  reads on every future change. Buying it early is buying a cost with no benefit
  yet.
- **The boundary that matters is the one you cannot cross by accident.** A
  feature folder whose neighbors reach into it is a folder, not a boundary. Make
  the crossing visible, whether through an index that defines the surface or a
  lint rule that refuses the deep import.

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

- [rule-mcp](../rule/SKILL.md) - Central skill index and dispatcher
