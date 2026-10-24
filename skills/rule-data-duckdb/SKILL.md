---
name: rule-data-duckdb
description: >-
  Use when working with DuckDB for analytical queries and embedded OLAP. Covers SQL, Parquet/CSV import, window functions, and performance optimization.
tags:
  - "duckdb"
  - "data"
  - "analytics"
  - "olap"
  - "columnar"
  - "parquet"
  - "embedded"
  - "sql"
  - "performance"
  - "reporting"
frameworks: [all]
inherits: [rule-data]
---

# rule-data-duckdb - DuckDB 1.x Best Practices & Scripts

## Table of Contents

1. [Installation & Configuration](#1-installation--configuration)
2. [DDL & Data Types](#2-ddl--data-types)
3. [SQL Extensions](#3-sql-extensions)
4. [Import / Export (Parquet, CSV, JSON)](#4-import--export-parquet-csv-json)
5. [Window Functions & Analytics](#5-window-functions--analytics)
6. [Common Table Expressions (CTEs)](#6-common-table-expressions-ctes)
7. [Macros & Persistent Functions](#7-macros--persistent-functions)
8. [Performance Tuning](#8-performance-tuning)
9. [Extensions & Community](#9-extensions--community)
10. [Common Recipes](#10-common-recipes)

---

## 1. Installation & Configuration

```bash
# Node.js (DuckDB WASM for browser, DuckDB Node API for server)
pnpm add @duckdb/node-api
# or
npm install duckdb

# CLI (macOS)
brew install duckdb
```

### Configuration pragmas

```sql
SET memory_limit = '2GB';
SET threads = 4;
SET default_null_order = 'NULLS LAST';
SET enable_progress_bar = true;
```

## 2. DDL & Data Types

### DuckDB-specific types

```sql
CREATE TABLE analytics_logs (
  id        INTEGER PRIMARY KEY,
  event     VARCHAR NOT NULL,
  payload   JSON,                    -- Native JSON type
  tags      VARCHAR[],               -- Array type
  metadata  MAP(VARCHAR, VARCHAR),   -- Map type
  ts        TIMESTAMP WITH TIME ZONE,
  duration  INTERVAL
);

-- Enum types for memory-efficient categories
CREATE TYPE event_type AS ENUM ('click', 'view', 'purchase', 'error');
```

## 3. SQL Extensions

### PIVOT / UNPIVOT

```sql
PIVOT sales ON quarter USING SUM(amount)
  GROUP BY product
  ORDER BY product;

UNPIVOT monthly_sales
  ON jan, feb, mar
  INTO
    NAME month
    VALUE sales;
```

### QUALIFY (filter window functions without subquery)

```sql
SELECT *, RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk
FROM products
QUALIFY rnk <= 3;
```

## 4. Import / Export (Parquet, CSV, JSON)

### Parquet (recommended for analytics)

```sql
-- Read Parquet directly
SELECT * FROM 'data/sales.parquet';

-- Write to Parquet
COPY analytics TO 'output/report.parquet' (FORMAT PARQUET);

-- Partitioned write
COPY analytics TO 'output/by_region' (FORMAT PARQUET, PARTITION_BY region);
```

### CSV & JSON

```sql
-- CSV with auto-detection
SELECT * FROM read_csv_auto('data/logs.csv');

-- JSON with schema auto-detection
SELECT * FROM read_json_auto('data/events.json');

-- Parquet → CSV conversion
COPY (SELECT * FROM 'input.parquet') TO 'output.csv' (HEADER, DELIMITER ',');
```

## 5. Window Functions & Analytics

```sql
-- Moving average
SELECT date, value,
  AVG(value) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma_7d
FROM timeseries;

-- Year-over-year comparison
SELECT year, month, revenue,
  LAG(revenue) OVER (PARTITION BY month ORDER BY year) AS prev_year_revenue,
  (revenue - LAG(revenue) OVER (PARTITION BY month ORDER BY year)) /
    NULLIF(LAG(revenue) OVER (PARTITION BY month ORDER BY year), 0) * 100 AS yoy_pct
FROM monthly_revenue;
```

## 6. Common Table Expressions (CTEs)

```sql
-- Recursive CTE for hierarchical data
WITH RECURSIVE org_tree AS (
  SELECT id, name, parent_id, 1 AS level
  FROM employees WHERE parent_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.parent_id, t.level + 1
  FROM employees e
  JOIN org_tree t ON e.parent_id = t.id
)
SELECT * FROM org_tree ORDER BY level, name;
```

## 7. Macros & Persistent Functions

```sql
-- Scalar macro (like a function)
CREATE MACRO add_days(d, n) AS d + INTERVAL (n) DAY;

-- Table macro (parameterized view)
CREATE MACRO top_n(table_ref, n, order_col) AS TABLE
  SELECT * FROM table_ref ORDER BY order_col DESC LIMIT n;

SELECT * FROM top_n('analytics', 10, 'revenue');
```

## 8. Performance Tuning

### Best practices

1. Use Parquet format for analytical data (columnar, compressed, filtered).
2. Add `ORDER BY` to the CREATE TABLE for zone maps (e.g., `ORDER BY ts DESC`).
3. Use `EXPLAIN ANALYZE` to identify bottlenecks.
4. Set `memory_limit` to 60-80% of available RAM.
5. Use `PRAGMA threads` equal to physical core count.

```sql
-- Zone map optimization (physically sorts data on disk)
CREATE TABLE events AS SELECT * FROM raw_events ORDER BY ts DESC;

-- Check query plan
EXPLAIN ANALYZE SELECT region, SUM(revenue) FROM sales GROUP BY region;
```

## 9. Extensions & Community

```sql
-- Load extensions
INSTALL httpfs;    -- S3 / HTTP / GCS filesystem
LOAD httpfs;
INSTALL spatial;   -- GIS / spatial analytics
LOAD spatial;
INSTALL fts;       -- Full-text search
LOAD fts;

-- List installed extensions
SELECT * FROM duckdb_extensions();
```

## 10. Common Recipes

### Pivot monthly aggregation

```sql
PIVOT monthly_sales ON month USING SUM(amount)
  GROUP BY year
  ORDER BY year DESC;
```

### Multi-file glob

```sql
SELECT * FROM read_parquet('data/*.parquet', union_by_name = true);
```

### In-memory analytics (no persistence)

```sql
ATTACH ':memory:' AS analytics;
USE analytics;
CREATE TABLE temp_data AS SELECT * FROM 'input.parquet';
-- query and discard
DETACH analytics;
```

## See also

- [rule-data-sql](../rule-data-sql/SKILL.md) - SQL fundamentals
- [rule-data-postgresql](../rule-data-postgresql/SKILL.md) - PostgreSQL reference
