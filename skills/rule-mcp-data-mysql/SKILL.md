---
name: rule-mcp-data-mysql
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
inherits: [rule-mcp-data]
---

# rule-mcp-data-mysql - MySQL 8+ / MariaDB 11+ Best Practices & Scripts

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

### Relational integrity and foreign-key indexes

Keep the database as the final integrity boundary. Application and ORM validation is useful for friendly errors, but every invariant that must hold for all writers belongs in `NOT NULL`, `CHECK`, `UNIQUE`, and `FOREIGN KEY` constraints. Inspect generated migrations to confirm that ORM relations become real database constraints.

InnoDB automatically indexes foreign-key columns when it needs an index for the constraint. Keep an explicit, named index when the access pattern, composite ordering, or cross-database portability requires one; verify it with `SHOW INDEX` rather than assuming the ORM or engine chose the best query index.

```sql
CREATE TABLE payments (
    id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id  BIGINT UNSIGNED NOT NULL,
    amount   DECIMAL(12, 2) NOT NULL,
    email    VARCHAR(255) NOT NULL,
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT ck_payments_amount CHECK (amount > 0),
    CONSTRAINT uq_payments_email UNIQUE (email)
) ENGINE=InnoDB;

SHOW INDEX FROM payments;
```

`CHECK` constraints are enforced by MySQL 8.0.16+; verify enforcement and syntax for the target MariaDB release. Keep `DATETIME` values in an explicit UTC convention when they represent instants, or use `TIMESTAMP` with a documented conversion policy. Neither choice replaces documenting whether a value is an instant or a local civil time.

### ALTER TABLE - MySQL-Safe

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

## 4. Query Optimization

### EXPLAIN ANALYZE (MySQL 8+)

```sql
-- Analyze query execution
EXPLAIN ANALYZE
SELECT o.*, u.name
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.created_at > '2024-01-01'
  AND o.status = 'completed'
ORDER BY o.total DESC
LIMIT 100;

-- Look for:
-- - Full table scan (type: ALL) → add index
-- - Using temporary → optimize GROUP BY/ORDER BY
-- - Using filesort → add composite index with sort column last
```

### Common Optimization Patterns

```sql
-- ❌ BAD: Non-sargable query
SELECT * FROM orders WHERE YEAR(created_at) = 2024;
-- ✅ GOOD: Range query (uses index)
SELECT * FROM orders WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- ❌ BAD: OFFSET pagination
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 10000;
-- ✅ GOOD: Keyset pagination
SELECT * FROM orders WHERE id > 10000 ORDER BY id LIMIT 20;

-- ❌ BAD: Implicit JOIN
SELECT * FROM orders o, users u WHERE o.user_id = u.id;
-- ✅ GOOD: Explicit JOIN
SELECT * FROM orders o JOIN users u ON u.id = o.user_id;

-- ❌ BAD: COUNT(*) on large table with filter
SELECT COUNT(*) FROM orders WHERE status = 'pending';
-- ✅ GOOD: Use approximate count or maintain counter in application

-- ❌ BAD: SELECT * with JOINs
SELECT * FROM orders o JOIN users u ON u.id = o.user_id;
-- ✅ GOOD: Select only needed columns
SELECT o.id, o.total, u.name FROM orders o JOIN users u ON u.id = o.user_id;
```

---

## 5. Replication

### Async Replication Setup

```sql
-- Primary (my.cnf)
server_id = 1
log_bin = /var/log/mysql/binlog
binlog_format = ROW
binlog_do_db = myapp

-- Primary: create replication user
CREATE USER 'replicator'@'%' IDENTIFIED BY 'strong_password';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;

-- Primary: get coordinates
SHOW MASTER STATUS;
-- File: mysql-bin.000015, Position: 123456

-- Standby (my.cnf)
server_id = 2
relay_log = /var/log/mysql/relaylog
read_only = 1

-- Standby: configure replication
CHANGE MASTER TO
    MASTER_HOST = '192.168.1.10',
    MASTER_PORT = 3306,
    MASTER_USER = 'replicator',
    MASTER_PASSWORD = 'strong_password',
    MASTER_LOG_FILE = 'mysql-bin.000015',
    MASTER_LOG_POS = 123456;

START SLAVE;

-- Check replication
SHOW SLAVE STATUS\G
-- Look for: Slave_IO_Running: Yes, Slave_SQL_Running: Yes
--            Seconds_Behind_Master: 0
```

### Semi-Sync Replication

```sql
-- Primary
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';
SET GLOBAL rpl_semi_sync_master_enabled = 1;
SET GLOBAL rpl_semi_sync_master_timeout = 1000; -- fallback to async after 1s

-- Standby
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';
SET GLOBAL rpl_semi_sync_slave_enabled = 1;
STOP SLAVE IO_THREAD; START SLAVE IO_THREAD;
```

### GTID Replication (MySQL 8+)

```sql
-- my.cnf: enable GTID
gtid_mode = ON
enforce_gtid_consistency = ON

-- Standby: auto-position
CHANGE MASTER TO
    MASTER_HOST = '192.168.1.10',
    MASTER_USER = 'replicator',
    MASTER_PASSWORD = 'strong_password',
    MASTER_AUTO_POSITION = 1;
```

### Failover

```sql
-- Check all replicas are caught up
SHOW SLAVE STATUS\G

-- Promote replica to primary
STOP SLAVE;
RESET SLAVE ALL;
SET GLOBAL read_only = 0;

-- Point app to new primary
-- Rebuild replication from new primary to old primary
```

---

## 6. Backup & Recovery

### Logical Backup (mysqldump)

```bash
# Single database (consistent, no locking for InnoDB)
mysqldump --single-transaction --routines --triggers --events \
  --host=localhost --user=backup --password \
  myapp > myapp_$(date +%Y%m%d_%H%M%S).sql

# All databases
mysqldump --all-databases --single-transaction --routines --triggers --events \
  --host=localhost --user=backup --password \
  > full_backup_$(date +%Y%m%d).sql

# Specific tables
mysqldump --single-transaction myapp users orders > users_orders_backup.sql

# Compressed
mysqldump --single-transaction myapp | gzip > myapp_$(date +%Y%m%d).sql.gz
```

### Physical Backup (Xtrabackup)

```bash
# Full backup
xtrabackup --backup --target-dir=/backup/mysql/full_$(date +%Y%m%d) \
  --user=backup --password

# Prepare backup (replay logs)
xtrabackup --prepare --target-dir=/backup/mysql/full_$(date +%Y%m%d)

# Incremental backup (requires full base)
xtrabackup --backup --target-dir=/backup/mysql/incr_$(date +%Y%m%d) \
  --incremental-basedir=/backup/mysql/full_$(date +%Y%m%d) \
  --user=backup --password

# Restore
xtrabackup --copy-back --target-dir=/backup/mysql/full_$(date +%Y%m%d)
chown -R mysql:mysql /var/lib/mysql
```

### Point-in-Time Recovery

```bash
# Restore full backup first
xtrabackup --copy-back --target-dir=/backup/mysql/full_20240101

# Apply binary logs up to specific time
mysqlbinlog --stop-datetime="2024-01-15 14:30:00" \
  /var/log/mysql/binlog.* | mysql -u root
```

### Backup Verification Script

```bash
#!/bin/bash
# verify_backup.sh - restore backup to temp instance and run checks
BACKUP_DIR=$1
TEMP_DATA_DIR=/tmp/mysql_verify
MYSQLD_CMD=$(which mysqld)

# Clean and restore
rm -rf $TEMP_DATA_DIR
mkdir -p $TEMP_DATA_DIR
xtrabackup --copy-back --target-dir=$BACKUP_DIR --datadir=$TEMP_DATA_DIR

# Start temporary instance
$MYSQLD_CMD --no-defaults --datadir=$TEMP_DATA_DIR --port=3307 \
  --socket=/tmp/mysql_verify.sock &
sleep 5

# Run checks
mysql -S /tmp/mysql_verify.sock -e "CHECK TABLE myapp.users;"
mysql -S /tmp/mysql_verify.sock -e "SELECT COUNT(*) FROM myapp.orders;"

# Cleanup
mysqladmin -S /tmp/mysql_verify.sock shutdown
rm -rf $TEMP_DATA_DIR
echo "Backup verification complete"
```

---

## 7. Performance Monitoring

```sql
-- Current process list
SHOW FULL PROCESSLIST;

-- Running queries longer than 5 seconds
SELECT * FROM information_schema.PROCESSLIST
WHERE COMMAND != 'Sleep' AND TIME > 5
ORDER BY TIME DESC;

-- Table size and row count
SELECT
    TABLE_NAME,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS total_size_mb,
    TABLE_ROWS,
    ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'myapp'
ORDER BY total_size_mb DESC;

-- Top queries by execution time
SELECT
    digest_text,
    count_star,
    sum_timer_wait / 1000000000000 AS total_sec,
    avg_timer_wait / 1000000000 AS avg_ms,
    sum_rows_affected
FROM performance_schema.events_statements_summary_by_digest
ORDER BY sum_timer_wait DESC
LIMIT 20;
```

---

## 8. Maintenance Scripts

### Daily

```sql
-- Update table statistics
ANALYZE TABLE orders, users, products;

-- Check fragmented tables
SELECT TABLE_NAME, ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
       ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS idx_mb,
       ROUND(DATA_FREE / 1024 / 1024, 2) AS free_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'myapp' AND DATA_FREE > DATA_LENGTH * 0.3;

-- Optimize fragmented tables
OPTIMIZE TABLE orders;  -- Rebuilds table + indexes
```

### Weekly

```bash
#!/bin/bash
# mysql_maintenance.sh

# Rotate slow query log
mysql -e "SET GLOBAL slow_query_log = 0;"
mv /var/log/mysql/slow.log /var/log/mysql/slow_$(date +%Y%m%d).log
mysqladmin flush-logs slow
mysql -e "SET GLOBAL slow_query_log = 1;"

# Archive old binary logs
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);

# Check slave status
mysql -e "SHOW SLAVE STATUS\G" | grep -E "Seconds_Behind_Master|Slave_(IO|SQL)_Running"
```

---

## 9. Migration Scripts

### Verification, documentation, and rollback

Treat migrations as executable schema history. In an isolated database, apply each migration, verify constraints and indexes, test invalid/duplicate/boundary inputs, and exercise the rollback or documented down migration. Use column comments for business meaning and allowed values.

```sql
-- Verify the applied schema instead of trusting an ORM model.
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations';

ALTER TABLE organizations
    MODIFY COLUMN plan ENUM('free', 'pro', 'enterprise') NOT NULL
    COMMENT 'Allowed values: free, pro, enterprise';

-- Run the DOWN migration in the isolated database and verify the prior shape.
```

Avoid comma-separated values, repeating columns, and generic EAV tables in relational tables. Prefer child/junction tables for independently queryable facts; use MySQL JSON only for intentionally flexible attributes whose constraints are not relational.

```sql
-- 20240115_120000_create_organizations.sql
-- UP
CREATE TABLE IF NOT EXISTS organizations (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DOWN
DROP TABLE IF EXISTS organizations;

-- 20240116_090000_add_billing_to_orgs.sql
-- UP
ALTER TABLE organizations
    ADD COLUMN billing_email VARCHAR(255) AFTER slug,
    ADD INDEX idx_org_billing_email (billing_email);

-- DOWN
ALTER TABLE organizations
    DROP INDEX idx_org_billing_email,
    DROP COLUMN IF EXISTS billing_email;
```

---

## 10. Security

```sql
-- Create application user (least privilege)
CREATE USER 'app'@'%' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'app'@'%';
-- For migrations
GRANT ALTER, CREATE, INDEX, DROP ON myapp.* TO 'migration'@'localhost';

-- Force SSL for connections
ALTER USER 'app'@'%' REQUIRE SSL;

-- Password policy
SET GLOBAL validate_password.length = 12;
SET GLOBAL validate_password.mixed_case_count = 1;

-- Audit log (MySQL Enterprise / MariaDB Audit Plugin)
INSTALL SONAME 'server_audit';
SET GLOBAL server_audit_logging = ON;
SET GLOBAL server_audit_events = 'CONNECT, QUERY';
```

## See also

- [rule-mcp-data-sql](../rule-mcp-data-sql/SKILL.md) - General SQL fundamentals
- [rule-mcp-data-postgresql](../rule-mcp-data-postgresql/SKILL.md) - PostgreSQL-specific
- [rule-mcp-data-mongodb](../rule-mcp-data-mongodb/SKILL.md) - MongoDB document DB
- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index
