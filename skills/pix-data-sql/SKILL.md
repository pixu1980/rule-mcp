---
name: rule-data-sql
description: >-
  Use when writing SQL queries or designing relational database schemas. Covers table design, indexing, DDL scripts, transactions, and database-agnostic best practices.
tags:
  - "sql"
  - "relational"
  - "data"
  - "ddl"
  - "dml"
  - "indexing"
  - "optimization"
  - "query"
  - "schema"
  - "migration"
frameworks: [all]
---

# rule-data-sql — SQL Best Practices & Scripts

## Table of Contents

1. [DDL Scripts: CREATE / ALTER / DROP](#1-ddl-scripts-create--alter--drop)
2. [Table Design Patterns](#2-table-design-patterns)
3. [Indexing Strategy](#3-indexing-strategy)
4. [Query Optimization](#4-query-optimization)
5. [Transaction Management](#5-transaction-management)
6. [Migration Patterns](#6-migration-patterns)
7. [Performance Monitoring](#7-performance-monitoring)
8. [Common Recipes](#8-common-recipes)

---

## 1. DDL Scripts: CREATE / ALTER / DROP

### CREATE TABLE — Standard Template

```sql
CREATE TABLE {schema}.{table} (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid            UUID NOT NULL DEFAULT gen_random_uuid(),
    status          VARCHAR(32) NOT NULL DEFAULT 'active',
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    description     TEXT,
    metadata        JSONB DEFAULT '{}',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,  -- soft delete

    -- Constraints
    CONSTRAINT uq_{table}_slug UNIQUE (slug),
    CONSTRAINT uq_{table}_uuid UNIQUE (uuid),
    CONSTRAINT ck_{table}_status CHECK (status IN ('active', 'inactive', 'archived'))
);

-- Indexes
CREATE INDEX idx_{table}_status ON {table} (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_{table}_created_at ON {table} (created_at DESC);
```

### CREATE TABLE — Junction (Many-to-Many)

```sql
CREATE TABLE {table_a}_{table_b} (
    {a}_id          BIGINT NOT NULL REFERENCES {table_a}(id) ON DELETE CASCADE,
    {b}_id          BIGINT NOT NULL REFERENCES {table_b}(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY ({a}_id, {b}_id)
);

CREATE INDEX idx_{table_a}_{table_b}_{b}_id ON {table_a}_{table_b} ({b}_id);
```

### CREATE TABLE — Hierarchical (Adjacency List)

```sql
CREATE TABLE categories (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id       BIGINT REFERENCES categories(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    path            LTREE,          -- PostgreSQL only: materialized path
    depth           INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent_id ON categories (parent_id);
```

### ALTER TABLE — Common Operations

```sql
-- Add column
ALTER TABLE {table} ADD COLUMN {column} {type} {constraints};
ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {type};

-- Drop column
ALTER TABLE {table} DROP COLUMN IF EXISTS {column};

-- Rename column
ALTER TABLE {table} RENAME COLUMN {old_name} TO {new_name};

-- Alter column type
ALTER TABLE {table} ALTER COLUMN {column} TYPE {new_type} USING {column}::{new_type};

-- Add default
ALTER TABLE {table} ALTER COLUMN {column} SET DEFAULT {value};

-- Drop default
ALTER TABLE {table} ALTER COLUMN {column} DROP DEFAULT;

-- Set NOT NULL
ALTER TABLE {table} ALTER COLUMN {column} SET NOT NULL;

-- Drop NOT NULL
ALTER TABLE {table} ALTER COLUMN {column} DROP NOT NULL;

-- Add constraint
ALTER TABLE {table} ADD CONSTRAINT {name} {type} ({columns});

-- Drop constraint
ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {name};

-- Rename table
ALTER TABLE {old_name} RENAME TO {new_name};

-- Add/drop index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{table}_{col} ON {table} ({col});
DROP INDEX IF EXISTS idx_{table}_{col};
```

### DROP TABLE — Safe Patterns

```sql
-- Check existence before dropping
DROP TABLE IF EXISTS {table} CASCADE;

-- Soft delete (never hard-delete production data)
UPDATE {table} SET deleted_at = NOW() WHERE id = {id};

-- Archive before drop
CREATE TABLE {table}_archived AS SELECT * FROM {table};
DROP TABLE IF EXISTS {table} CASCADE;
```

---

## 2. Table Design Patterns

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Tables | snake_case, plural | `users`, `order_items` |
| Columns | snake_case, singular | `first_name`, `created_at` |
| Primary keys | `id` (BIGINT) or `uuid` | `id BIGINT GENERATED ALWAYS AS IDENTITY` |
| Foreign keys | `{referenced_table}_id` | `user_id`, `order_id` |
| Indexes | `idx_{table}_{columns}` | `idx_users_email` |
| Unique constraints | `uq_{table}_{columns}` | `uq_users_email` |
| Check constraints | `ck_{table}_{column}` | `ck_users_status` |
| Triggers | `trg_{table}_{action}` | `trg_users_updated_at` |

### Column Types — Decision Matrix

| Data | Type | Reason |
|------|------|--------|
| Auto-increment ID | `BIGINT IDENTITY` | 8 bytes, 9 quintillion rows |
| UUID | `UUID` | 16 bytes, distributed-safe |
| Short string (<256) | `VARCHAR(n)` | Index-friendly, bounded |
| Long text | `TEXT` | No arbitrary limit, same perf as VARCHAR |
| Boolean | `BOOLEAN` | Native support in all modern DBs |
| Date+time | `TIMESTAMPTZ` | Always store UTC, convert on display |
| Date only | `DATE` | 4 bytes, timezone-safe |
| JSON | `JSONB` | Indexable, supports operators |
| Money | `DECIMAL(12,2)` or `BIGINT` (cents) | Exact, no floating-point errors |
| Enum-like | `VARCHAR(32)` + CHECK | Portable, no custom type needed |

### Common Table Patterns

```sql
-- Pattern 1: Soft-deletable entity
CREATE TABLE {table} (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- business columns
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ          -- NULL = active, NOT NULL = deleted
);
CREATE INDEX idx_{table}_active ON {table} (created_at DESC) WHERE deleted_at IS NULL;

-- Pattern 2: Versioned entity (audit trail)
CREATE TABLE {table}_versions (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_id       BIGINT NOT NULL,
    version         INTEGER NOT NULL,
    data            JSONB NOT NULL,       -- full snapshot
    changed_by      VARCHAR(255),
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_{table}_versions_entity ON {table}_versions (entity_id, version DESC);

-- Pattern 3: Key-value store (settings, config)
CREATE TABLE {table}_kv (
    key             VARCHAR(255) PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pattern 4: Tree with closure table
CREATE TABLE {table}_closure (
    ancestor_id     BIGINT NOT NULL,
    descendant_id   BIGINT NOT NULL,
    depth           INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (ancestor_id, descendant_id)
);
```

### Normalization Guidelines

```
1NF: Atomic columns, no arrays/json unless required
2NF: No partial dependencies (composite keys)
3NF: No transitive dependencies (non-key → non-key)

Normalize until it hurts → denormalize until it works.
- OLTP: 3NF by default, limit joins
- OLAP: Star/snowflake schema, denormalize for read performance
- Audit: Keep normalized + add versioning
```

---

## 3. Indexing Strategy

### When to Index

```sql
-- ✅ DO index:
-- Columns in WHERE, JOIN, ORDER BY, GROUP BY
-- Foreign key columns
-- Columns with high selectivity (>80% unique)
-- Partial indexes for filtered queries

-- ❌ DON'T index:
-- Columns rarely used in queries
-- Columns with low selectivity (<10% unique, e.g. boolean)
-- Tables smaller than 1000 rows (sequential scan is faster)
-- Over-index: each index slows INSERT/UPDATE/DELETE by ~10%
```

### Index Types

| Type | Use case | Syntax |
|------|----------|--------|
| **B-tree** (default) | Equality + range queries | `CREATE INDEX ...` |
| **Composite** | Multi-column queries | `CREATE INDEX ON t (a, b)` — equality first, range last |
| **Covering** | Index-only scans | `CREATE INDEX ON t (a) INCLUDE (b, c)` |
| **Partial** | Filtered queries | `CREATE INDEX ON t (a) WHERE status = 'active'` |
| **Unique** | Uniqueness enforcement | `CREATE UNIQUE INDEX ON t (a)` |
| **Descending** | ORDER BY DESC | `CREATE INDEX ON t (a DESC, b ASC)` |
| **Concurrent** | Zero-downtime DDL | `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...` |

### Index Design Recipes

```sql
-- Recipe 1: Covering index for common listing query
-- Query: SELECT id, name, status FROM orders WHERE status = 'active' ORDER BY created_at DESC LIMIT 50;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_active_list
  ON orders (status, created_at DESC) INCLUDE (name)
  WHERE status = 'active';

-- Recipe 2: Composite index for equality + range
-- Query: SELECT * FROM users WHERE org_id = ? AND created_at > ?;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_created
  ON users (org_id, created_at DESC);

-- Recipe 3: Partial unique index (conditional uniqueness)
-- Only one active default address per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_default_address
  ON addresses (user_id) WHERE is_default = true;

-- Recipe 4: Expression index for case-insensitive lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower
  ON users (LOWER(email));

-- Recipe 5: Index for JSONB queries (PostgreSQL)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_metadata_currency
  ON orders ((metadata->>'currency')) WHERE metadata ? 'currency';
```

### Index Maintenance

```sql
-- Identify unused indexes (PostgreSQL)
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%pk_%'
ORDER BY tablename;

-- Rebuild fragmented index (PostgreSQL)
REINDEX INDEX CONCURRENTLY idx_{name};

-- Analyze table statistics
ANALYZE {table};

-- Check query plan
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

---

## Reference

Load references/REFERENCE.md for detailed SQL reference (DDL, indexing, transactions).
