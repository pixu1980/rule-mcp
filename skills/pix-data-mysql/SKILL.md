---
name: rule-data-mysql
description: >-
  Use when working with MySQL 8+ or MariaDB 11+. Covers DDL scripts, InnoDB tuning, indexing, replication, query optimization, and production maintenance.
tags:
  - "mysql"
  - "mariadb"
  - "data"
  - "sql"
  - "relational"
  - "innodb"
  - "performance"
  - "replication"
  - "backup"
frameworks: [all]
---

# rule-data-mysql — MySQL 8+ / MariaDB 11+ Best Practices & Scripts

## Table of Contents

1. [DDL Scripts](#1-ddl-scripts)
2. [InnoDB Tuning](#2-innodb-tuning)
3. [Indexing Strategy](#3-indexing-strategy)
4. [Query Optimization](#4-query-optimization)
5. [Replication](#5-replication)
6. [Backup & Recovery](#6-backup--recovery)
7. [Performance Monitoring](#7-performance-monitoring)
8. [Maintenance Scripts](#8-maintenance-scripts)
9. [Migration Scripts](#9-migration-scripts)
10. [Security](#10-security)

---

## 1. DDL Scripts

### CREATE TABLE (InnoDB)

```sql
CREATE TABLE IF NOT EXISTS organizations (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid            CHAR(36) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    settings        JSON NOT NULL DEFAULT ('{}'),
    plan            ENUM('free', 'pro', 'enterprise') NOT NULL DEFAULT 'free',
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    trial_ends_at   DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL,

    -- Constraints
    CONSTRAINT uq_org_slug UNIQUE (slug),
    CONSTRAINT uq_org_uuid UNIQUE (uuid),
    INDEX idx_org_active (created_at DESC),
    INDEX idx_org_plan (plan),
    FULLTEXT INDEX ft_org_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ALTER TABLE — MySQL-Safe

```sql
-- Add column (safe with IF NOT EXISTS simulation)
ALTER TABLE organizations
    ADD COLUMN billing_email VARCHAR(255) NULL
    AFTER plan;

-- Modify column type
ALTER TABLE organizations
    MODIFY COLUMN name VARCHAR(500) NOT NULL;

-- Rename column (MySQL 8+)
ALTER TABLE organizations
    RENAME COLUMN slug TO legacy_slug;

-- Drop column
ALTER TABLE organizations
    DROP COLUMN IF EXISTS legacy_slug;

-- Add/drop index online
ALTER TABLE organizations
    ADD INDEX idx_org_email (billing_email),
    DROP INDEX idx_old_unused;

-- Add foreign key (with lock timeout)
SET SESSION lock_wait_timeout = 5;
ALTER TABLE orders
    ADD CONSTRAINT fk_orders_org
    FOREIGN KEY (org_id) REFERENCES organizations(id)
    ON DELETE CASCADE;

-- Change engine
ALTER TABLE organizations ENGINE=InnoDB;
```

### DROP Operations

```sql
-- Safe DROP TABLE
DROP TABLE IF EXISTS temp_import;
-- Or archive first
RENAME TABLE organizations TO organizations_archived_20240115;

-- Truncate (resets AUTO_INCREMENT)
TRUNCATE TABLE temp_log;

-- Drop database
DROP DATABASE IF EXISTS old_project;
```

---

## 2. InnoDB Tuning

### my.cnf (16GB RAM Server)

```ini
[mysqld]
# InnoDB
innodb_buffer_pool_size = 10G          # 60-70% of RAM
innodb_buffer_pool_instances = 8       # 1GB per instance
innodb_log_file_size = 2G
innodb_flush_log_at_trx_commit = 2     # 1=ACID, 2=faster (1s data loss)
innodb_flush_method = O_DIRECT
innodb_file_per_table = 1
innodb_autoinc_lock_mode = 2

# Connection
max_connections = 200
thread_cache_size = 50

# Query cache (deprecated in 8.0, use ProxySQL instead)
# query_cache_type = 0

# Temp tables
tmp_table_size = 128M
max_heap_table_size = 128M

# Logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
log_queries_not_using_indexes = 1

# Binary log
server_id = 1
log_bin = /var/log/mysql/binlog
binlog_format = ROW
expire_logs_days = 7
max_binlog_size = 1G
```

### Buffer Pool Management

```sql
-- Current buffer pool size
SELECT @@innodb_buffer_pool_size / 1024 / 1024 / 1024 AS buffer_pool_GB;

-- Buffer pool hit ratio (should be >99%)
SELECT
    (1 - (SELECT SUM( Innodb_buffer_pool_reads )
          FROM performance_schema.global_status
          WHERE variable_name = 'Innodb_buffer_pool_reads')
    / (SELECT SUM( Innodb_buffer_pool_read_requests )
       FROM performance_schema.global_status
       WHERE variable_name = 'Innodb_buffer_pool_read_requests')) * 100 AS hit_ratio;

-- Warm buffer pool (after restart)
SELECT CONCAT('SELECT ', GROUP_CONCAT(COALESCE(CONCAT(engine, '.', table_name), 'NULL') SEPARATOR ', '),
              ' FROM ', table_schema, '.', table_name) AS warmup_query
FROM information_schema.tables
WHERE table_schema NOT IN ('mysql', 'performance_schema', 'sys');
```

---

## 3. Indexing Strategy

### Index Types

```sql
-- B-tree (default): equality + range
CREATE INDEX idx_users_email ON users (email);

-- Composite: equality first, range/sort last
CREATE INDEX idx_orders_user_status ON orders (user_id, status, created_at DESC);

-- Descending index (MySQL 8+)
CREATE INDEX idx_orders_created_desc ON orders (created_at DESC);

-- Full-text for text search
CREATE FULLTEXT INDEX ft_articles_content ON articles (title, body);

-- Spatial index
CREATE SPATIAL INDEX idx_locations_coords ON locations (coordinates);

-- Functional index (MySQL 8+)
CREATE INDEX idx_users_email_lower ON users ((LOWER(email)));

-- Invisible index (test without impacting queries)
CREATE INDEX idx_test ON orders (total) INVISIBLE;
-- Make visible: ALTER TABLE orders ALTER INDEX idx_test VISIBLE;
```

### Index Analysis

```sql
-- Unused indexes
SELECT object_schema, object_name, index_name
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL AND index_name != 'PRIMARY'
  AND count_star = 0;

-- Duplicate indexes
SELECT
    a.TABLE_SCHEMA, a.TABLE_NAME,
    GROUP_CONCAT(a.INDEX_NAME SEPARATOR ', ') AS duplicate_indexes
FROM information_schema.STATISTICS a
JOIN information_schema.STATISTICS b
    ON a.TABLE_SCHEMA = b.TABLE_SCHEMA
    AND a.TABLE_NAME = b.TABLE_NAME
    AND a.SEQ_IN_INDEX = b.SEQ_IN_INDEX
    AND a.INDEX_NAME != b.INDEX_NAME
    AND a.COLUMN_NAME = b.COLUMN_NAME
    AND a.INDEX_NAME < b.INDEX_NAME
GROUP BY a.TABLE_SCHEMA, a.TABLE_NAME;

-- Missing indexes (queries with full table scan)
SELECT * FROM sys.schema_unused_indexes;
```

---

## Reference

Load references/REFERENCE.md for detailed MySQL reference (DDL, indexing, replication, query optimization, InnoDB tuning).
