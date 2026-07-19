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
---

# rule-data-postgresql — PostgreSQL 16+ Best Practices & Scripts

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

### ALTER TABLE — PostgreSQL Best Practices

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

### Index Types Comparison

| Type | Use Case | Creation |
|------|----------|----------|
| **B-tree** (default) | Equality, range, ORDER BY | `CREATE INDEX ...` |
| **GiST** | Full-text, geometry, ranges | `CREATE INDEX ... USING GIST` |
| **GIN** | JSONB, arrays, full-text | `CREATE INDEX ... USING GIN` |
| **BRIN** | Append-only, time-series | `CREATE INDEX ... USING BRIN` |
| **Hash** | Equality only (rarely useful) | `CREATE INDEX ... USING HASH` |
| **SP-GiST** | Spatial, network addresses | `CREATE INDEX ... USING SPGIST` |

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

## Reference

Load references/REFERENCE.md for detailed PostgreSQL reference (DDL, indexing, replication, partitioning, full-text search).
