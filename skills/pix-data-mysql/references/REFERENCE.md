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
# verify_backup.sh — restore backup to temp instance and run checks
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

- [rule-data-sql](../rule-data-sql/SKILL.md) — General SQL fundamentals
- [rule-data-postgresql](../rule-data-postgresql/SKILL.md) — PostgreSQL-specific
- [rule-data-mongodb](../rule-data-mongodb/SKILL.md) — MongoDB document DB
- [rule](../rule/SKILL.md) — Central skill index
## Reference

See `references/REFERENCE.md` for detailed reference material — load when you need specific API details, syntax, or advanced examples.
