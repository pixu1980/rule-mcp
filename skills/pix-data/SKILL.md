---
name: pix-data
description: >
  Index of all data/database skills: SQL fundamentals, PostgreSQL, MySQL, and MongoDB.
  Delegates to the specific database skill based on project requirements.
tags:
  - "data"
  - "database"
  - "index"
  - "sql"
  - "nosql"
frameworks: [all]
---

# pix-data — Data & Database Skills Index

## Available Skills

| Skill | Database | Type | Best For |
|-------|----------|------|----------|
| [pix-data-sql](../pix-data-sql/SKILL.md) | SQL General | Relational | Query patterns, DDL, indexing theory, transactions |
| [pix-data-postgresql](../pix-data-postgresql/SKILL.md) | PostgreSQL 16+ | Relational (ACID) | Complex queries, JSONB, partitioning, replication |
| [pix-data-mysql](../pix-data-mysql/SKILL.md) | MySQL 8+ / MariaDB 11+ | Relational (InnoDB) | Web apps, LAMP stack, high read throughput |
| [pix-data-mongodb](../pix-data-mongodb/SKILL.md) | MongoDB 7+ | Document (NoSQL) | Flexible schemas, rapid prototyping, time-series |

## Quick Selection Guide

```
Need ACID + complex JOINs?            → pix-data-postgresql
Need high read throughput?             → pix-data-mysql
Need flexible schemas + rapid dev?     → pix-data-mongodb
Need SQL fundamentals + theory?        → pix-data-sql
```

## See also

- [pix-backend-node](../pix-backend-node/SKILL.md) — Backend runtime with DB integration
- [pix](../pix/SKILL.md) — Central skill index
