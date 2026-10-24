---
name: rule-mcp-data
description: >-
  Use when working with databases to route to the correct database skill. Covers PostgreSQL, MySQL, MongoDB, SQLite, DuckDB, and IndexedDB.
tags:
  - "data"
  - "database"
  - "index"
  - "sql"
  - "nosql"
frameworks: [all]
guardrails: [connection-pool, migration-safety, parameterized-queries, transaction-safety]
---

# rule-mcp-data - Data & Database Skills Index

## Available Skills

| Skill                                                            | Database               | Type                  | Best For                                                                          |
| ---------------------------------------------------------------- | ---------------------- | --------------------- | --------------------------------------------------------------------------------- |
| [rule-mcp-data-sql](../rule-mcp-data-sql/SKILL.md)               | SQL General            | Relational            | Query patterns, DDL, indexing theory, transactions                                |
| [rule-mcp-data-postgresql](../rule-mcp-data-postgresql/SKILL.md) | PostgreSQL 16+         | Relational (ACID)     | Complex queries, JSONB, partitioning, replication                                 |
| [rule-mcp-data-mysql](../rule-mcp-data-mysql/SKILL.md)           | MySQL 8+ / MariaDB 11+ | Relational (InnoDB)   | Web apps, LAMP stack, high read throughput                                        |
| [rule-mcp-data-mongodb](../rule-mcp-data-mongodb/SKILL.md)       | MongoDB 7+             | Document (NoSQL)      | Flexible schemas, rapid prototyping, time-series                                  |
| [rule-mcp-data-sqlite](../rule-mcp-data-sqlite/SKILL.md)         | SQLite 3.45+           | Relational (embedded) | Single-file storage, desktop and edge apps, tests                                 |
| [rule-mcp-data-duckdb](../rule-mcp-data-duckdb/SKILL.md)         | DuckDB 1+              | Analytical (columnar) | Local OLAP, Parquet/CSV analysis, embedded analytics                              |
| [rule-mcp-data-indexed-db](../rule-mcp-data-indexed-db/SKILL.md) | IndexedDB              | Browser (key-value)   | Offline-first web apps, client-side persistence                                   |
| [rule-mcp-data-validation](../rule-mcp-data-validation/SKILL.md) | Business data          | Validation            | Email, phone, VAT, tax IDs, postal codes, IBAN, and the schemas that enforce them |

## Data architecture patterns, and the question each one answers

These are usually presented as a menu of twelve. They are answers to four
questions, and a real platform combines several rather than choosing one.

**Where does data land, and in what shape?**

| Pattern        | Shape                                           | Buy it for                                                                  |
| -------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| Data lake      | Raw files, schema applied on read               | Cheap, flexible storage. Add governance or it becomes a swamp nobody trusts |
| Data warehouse | Modeled tables, schema on write                 | Reporting and business intelligence, where the questions are known          |
| Lakehouse      | Lake storage with table semantics on top        | One copy for both analytics and machine learning, without a second system   |
| Medallion      | Raw, then cleaned, then serving, as named tiers | Making refinement a visible stage rather than a pile of scripts             |

**How fresh does it have to be?**

| Pattern      | Trade                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Batch        | Simplest, and correct as of the last run                                                                                            |
| Lambda       | A batch path and a streaming path in parallel, reconciled. Accurate and fresh, at the cost of two implementations of the same logic |
| Kappa        | One streaming path, with history replayed through it. One implementation, and it requires a log you can genuinely replay            |
| Event-driven | Systems react to facts rather than poll for them, which decouples producers from consumers and moves ordering into the design       |

**Who owns it?** Central ownership is fine until the central team is the
bottleneck for every question. **Data mesh** hands ownership to the domains that
produce the data and treats each output as a product with an interface and an
owner. **Data fabric** answers the neighboring problem, governance and discovery
across sources that will never be consolidated.

**How much history must be provable?** **Data vault** separates keys,
relationships and attributes so history is additive and auditable. It is verbose
for anything that does not need to prove what a record looked like on a Tuesday
in March, and worth every table for anything that does.

The decision, in one line each: modern analytics and machine learning is a
lakehouse with medallion tiers; batch accuracy plus freshness is lambda, or
kappa when the log can be replayed; pure reporting is a warehouse; heavy audit
is a vault; a central team that has become the bottleneck is a mesh; scattered
sources with governance pain is a fabric.

## Quick Selection Guide

```
Need ACID + complex JOINs?            → rule-mcp-data-postgresql
Need high read throughput?             → rule-mcp-data-mysql
Need flexible schemas + rapid dev?     → rule-mcp-data-mongodb
Need SQL fundamentals + theory?        → rule-mcp-data-sql
Need an embedded single-file DB?       → rule-mcp-data-sqlite
Need local analytics over files?       → rule-mcp-data-duckdb
Need persistence inside the browser?   → rule-mcp-data-indexed-db
```

## See also

- [rule-mcp-backend-node](../rule-mcp-backend-node/SKILL.md) - Backend runtime with DB integration
- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index
