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

| Level | Dirty Read | Non-repeatable | Phantom | Use Case |
|-------|-----------|----------------|---------|----------|
| READ UNCOMMITTED | ✅ | ✅ | ✅ | Never use |
| READ COMMITTED | ❌ | ✅ | ✅ | General purpose |
| REPEATABLE READ | ❌ | ❌ | ✅ | Reporting |
| SERIALIZABLE | ❌ | ❌ | ❌ | Financial, critical data |

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

- [rule-data-postgresql](../rule-data-postgresql/SKILL.md) — PostgreSQL-specific
- [rule-data-mysql](../rule-data-mysql/SKILL.md) — MySQL/MariaDB-specific
- [rule-data-mongodb](../rule-data-mongodb/SKILL.md) — MongoDB document DB
- [rule-backend-node](../rule-backend-node/SKILL.md) — Backend runtime patterns
- [rule](../rule/SKILL.md) — Central skill index
## Reference

See `references/REFERENCE.md` for detailed reference material — load when you need specific API details, syntax, or advanced examples.
