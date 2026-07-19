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

## See also

- [rule-data-sql](../rule-data-sql/SKILL.md) — General SQL fundamentals
- [rule-data-mysql](../rule-data-mysql/SKILL.md) — MySQL/MariaDB
- [rule-data-mongodb](../rule-data-mongodb/SKILL.md) — MongoDB document DB
- [rule-backend-node](../rule-backend-node/SKILL.md) — Backend Node.js
- [rule](../rule/SKILL.md) — Central skill index
## Reference

See `references/REFERENCE.md` for detailed reference material — load when you need specific API details, syntax, or advanced examples.
