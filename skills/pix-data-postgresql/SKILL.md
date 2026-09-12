---
name: rule-data-postgresql
description: >-
  Use when working with PostgreSQL 16+. Covers DDL scripts, indexing, performance tuning, replication, partitioning, connection pooling, JSONB, and full-text search.
tags:
  - "postgresql"
  - "postgres"
  - "data"
  - "sql"
  - "relational"
  - "acid"
  - "jsonb"
  - "plpgsql"
  - "performance"
  - "partitioning"
  - "replication"
frameworks: [all]
inherits: [rule-data]
---

# rule-data-postgresql - PostgreSQL 16+ Best Practices & Scripts

## Table of Contents

1. [DDL Scripts](#1-ddl-scripts)
2. [Indexing Strategy (PostgreSQL-Specific)](#2-indexing-strategy-postgresql-specific)
3. [Partitioning](#3-partitioning)
4. [JSONB Patterns](#4-jsonb-patterns)
5. [Full-Text Search](#5-full-text-search)
6. [Connection Management](#6-connection-management)
7. [Performance Tuning](#7-performance-tuning)
8. [Replication & HA](#8-replication--ha)
9. [Maintenance Scripts](#9-maintenance-scripts)
10. [PL/pgSQL Functions](#10-plpgsql-functions)
11. [Migration Scripts](#11-migration-scripts)
12. [Security & RLS](#12-security--rls)

---

## 1. DDL Scripts

### CREATE TABLE with All PostgreSQL Features

```sql
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.organizations (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid            UUID NOT NULL DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    settings        JSONB NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    plan            VARCHAR(32) NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free', 'pro', 'enterprise')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    trial_ends_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT uq_org_slug UNIQUE (slug),
    CONSTRAINT uq_org_uuid UNIQUE (uuid)
);

-- Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_active ON app.organizations (created_at DESC)
    WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_plan ON app.organizations (plan)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_org_slug_active ON app.organizations (slug)
    WHERE deleted_at IS NULL;

-- PostgreSQL does not automatically index the referencing side of a foreign key.
-- Add the child-side index when joins, parent deletes, or updates need it.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_id
    ON app.orders (org_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON app.organizations
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
```

### ALTER TABLE - PostgreSQL Best Practices

```sql
-- Add column with IF NOT EXISTS (use DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app' AND table_name = 'organizations' AND column_name = 'billing_email'
    ) THEN
        ALTER TABLE app.organizations ADD COLUMN billing_email VARCHAR(255);
    END IF;
END $$;

-- Set NOT NULL on existing column with data
ALTER TABLE app.organizations ALTER COLUMN billing_email SET NOT NULL;
-- Fail-safe version:
ALTER TABLE app.organizations ALTER COLUMN billing_email SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
    -- Fix nulls first
    UPDATE app.organizations SET billing_email = '' WHERE billing_email IS NULL;
    ALTER TABLE app.organizations ALTER COLUMN billing_email SET NOT NULL;
END;

-- Change column type with validation
ALTER TABLE app.organizations
  ALTER COLUMN settings TYPE JSONB USING settings::JSONB;

-- Add foreign key (safe, no full table lock with NOT VALID)
ALTER TABLE app.orders
  ADD CONSTRAINT fk_orders_org
  FOREIGN KEY (org_id) REFERENCES app.organizations(id)
  NOT VALID;
-- Validate later (short lock)
ALTER TABLE app.orders VALIDATE CONSTRAINT fk_orders_org;
```

### DROP Operations

```sql
-- Safe DROP TABLE
DROP TABLE IF EXISTS app.temp_import CASCADE;

-- Safe DROP COLUMN (check existence)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'app' AND table_name = 'users' AND column_name = 'legacy_field'
    ) THEN
        ALTER TABLE app.users DROP COLUMN legacy_field;
    END IF;
END $$;

-- Safe DROP INDEX
DROP INDEX CONCURRENTLY IF EXISTS idx_old_unused;

-- Archive before drop
CREATE TABLE app.orders_2023_archived AS SELECT * FROM app.orders WHERE created_at < '2024-01-01';
DELETE FROM app.orders WHERE created_at < '2024-01-01';
-- After confirming archive is correct:
-- DROP TABLE app.orders_2023_archived; -- keep for 90 days then drop
```

---

## 2. Indexing Strategy (PostgreSQL-Specific)

### Foreign-key indexing rule

PostgreSQL indexes the referenced key when needed for the constraint, but it does **not** automatically index the referencing side of a foreign key. Index child columns used in joins, parent deletes, or common filters. Do not create every possible index: confirm the access pattern with `EXPLAIN (ANALYZE, BUFFERS)` and account for write amplification.

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_id
    ON app.payments (user_id);
```

### Timestamp and identifier choices

Use `timestamptz` for an absolute instant; PostgreSQL stores the instant consistently and renders it in the session time zone. Use `timestamp without time zone` only for a deliberately zone-less civil time such as a recurring local schedule.

For PostgreSQL 16+, `BIGINT GENERATED ALWAYS AS IDENTITY` is a compact sequential default, while UUIDs are useful when identifiers are generated across clients or services. **PostgreSQL 18** adds built-in `uuidv7()`, a time-ordered UUID with better index locality than random UUIDv4, but it exposes creation-time information and is not portable to the PostgreSQL 16+ baseline. Gate it behind a documented server-version requirement.

### Index Types Comparison

| Type                 | Use Case                      | Creation                        |
| -------------------- | ----------------------------- | ------------------------------- |
| **B-tree** (default) | Equality, range, ORDER BY     | `CREATE INDEX ...`              |
| **GiST**             | Full-text, geometry, ranges   | `CREATE INDEX ... USING GIST`   |
| **GIN**              | JSONB, arrays, full-text      | `CREATE INDEX ... USING GIN`    |
| **BRIN**             | Append-only, time-series      | `CREATE INDEX ... USING BRIN`   |
| **Hash**             | Equality only (rarely useful) | `CREATE INDEX ... USING HASH`   |
| **SP-GiST**          | Spatial, network addresses    | `CREATE INDEX ... USING SPGIST` |

### Practical Index Patterns

```sql
-- B-tree: standard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_date
  ON orders (user_id, created_at DESC);

-- GIN: JSONB query acceleration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_metadata
  ON orders USING GIN (metadata jsonb_path_ops);

-- GIN: Full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_search
  ON articles USING GIN (to_tsvector('english', title || ' ' || body));

-- BRIN: Time-series (append-only logs)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created
  ON audit_log USING BRIN (created_at)
  WITH (pages_per_range = 32);

-- Partial + Covering: query-specific
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_pending_list
  ON orders (created_at DESC) INCLUDE (id, total, status)
  WHERE status = 'pending';
```

### Index Maintenance

```sql
-- Find bloated indexes (>30% bloat)
SELECT
    schemaname || '.' || tablename || '.' || indexname AS index_name,
    round(100 * (1 - avg_leaf_density), 2) AS bloat_pct
FROM pg_stat_user_indexes
JOIN (SELECT relid, indexrelid,
    avg_leaf_density = avg(avg_leaf_density) FROM pg_stat_user_indexes) stats USING (indexrelid)
WHERE avg_leaf_density < 0.7
ORDER BY bloat_pct DESC;

-- Reindex concurrently (no lock)
REINDEX INDEX CONCURRENTLY idx_bloated_index;

-- Reindex all indexes on a table
REINDEX TABLE CONCURRENTLY app.organizations;

-- Update statistics
ANALYZE app.organizations;
ANALYZE; -- all tables
```

---

## 3. Partitioning

### Declarative Partitioning (PostgreSQL 10+)

```sql
-- Create partitioned table
CREATE TABLE app.orders (
    id              BIGINT GENERATED ALWAYS AS IDENTITY,
    org_id          BIGINT NOT NULL,
    total           DECIMAL(12,2) NOT NULL,
    status          VARCHAR(32) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, created_at)  -- partition key MUST be in PK
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE app.orders_2024_01 PARTITION OF app.orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE app.orders_2024_02 PARTITION OF app.orders
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE app.orders_2024_03 PARTITION OF app.orders
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- Create future partitions automatically with pg_partman
SELECT partman.create_parent(
    p_parent_table := 'app.orders',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3
);

-- Query across partitions (transparent)
SELECT COUNT(*) FROM app.orders WHERE created_at >= '2024-01-01' AND created_at < '2024-03-01';

-- Detach old partition (archive)
ALTER TABLE app.orders DETACH PARTITION app.orders_2023_01;
-- Can now convert to standalone table or drop
```

---

### Choosing a partition key, and the hot partition it decides

Partitioning splits a table by a key so that queries touch one piece and old
pieces can be dropped whole. The key is the whole decision, and it is made once.

Two rules pull against each other:

- **Queries should name the partition.** A filter that includes the partition key
  reads one partition. A filter that does not reads all of them, which is the
  same table scan with more planning overhead.
- **Writes should spread across partitions.** A key that concentrates today's
  inserts into one piece has created a **hot partition**: one lock, one buffer,
  one disk, while the rest of the table is idle.

Time is the common key because it satisfies the first rule and fails the second
in exactly one place, the current period, which is also where every insert
lands. That is usually acceptable, since the alternative is worse and the
partition rotates. It stops being acceptable when the write rate alone exceeds
what one partition can absorb, and then the key becomes time plus something that
distributes, a tenant or a hash bucket, at the cost of every query having to
carry both.

Signs the key was wrong, in the order they usually appear:

1. Queries that read every partition, visible as a plan touching all of them
   rather than one.
2. Lock contention and buffer pressure concentrated on one child table.
3. Partitions of wildly different size, which makes maintenance windows
   unpredictable.
4. A tenant large enough to be a partition of its own, sitting inside one shared
   with a thousand small ones.

Retention is the payoff, so design for it: dropping a partition is instant, while
deleting the same rows is a long transaction that produces dead tuples and a
vacuum bill. If the plan is to keep data forever, partitioning buys less than it
costs, and the honest answer may be an index and a bigger machine.

## 4. JSONB Patterns

```json
{
  "preferences": { "theme": "dark", "notifications": true },
  "addresses": [
    { "type": "home", "city": "Rome", "country": "IT" },
    { "type": "work", "city": "Milan", "country": "IT" }
  ],
  "tags": ["vip", "early-adopter", "beta"]
}
```

```sql
-- Create with JSONB
CREATE TABLE app.users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile JSONB NOT NULL DEFAULT '{}'
);

-- Index JSONB fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_profile_preferences
  ON app.users USING GIN (profile jsonb_path_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_profile_theme
  ON app.users ((profile->'preferences'->>'theme'))
  WHERE profile ? 'preferences';

-- Query JSONB
-- Path operator (indexed by GIN)
SELECT * FROM app.users WHERE profile @> '{"preferences": {"theme": "dark"}}';

-- Key existence
SELECT * FROM app.users WHERE profile ? 'addresses';

-- Extract value
SELECT profile->'preferences'->>'theme' AS theme FROM app.users;

-- Update JSONB field
UPDATE app.users
SET profile = jsonb_set(profile, '{preferences,theme}', '"light"')
WHERE id = 42;

-- Partial update (PostgreSQL 16+)
UPDATE app.users
SET profile['preferences']['theme'] = '"light"'
WHERE id = 42;

-- Delete JSONB key
UPDATE app.users
SET profile = profile - 'legacy_field';

-- Aggregate JSONB
SELECT
    id,
    jsonb_agg(profile->>'name' ORDER BY profile->>'created_at') AS ordered_names
FROM app.users GROUP BY id;
```

---

## 5. Full-Text Search

```sql
-- Add tsvector column
ALTER TABLE app.articles ADD COLUMN search_vector tsvector;

-- Create trigger for automatic tsvector update
CREATE OR REPLACE FUNCTION trg_articles_search_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.body, '') || ' ' ||
        COALESCE(NEW.tags::text, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_articles_search
    BEFORE INSERT OR UPDATE ON app.articles
    FOR EACH ROW EXECUTE FUNCTION trg_articles_search_update();

-- Index for full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_search
  ON app.articles USING GIN (search_vector);

-- Query
SELECT title, ts_rank(search_vector, query) AS rank
FROM app.articles, plainto_tsquery('english', 'database optimization tips') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;

-- Highlight matches
SELECT title,
  ts_headline('english', body, plainto_tsquery('english', 'optimization'), 'MaxWords=50, MinWords=20')
FROM app.articles
WHERE search_vector @@ plainto_tsquery('english', 'optimization');
```

---

## 6. Connection Management

### PgBouncer Configuration

```ini
[databases]
mydb = host=localhost port=5432 dbname=mydb pool_size=25

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 200
default_pool_size = 25
reserve_pool_size = 10
reserve_pool_timeout = 5
server_idle_timeout = 600
query_timeout = 30
```

### Application Connection String

```
postgresql://user:pass@localhost:6432/mydb?pool=25&application_name=myapp
```

### Pool Sizing Formula

```
pool_size = (max_connections * (max_concurrent_requests - 1)) / app_instances
Example: (100 * (10 - 1)) / 3 = 300 connections
```

---

## 7. Performance Tuning

### postgresql.conf (16GB RAM Server)

```ini
# Memory
shared_buffers = 4GB            # 25% of RAM
effective_cache_size = 12GB     # 75% of RAM
work_mem = 32MB                 # Per-operation sort memory
maintenance_work_mem = 1GB      # For VACUUM, CREATE INDEX
wal_buffers = 64MB

# Write-ahead log
wal_level = replica
max_wal_size = 4GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9

# Query planner
random_page_cost = 1.1           # For SSD
effective_io_concurrency = 200   # For SSD
default_statistics_target = 500  # Better query plans

# Connections
max_connections = 100
superuser_reserved_connections = 5

# Autovacuum
autovacuum_max_workers = 4
autovacuum_naptime = 60s
autovacuum_vacuum_scale_factor = 0.01
autovacuum_vacuum_threshold = 1000
```

### Tuning Queries

```sql
-- Current query performance
SELECT query, calls, total_exec_time / 1000 AS total_sec,
       mean_exec_time / 1000 AS avg_ms, rows, shared_blks_hit, shared_blks_read
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Cache hit ratio (should be >99%)
SELECT
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 AS cache_hit_ratio
FROM pg_statio_user_tables;

-- Index hit ratio
SELECT
  sum(idx_blks_hit) / (sum(idx_blks_hit) + sum(idx_blks_read)) * 100 AS idx_hit_ratio
FROM pg_statio_user_indexes;
```

---

## 8. Replication & HA

### Streaming Replication Setup

```sql
-- Primary: postgresql.conf
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1024    -- MB

-- Primary: pg_hba.conf
host replication replicator <standby_ip>/32 scram-sha-256

-- Standby: postgresql.conf
primary_conninfo = 'host=<primary_ip> port=5432 user=replicator password=...'
primary_slot_name = 'standby_1'
hot_standby = on
```

### Monitoring Replication

```sql
-- Lag check
SELECT
    application_name,
    state,
    sync_state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) / 1024 / 1024 AS lag_mb,
    GREATEST(0, EXTRACT(EPOCH FROM NOW() - replay_lag)) AS lag_seconds
FROM pg_stat_replication;

-- Standby: check applied WAL
SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(),
       pg_last_xact_replay_timestamp();
```

---

## 9. Maintenance Scripts

### Daily Maintenance

```sql
-- Analyze tables with high churn
ANALYZE orders, users, products;

-- Vacuum high-traffic tables
VACUUM (ANALYZE, INDEX_CLEANUP) orders;

-- Check for bloat
SELECT schemaname, tablename, n_dead_tup, n_live_tup,
       round(n_dead_tup * 100.0 / GREATEST(n_live_tup + n_dead_tup, 1), 2) AS dead_pct
FROM pg_stat_user_tables
ORDER BY dead_pct DESC LIMIT 10;
```

### Weekly Maintenance

```sql
-- Reindex bloated indexes
REINDEX TABLE CONCURRENTLY orders;
REINDEX TABLE CONCURRENTLY users;

-- Update extended statistics
ALTER STATISTICS IF EXISTS stts_orders_status SET STATISTICS 1000;

-- Check for missing indexes
SELECT
    schemaname, tablename,
    seq_scan, seq_tup_read,
    idx_scan, idx_tup_fetch,
    seq_scan - COALESCE(idx_scan, 0) AS missing_index_estimate
FROM pg_stat_user_tables
WHERE seq_scan > 1000 AND seq_tup_read > 10000
ORDER BY missing_index_estimate DESC;
```

---

## 10. PL/pgSQL Functions

```sql
-- Updated_at trigger (universal)
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Soft delete function
CREATE OR REPLACE FUNCTION soft_delete(table_name TEXT, row_id BIGINT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE %I SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', table_name)
    USING row_id;
END;
$$ LANGUAGE plpgsql;

-- Paginated listing with total count
CREATE OR REPLACE FUNCTION list_paginated(
    p_table TEXT, p_where TEXT DEFAULT '1=1',
    p_order TEXT DEFAULT 'id DESC',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE(data JSONB, total BIGINT) AS $$
DECLARE
    total_count BIGINT;
BEGIN
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE %s', p_table, p_where) INTO total_count;
    RETURN QUERY EXECUTE format(
        'SELECT jsonb_agg(sub) AS data, %L AS total FROM (SELECT * FROM %I WHERE %s ORDER BY %s LIMIT %s OFFSET %s) sub',
        total_count, p_table, p_where, p_order, p_limit, p_offset
    );
END;
$$ LANGUAGE plpgsql;
```

---

## 11. Migration Scripts

### Constraint rollout and schema verification

Keep integrity rules in the database and verify the applied schema rather than trusting an ORM relation declaration. For large existing tables, `NOT VALID` can stage foreign-key or check-constraint validation so cleanup and validation can happen separately:

```sql
ALTER TABLE app.orders
  ADD CONSTRAINT fk_orders_org
  FOREIGN KEY (org_id) REFERENCES app.organizations(id)
  NOT VALID;

-- After existing data is repaired:
ALTER TABLE app.orders VALIDATE CONSTRAINT fk_orders_org;

-- PostgreSQL 16+ compatibility note: staged NOT NULL workflows and newer temporal
-- constraint syntax are version- and migration-tool-specific. Verify the target
-- server version before using PostgreSQL 18-only features.
```

Migration tests should apply the migration to an isolated database, assert that expected constraints and indexes exist, try invalid/duplicate/boundary inputs, and exercise the rollback or documented down migration. Use `COMMENT ON COLUMN` for business meaning and allowed values.

```sql
COMMENT ON COLUMN app.orders.status IS
  'Allowed values: pending, paid, shipped, cancelled';

SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'app' AND table_name = 'orders';
```

### Complete Migration Example

```sql
-- 2024-01-15: Add billing support
-- UP
BEGIN;
    ALTER TABLE app.organizations ADD COLUMN billing_email VARCHAR(255);
    ALTER TABLE app.organizations ADD COLUMN billing_plan VARCHAR(32) NOT NULL DEFAULT 'free'
        CHECK (billing_plan IN ('free', 'starter', 'business', 'enterprise'));
    ALTER TABLE app.organizations ADD COLUMN stripe_customer_id VARCHAR(255);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_billing_plan
        ON app.organizations (billing_plan) WHERE deleted_at IS NULL;
COMMIT;

-- DOWN
BEGIN;
    ALTER TABLE app.organizations DROP COLUMN IF EXISTS billing_email;
    ALTER TABLE app.organizations DROP COLUMN IF EXISTS billing_plan;
    ALTER TABLE app.organizations DROP COLUMN IF EXISTS stripe_customer_id;
    DROP INDEX IF EXISTS idx_org_billing_plan;
COMMIT;
```

---

## 12. Security & RLS

### Row-Level Security

```sql
-- Enable RLS on table
ALTER TABLE app.organizations ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see their own org
CREATE POLICY org_isolation ON app.organizations
    USING (id = current_setting('app.org_id')::BIGINT);

-- Create policy: admins can see all
CREATE POLICY admin_access ON app.organizations
    FOR ALL USING (current_setting('app.role') = 'admin');

-- Create policy: insert allowed for authenticated users only
CREATE POLICY org_insert ON app.organizations
    FOR INSERT WITH CHECK (current_setting('app.user_id')::BIGINT IS NOT NULL);
```

### Encryption at Rest (pgcrypto)

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive column
UPDATE app.users SET encrypted_ssn = pgp_sym_encrypt('123-45-6789', current_setting('app.encryption_key'));

-- Decrypt
SELECT pgp_sym_decrypt(encrypted_ssn, current_setting('app.encryption_key')) AS ssn FROM app.users;
```

## PostgreSQL 18 features (opt-in)

Do not silently use features newer than the skill baseline. PostgreSQL 18-specific options such as `uuidv7()`, temporal `WITHOUT OVERLAPS`, `PERIOD`, and any newer staged-constraint behavior must be marked in migrations and checked against the deployment version. For portable skills, retain identity keys, explicit foreign keys, `CHECK`, `UNIQUE`, `NOT NULL`, and `timestamptz` as the baseline.

## See also

- [rule-data-sql](../rule-data-sql/SKILL.md) - General SQL fundamentals
- [rule-data-mysql](../rule-data-mysql/SKILL.md) - MySQL/MariaDB
- [rule-data-mongodb](../rule-data-mongodb/SKILL.md) - MongoDB document DB
- [rule-backend-node](../rule-backend-node/SKILL.md) - Backend Node.js
- [rule](../rule/SKILL.md) - Central skill index
