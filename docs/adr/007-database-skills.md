# 007 — Database Skills

- **Date**: 2026-07-10
- **Status**: accepted
- **Tags**: skills, database, sql, nosql, new
- **Author**: rule-architect

## Context

Database expertise is required in most projects but was absent from the skill taxonomy. Different databases have fundamentally different patterns — PostgreSQL indexing strategies differ from MongoDB schema design differ from MySQL InnoDB tuning. A single "database" skill would be too shallow.

## Decision

Create four database skills spanning relational and document databases:

| Skill                 | Scope                  | Content                                                                                                                                 |
| --------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `rule-data-sql`        | General SQL            | Query writing, normalization, transactions, indexing theory, migrations, data types                                                     |
| `rule-data-postgresql` | PostgreSQL 16+         | Connection pooling (PgBouncer), schema design, indexing (B-tree, BRIN, partial), streaming replication, partitioning, RLS, ORM patterns |
| `rule-data-mysql`      | MySQL 8+ / MariaDB 11+ | InnoDB tuning, utf8mb4, replication (async/semi-sync/GTID), xtrabackup, performance schema                                              |
| `rule-data-mongodb`    | MongoDB 7+             | Schema design (embed vs reference), aggregation pipeline, indexing (compound, TTL, text), sharding, WiredTiger, Mongoose patterns       |

## Consequences

**Positive:**

- Comprehensive database coverage: SQL theory + 3 major implementations
- Each skill is focused enough to provide deep, actionable guidance
- Cross-references between SQL → PostgreSQL/MySQL and MongoDB → SQL for hybrid architectures
- Framework-agnostic — usable by any backend framework skill

**Negative:**

- Four skills to maintain as database versions evolve
- Some content (indexing theory) is duplicated across SQL and specific DB skills — intentional for self-containment
