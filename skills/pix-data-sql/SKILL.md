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
inherits: [rule-data]
---

# rule-data-sql - SQL Best Practices & Scripts

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

### CREATE TABLE - Standard Template

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

### CREATE TABLE - Junction (Many-to-Many)

```sql
CREATE TABLE {table_a}_{table_b} (
    {a}_id          BIGINT NOT NULL REFERENCES {table_a}(id) ON DELETE CASCADE,
    {b}_id          BIGINT NOT NULL REFERENCES {table_b}(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY ({a}_id, {b}_id)
);

CREATE INDEX idx_{table_a}_{table_b}_{b}_id ON {table_a}_{table_b} ({b}_id);
```

### CREATE TABLE - Hierarchical (Adjacency List)

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

### ALTER TABLE - Common Operations

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

### DROP TABLE - Safe Patterns

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

### Schema authority and integrity

The **database is the authority** for data invariants. Application and ORM validation improves user feedback, but it must complement-not replace-database constraints. A rule enforced only in service code protects one code path; a `NOT NULL`, `CHECK`, `UNIQUE`, or `FOREIGN KEY` constraint protects APIs, workers, scripts, migrations, and every future client.

```sql
CREATE TABLE payments (
    id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount   DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    email    VARCHAR(255) NOT NULL,
    CONSTRAINT uq_payments_email UNIQUE (email)
);
```

When using an ORM, inspect the generated migration and database schema. A relation declared in the ORM is not evidence that the database contains a `REFERENCES` constraint.

### Normalization boundaries and EAV

Use 3NF as the default for OLTP schemas: each fact belongs in one place, with atomic columns and explicit relationships. Avoid comma-separated values, repeating columns (`phone_1`, `phone_2`), and generic **EAV** tables (`entity_id`, `attribute_name`, `attribute_value`) unless there is a documented, genuinely dynamic use case. Prefer a child or junction table; use typed `JSONB`/JSON for bounded flexible attributes when relational constraints are not required.

Do not over-normalize a single conceptual value into unnecessary tables. Normalize until facts are unambiguous and independently constrained, then stop; denormalize deliberately only for a measured read or reporting requirement.

Avoid overloaded tables that mix unrelated domains such as alerts, audit events, and system logs. Separate domains preserve meaningful types, constraints, and foreign keys.

Soft delete is a policy choice, not a universal rule. Use `deleted_at` when retention, auditability, or referencing rows require preservation; use hard deletion only when retention permits it and `ON DELETE` behavior is explicit.

### Schema documentation and tests

Treat the schema as living code:

- document non-obvious columns and allowed values with `COMMENT ON COLUMN` (or the database-specific column comment syntax);
- keep an ER diagram or relationship summary versioned with the migrations;
- maintain schema tests for valid, invalid, boundary, and duplicate data;
- exercise both upgrade and rollback paths in an isolated database.

### Naming Conventions

| Element            | Convention                | Example                                  |
| ------------------ | ------------------------- | ---------------------------------------- |
| Tables             | snake_case, plural        | `users`, `order_items`                   |
| Columns            | snake_case, singular      | `first_name`, `created_at`               |
| Primary keys       | `id` (BIGINT) or `uuid`   | `id BIGINT GENERATED ALWAYS AS IDENTITY` |
| Foreign keys       | `{referenced_table}_id`   | `user_id`, `order_id`                    |
| Indexes            | `idx_{table}_{columns}`   | `idx_users_email`                        |
| Reserved words     | Avoid as bare identifiers | Use `order_status`, not `order`          |
| Unique constraints | `uq_{table}_{columns}`    | `uq_users_email`                         |
| Check constraints  | `ck_{table}_{column}`     | `ck_users_status`                        |
| Triggers           | `trg_{table}_{action}`    | `trg_users_updated_at`                   |

### Column Types - Decision Matrix

| Data                | Type                                | Reason                                   |
| ------------------- | ----------------------------------- | ---------------------------------------- |
| Auto-increment ID   | `BIGINT IDENTITY`                   | 8 bytes, 9 quintillion rows              |
| UUID                | `UUID`                              | 16 bytes, distributed-safe               |
| Short string (<256) | `VARCHAR(n)`                        | Index-friendly, bounded                  |
| Long text           | `TEXT`                              | No arbitrary limit, same perf as VARCHAR |
| Boolean             | `BOOLEAN`                           | Native support in all modern DBs         |
| Date+time           | `TIMESTAMPTZ`                       | Always store UTC, convert on display     |
| Date only           | `DATE`                              | 4 bytes, timezone-safe                   |
| JSON                | `JSONB`                             | Indexable, supports operators            |
| Money               | `DECIMAL(12,2)` or `BIGINT` (cents) | Exact, no floating-point errors          |
| Enum-like           | `VARCHAR(32)` + CHECK               | Portable, no custom type needed          |

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
1NF: Atomic columns; use arrays/JSON only for an intentional flexible-attribute boundary
2NF: No partial dependencies (composite keys)
3NF: No transitive dependencies (non-key → non-key)

- OLTP: 3NF by default; avoid EAV and repeating groups
- OLAP: Star/snowflake schema; denormalize for measured read performance
- Audit: Keep normalized + add versioning
- Stop when each fact is unambiguous and independently constrained; avoid unnecessary joins
```

---

## 3. Indexing Strategy

### Why a random primary key hurts at volume

The table pattern above is not a style preference. A primary key decides the
physical order rows are stored in, and that order decides how much work every
future insert costs.

A primary key index is a B-tree. With a sequential key, every new row lands at
the end: the same page stays hot, it fills, a new one opens. With a random key,
every insert lands somewhere else in the tree, in a page that is probably not in
memory. The database reads it, splits it when it is full, and writes it back.

```text
Sequential:  [1..500][501..1000][1001..1500][1501..2000]
               full      full        full      filling      one hot page

Random:      [a1 f8 22 c9][90 b3 1e d4][f0 33 a7 6c]
              half full     half full     half full         every page cold
```

Millions of rows later the index is a patchwork of half-empty pages, so it is
larger than it should be, less of it fits in cache, and the maintenance window
that rebuilds it grows with it. **A random key is a loan against future write
performance, and the interest comes due when the table stops being small.**

Under a million rows none of this is visible, which is why it survives review
and load tests: nobody tests the version of the table that exists in three
years.

Keep the random identifier, stop sorting by it. The pattern is the one in the
DDL above: a sequential identity primary key, and the UUID as a separate column
with its own unique index, used where a client needs an opaque identifier.
Foreign keys carry eight bytes instead of sixteen everywhere in the schema, and
joins get lighter with them.

A time-ordered UUID is the middle ground: globally unique, and sorted by time
first, so inserts behave close to sequential. It embeds creation time, which is
information the identifier now leaks, so decide that deliberately.

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

| Type                 | Use case                 | Syntax                                                  |
| -------------------- | ------------------------ | ------------------------------------------------------- |
| **B-tree** (default) | Equality + range queries | `CREATE INDEX ...`                                      |
| **Composite**        | Multi-column queries     | `CREATE INDEX ON t (a, b)` - equality first, range last |
| **Covering**         | Index-only scans         | `CREATE INDEX ON t (a) INCLUDE (b, c)`                  |
| **Partial**          | Filtered queries         | `CREATE INDEX ON t (a) WHERE status = 'active'`         |
| **Unique**           | Uniqueness enforcement   | `CREATE UNIQUE INDEX ON t (a)`                          |
| **Descending**       | ORDER BY DESC            | `CREATE INDEX ON t (a DESC, b ASC)`                     |
| **Concurrent**       | Zero-downtime DDL        | `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...`           |

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

### Read and write paths, caching layers, and keeping them coherent

Reads and writes are not the same workload and rarely need the same machine.
Splitting them is the first scaling move that costs almost nothing: writes go to
the primary, reads go to replicas, and the application knows which is which.

The bill arrives as **replication lag**. A user who writes and immediately reads
can be served by a replica that has not caught up, and sees their own change
missing. The rule that fixes it is narrow rather than global: **read your own
writes from the primary**, for that user, for a short window after a write.
Everything else can tolerate a replica being a moment behind, and pretending
otherwise sends all the traffic back to one machine.

Caching is the same trade said differently: **speed against freshness**, and the
only question is how stale an answer is allowed to be.

| Layer                | Holds                                   | Stale for                                                            |
| -------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| Client and CDN       | Immutable assets, public responses      | As long as the URL is versioned                                      |
| Application memory   | Small, hot, per-process values          | Seconds, and inconsistent between instances                          |
| Shared cache         | Query results, computed views, sessions | Whatever the invalidation guarantees                                 |
| Database buffer pool | Pages, transparently                    | Not your problem, but it is why an index that fits in memory matters |

Coherence is where this goes wrong, and there are only a few honest strategies:

- **Expire on time.** Simplest and always correct within its window. Choose the
  window from what the data is for, not from a habit.
- **Invalidate on write.** Precise, and it fails when two things write the same
  derived value or when the invalidation happens before the transaction commits.
  Invalidate after commit, or the next read caches what was rolled back.
- **Write through.** The cache is updated with the database in one path, which
  removes the race and adds a dependency to the write.
- **Never cache it.** Correct for anything where a stale answer is a wrong
  answer: balances, permissions, anything the next decision is made on.

Two failure modes worth naming. **The stampede**: a popular key expires and
every request recomputes it at once, so the cache miss becomes the outage.
Serve the stale value while one caller refreshes it. And **the cache that hides
a missing index**: the query was always slow, the cache made it invisible, and
the first cold start after a deploy is when everyone finds out.

## 4. Query Optimization

### SELECT Best Practices

```sql
-- ❌ BAD: SELECT *
SELECT * FROM users WHERE id = 42;

-- ✅ GOOD: Explicit columns
SELECT id, name, email FROM users WHERE id = 42;

-- ❌ BAD: N+1 queries in loop
-- For each user, query their orders separately

-- ✅ GOOD: Batch with JOIN or IN
SELECT u.*, o.* FROM users u JOIN orders o ON o.user_id = u.id WHERE u.id IN (...);

-- ❌ BAD: OFFSET pagination (slow on large datasets)
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 100000;

-- ✅ GOOD: Keyset pagination (cursor-based)
SELECT * FROM orders WHERE id > 100000 ORDER BY id LIMIT 20;
```

### Queries that look harmless and scale terribly: wildcards, functions on indexed columns, COUNT, OR, sorting

`SELECT *`, N+1 and deep `OFFSET` are above. These are the other six, all of
which pass review and pass a test database.

```sql
-- 1. Leading wildcard: no index can help, every row gets scanned
--    Bad
SELECT id FROM products WHERE name LIKE '%phone%';
--    Full-text search, a trigram index, or an anchored prefix
SELECT id FROM products WHERE name LIKE 'phone%';                  -- index usable
SELECT id FROM products WHERE to_tsvector('english', name) @@ plainto_tsquery('phone');

-- 2. A function on an indexed column makes the predicate non-sargable
--    Bad: the index on email is ignored
SELECT id FROM users WHERE LOWER(email) = 'a@b.com';
--    Store it normalised, or index the expression
CREATE INDEX users_email_lower_idx ON users (LOWER(email));

-- 3. Counting everything on every request
--    Bad: a full count of a growing table, per page view
SELECT COUNT(*) FROM events WHERE org_id = $1;
--    Bound it, or accept an estimate for a "1000+" label
SELECT COUNT(*) FROM (SELECT 1 FROM events WHERE org_id = $1 LIMIT 1000) t;

-- 4. Joining several one-to-many relations before aggregating
--    Bad: orders x items x shipments multiplies rows, so every SUM is wrong AND slow
SELECT o.id, SUM(i.qty), SUM(s.weight)
FROM orders o JOIN items i ON i.order_id = o.id JOIN shipments s ON s.order_id = o.id
GROUP BY o.id;
--    Aggregate each side first
SELECT o.id, i.qty, s.weight
FROM orders o
LEFT JOIN (SELECT order_id, SUM(qty) qty FROM items GROUP BY order_id) i ON i.order_id = o.id
LEFT JOIN (SELECT order_id, SUM(weight) weight FROM shipments GROUP BY order_id) s ON s.order_id = o.id;

-- 5. Unrelated conditions joined by OR: the planner usually gives up on indexes
--    Bad
SELECT * FROM users WHERE email = $1 OR phone = $1 OR username = $1;
--    UNION ALL lets each branch use its own index
SELECT * FROM users WHERE email = $1
UNION ALL SELECT * FROM users WHERE phone = $1
UNION ALL SELECT * FROM users WHERE username = $1;

-- 6. Sorting or grouping an unbounded set before the limit applies
--    Bad: sorts every matching row, then throws away all but 20
SELECT * FROM events WHERE org_id = $1 ORDER BY created_at DESC LIMIT 20;
--    Give it an index that already provides the order
CREATE INDEX events_org_created_idx ON events (org_id, created_at DESC);
```

The query plan matters more than how the query reads. Before shipping one that
runs per request, look at `EXPLAIN ANALYZE` with production-sized data: a
sequential scan over 500 rows and over 5 million rows look identical in the SQL
and nothing alike in the plan.

Fast queries start from bounded questions. "Every row matching this" has no
upper limit; "the 20 most recent for this org" does.

### JOIN Patterns

```sql
-- INNER JOIN: only matching rows (most common)
SELECT u.name, o.total FROM users u JOIN orders o ON o.user_id = u.id;

-- LEFT JOIN: all users, even without orders
SELECT u.name, COALESCE(SUM(o.total), 0) FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id;

-- LATERAL JOIN: row-by-row subquery (PostgreSQL)
SELECT u.name, recent_orders.*
FROM users u
LEFT JOIN LATERAL (
  SELECT o.id, o.total FROM orders o WHERE o.user_id = u.id ORDER BY o.created_at DESC LIMIT 3
) recent_orders ON true;

-- Semi-join (EXISTS over IN)
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
-- Faster than: SELECT * FROM users WHERE id IN (SELECT user_id FROM orders);
```

### Aggregation Patterns

```sql
-- GROUP BY + HAVING (filter groups, not rows)
SELECT status, COUNT(*), SUM(total)
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status
HAVING COUNT(*) > 100;

-- Window functions (running totals, ranking)
SELECT
  id,
  created_at,
  total,
  SUM(total) OVER (PARTITION BY user_id ORDER BY created_at) AS running_total,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
FROM orders;

-- CTE for complex queries
WITH active_users AS (
  SELECT id, name FROM users WHERE deleted_at IS NULL AND last_login > NOW() - INTERVAL '90 days'
),
user_revenue AS (
  SELECT user_id, SUM(total) as revenue FROM orders WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY user_id
)
SELECT au.name, COALESCE(ur.revenue, 0) as revenue
FROM active_users au
LEFT JOIN user_revenue ur ON ur.user_id = au.id
ORDER BY revenue DESC;
```

### Anti-Patterns to Avoid

```sql
-- ❌ Using functions in WHERE (prevents index usage)
SELECT * FROM orders WHERE DATE(created_at) = '2024-01-15';
-- ✅ Use range query
SELECT * FROM orders WHERE created_at >= '2024-01-15' AND created_at < '2024-01-16';

-- ❌ Implicit type coercion
SELECT * FROM users WHERE phone = 1234567890;  -- phone is VARCHAR
-- ✅ Explicit cast
SELECT * FROM users WHERE phone = '1234567890';

-- ❌ SELECT DISTINCT to hide missing JOIN condition
SELECT DISTINCT u.* FROM users u JOIN orders o ON o.user_id = u.id;
-- ✅ Fix the JOIN or use EXISTS
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- ❌ Correlated subquery (executed once per row)
SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) FROM users u;
-- ✅ Window function or JOIN
SELECT u.*, COALESCE(o.order_count, 0) FROM users u
LEFT JOIN (SELECT user_id, COUNT(*) as order_count FROM orders GROUP BY user_id) o ON o.user_id = u.id;
```

---

## 5. Transaction Management

```sql
-- Standard transaction
BEGIN;
  INSERT INTO orders (user_id, total) VALUES (1, 100.00);
  UPDATE users SET order_count = order_count + 1 WHERE id = 1;
COMMIT;

-- Transaction with savepoint (partial rollback)
BEGIN;
  INSERT INTO orders (user_id, total) VALUES (1, 100.00);
  SAVEPOINT after_insert;
  UPDATE inventory SET stock = stock - 1 WHERE product_id = 42;
  -- If out of stock:
  ROLLBACK TO SAVEPOINT after_insert;
  -- Continue with different logic
COMMIT;

-- Transaction isolation levels
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;  -- Default (PG, SQL Server)
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;  -- Default (MySQL)
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;     -- Strongest, slowest

-- Retry logic pseudocode (for serialization failures)
-- BEGIN
--   TRY:
--     BEGIN TRANSACTION
--     ... work ...
--     COMMIT
--   CATCH serialization_error:
--     ROLLBACK
--     WAIT random(10-100ms)
--     RETRY (max 3 times)
```

### Isolation Level Comparison

| Level            | Dirty Read | Non-repeatable | Phantom | Use Case                 |
| ---------------- | ---------- | -------------- | ------- | ------------------------ |
| READ UNCOMMITTED | ✅         | ✅             | ✅      | Never use                |
| READ COMMITTED   | ❌         | ✅             | ✅      | General purpose          |
| REPEATABLE READ  | ❌         | ❌             | ✅      | Reporting                |
| SERIALIZABLE     | ❌         | ❌             | ❌      | Financial, critical data |

---

## 6. Migration Patterns

```sql
-- File naming: YYYYMMDD_HHMMSS_description.sql

-- ==== 20240115_120000_create_users.sql ====
-- UP
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_users_email ON users (email);

-- DOWN
DROP TABLE IF EXISTS users;

-- ==== 20240116_090000_add_phone_to_users.sql ====
-- UP
ALTER TABLE users ADD COLUMN phone VARCHAR(32);
CREATE INDEX idx_users_phone ON users (phone);

-- DOWN
ALTER TABLE users DROP COLUMN IF EXISTS phone;

-- ==== 20240117_140000_create_orders.sql ====
-- UP
CREATE TABLE orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);

-- DOWN
DROP TABLE IF EXISTS orders;
```

---

### Migration Verification and Rollback Tests

```sql
-- Apply the migration in an isolated database, then verify the constraints exist.
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'payments'
ORDER BY constraint_name;

-- Exercise invalid and duplicate inputs; each must fail at the database boundary.
-- INSERT INTO payments (user_id, amount, email) VALUES (999999, 10.00, 'a@example.com');
-- INSERT INTO payments (user_id, amount, email) VALUES (1, -1.00, 'b@example.com');
-- INSERT INTO payments (user_id, amount, email) VALUES (1, 10.00, 'a@example.com');

-- Run the documented DOWN migration and verify the previous schema is restored.
```

## 7. Performance Monitoring

```sql
-- Slow query log (PostgreSQL)
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Table size statistics
SELECT
  relname,
  n_live_tup AS row_estimate,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Current running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Lock monitoring
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.query AS blocked_query,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

---

## 8. Common Recipes

### Soft Delete + Restore

```sql
-- Soft delete
UPDATE {table} SET deleted_at = NOW() WHERE id = {id};

-- Restore
UPDATE {table} SET deleted_at = NULL WHERE id = {id};

-- Query without deleted
SELECT * FROM {table} WHERE deleted_at IS NULL;

-- Add active filter as partial index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{table}_active
  ON {table} (created_at DESC) WHERE deleted_at IS NULL;
```

### Upsert (INSERT ON CONFLICT)

```sql
INSERT INTO users (email, name)
VALUES ('user@example.com', 'John')
ON CONFLICT (email)
DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
```

### Batch Operations

```sql
-- Batch INSERT (max 1000 rows per statement)
INSERT INTO orders (user_id, total, status) VALUES
  (1, 100.00, 'pending'),
  (2, 250.00, 'completed'),
  (3, 75.50, 'pending');

-- Batch UPDATE with VALUES
UPDATE orders SET status = t.status
FROM (VALUES (1, 'shipped'), (2, 'delivered'), (3, 'cancelled')) AS t(id, status)
WHERE orders.id = t.id;

-- Batch DELETE with array
DELETE FROM orders WHERE id = ANY(ARRAY[1, 2, 3]);
```

### Pagination (Cursor-based)

```sql
-- Page 1: first 20 items
SELECT id, name, created_at
FROM users
WHERE deleted_at IS NULL
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Page 2: using cursor (last item from page 1: created_at = '2024-01-15', id = 42)
SELECT id, name, created_at
FROM users
WHERE deleted_at IS NULL
  AND (created_at, id) < ('2024-01-15', 42)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

## See also

- [rule-data-postgresql](../rule-data-postgresql/SKILL.md) - PostgreSQL-specific
- [rule-data-mysql](../rule-data-mysql/SKILL.md) - MySQL/MariaDB-specific
- [rule-data-mongodb](../rule-data-mongodb/SKILL.md) - MongoDB document DB
- [rule-backend-node](../rule-backend-node/SKILL.md) - Backend runtime patterns
- [rule](../rule/SKILL.md) - Central skill index
