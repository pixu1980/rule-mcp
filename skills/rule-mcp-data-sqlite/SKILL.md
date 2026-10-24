---
name: rule-mcp-data-sqlite
description: >-
  Use when working with SQLite for embedded databases. Covers DDL scripts, query optimization, JSON functions, WAL mode, and production usage patterns.
tags:
  - "sqlite"
  - "data"
  - "sql"
  - "embedded"
  - "local-first"
  - "fts5"
  - "wal"
  - "acid"
  - "performance"
  - "backup"
  - "offline"
frameworks: [all]
inherits: [rule-mcp-data]
---

# rule-mcp-data-sqlite - SQLite 3.x Best Practices & Scripts

## Table of Contents

1. [DDL Scripts](#1-ddl-scripts)
2. [Journal Modes & Transaction Control](#2-journal-modes--transaction-control)
3. [Indexing Strategy](#3-indexing-strategy)
4. [Full-Text Search (FTS5)](#4-full-text-search-fts5)
5. [JSON Functions & Virtual Columns](#5-json-functions--virtual-columns)
6. [Performance Tuning](#6-performance-tuning)
7. [Concurrency & WAL Mode](#7-concurrency--wal-mode)
8. [Backup & Migration](#8-backup--migration)
9. [Security & Encryption](#9-security--encryption)
10. [Common Recipes](#10-common-recipes)

---

## 1. DDL Scripts: CREATE / ALTER / DROP

### Creating a table with constraints

```sql
CREATE TABLE IF NOT EXISTS items (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid      TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  name      TEXT NOT NULL,
  payload   TEXT DEFAULT '{}',  -- JSON string
  status    TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  version   INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Trigger for auto-updating `updated_at`
CREATE TRIGGER IF NOT EXISTS trg_items_updated_at
  AFTER UPDATE ON items FOR EACH ROW
  BEGIN
    UPDATE items SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = OLD.id;
  END;
```

### Migration-safe schema changes

SQLite supports `ALTER TABLE ADD COLUMN` but not DROP or RENAME columns directly. Use the 12-step rebuild pattern:

```sql
-- 1. Create new table with desired schema
CREATE TABLE items_new (...);
-- 2. Copy data with transformation
INSERT INTO items_new (...) SELECT ... FROM items;
-- 3. Drop old table
DROP TABLE items;
-- 4. Rename new table
ALTER TABLE items_new RENAME TO items;
```

## 2. Journal Modes & Transaction Control

### Journal mode comparison

| Mode                    | Durability               | Write Speed | Concurrency                 | Use Case                         |
| ----------------------- | ------------------------ | ----------- | --------------------------- | -------------------------------- |
| `DELETE`                | Full (rollback journal)  | Slowest     | Read-only                   | Legacy / strict ACID             |
| `WAL` (Write-Ahead Log) | Full                     | Fast        | Concurrent reads + 1 writer | **Default for local-first apps** |
| `MEMORY`                | None (crash = data loss) | Fastest     | Single connection           | Temp/cache only                  |
| `OFF`                   | None                     | Fastest     | Single connection           | Test/scratch                     |

```sql
-- Recommended for local-first apps
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;  -- balance speed vs safety
PRAGMA busy_timeout = 5000;   -- 5 second wait on lock
```

### Explicit transaction control

```sql
BEGIN IMMEDIATE;  -- Acquire write lock immediately, avoid SQLITE_BUSY
  UPDATE items SET status = 'archived' WHERE id = ?;
  INSERT INTO audit_log(item_id, action) VALUES(?, 'archived');
COMMIT;
```

## 3. Indexing Strategy

### Index types

```sql
-- B-tree (default)
CREATE INDEX idx_items_status ON items(status);

-- Partial index (smaller, faster)
CREATE INDEX idx_items_active ON items(status) WHERE status = 'active';

-- Covering index (avoid table lookup)
CREATE INDEX idx_items_name_status ON items(name, status);

-- Descending index for ORDER BY DESC
CREATE INDEX idx_items_created_desc ON items(created_at DESC);
```

### Indexing rules

1. Index columns used in WHERE, JOIN, and ORDER BY.
2. Partial indexes are 2-5x smaller and faster for filtered queries.
3. Use `EXPLAIN QUERY PLAN` to verify index usage.
4. Avoid over-indexing: each index slows INSERT/UPDATE/DELETE.
5. Monitor via `PRAGMA index_list(table)` and `PRAGMA index_info(index)`.

## 4. Full-Text Search (FTS5)

```sql
-- Create virtual FTS5 table
CREATE VIRTUAL TABLE items_fts USING fts5(
  name, description,
  content='items',
  content_rowid='id',
  tokenize='porter unicode61'
);

-- Population triggers
CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, name, description) VALUES (new.id, new.name, '');
END;

-- Search query
SELECT * FROM items WHERE rowid IN (
  SELECT rowid FROM items_fts WHERE items_fts MATCH 'search_term'
);
```

## 5. JSON Functions & Virtual Columns

```sql
-- Extract JSON fields
SELECT id, json_extract(payload, '$.tags') AS tags FROM items;

-- Generated (virtual) columns for indexed JSON access
ALTER TABLE items ADD COLUMN tags_json TEXT
  GENERATED ALWAYS AS (json_extract(payload, '$.tags')) VIRTUAL;

CREATE INDEX idx_items_tags ON items(tags_json);
```

## 6. Performance Tuning

```sql
-- PRAGMA settings for production
PRAGMA cache_size = -64000;       -- 64MB page cache
PRAGMA page_size = 4096;          -- 4KB pages (default after 3.12.0)
PRAGMA mmap_size = 268435456;     -- 256MB memory-mapped I/O
PRAGMA temp_store = MEMORY;       -- Temp tables in memory
PRAGMA foreign_keys = ON;         -- Enforce FK constraints
```

## 7. Concurrency & WAL Mode

- **WAL mode** supports 1 writer + unlimited readers simultaneously.
- Writers do not block readers; readers do not block writers.
- Checkpoint frequency: automatic at `wal_autocheckpoint` (default 1000 pages).
- Manual checkpoint: `PRAGMA wal_checkpoint(TRUNCATE);`
- Connection pooling is not typical for SQLite - use a single WAL connection.

## 8. Backup & Migration

```sql
-- Online backup via .backup CLI or API
.backup /path/to/backup.db

-- Export to SQL dump
.output dump.sql
.dump
.output stdout

-- Attach and copy between databases
ATTACH DATABASE 'backup.db' AS backup;
INSERT INTO backup.items SELECT * FROM main.items;
DETACH DATABASE backup;
```

## 9. Security & Encryption

- SQLite does not have built-in encryption. Use SEE (SQLite Encryption Extension) or sqlcipher.
- Sanitize all user input in SQL - prefer parameterized queries.
- File permissions on the `.db` file are the primary access control.
- Consider `PRAGMA key = '...'` with sqlcipher-compatible builds.

## 10. Common Recipes

### Upsert (INSERT OR REPLACE / ON CONFLICT)

```sql
INSERT INTO items (uuid, name, payload, status)
VALUES (?, ?, ?, 'active')
ON CONFLICT(uuid) DO UPDATE SET
  name = excluded.name,
  payload = excluded.payload,
  version = version + 1;
```

### Pagination with keyset (cursor-based)

```sql
SELECT * FROM items
WHERE created_at < ?  -- cursor value
ORDER BY created_at DESC
LIMIT 20;
```

### Full-text search with ranking

```sql
SELECT i.*, rank
FROM items_fts
JOIN items ON items_fts.rowid = items.id
WHERE items_fts MATCH 'query'
ORDER BY rank;
```

## See also

- [rule-mcp-data-sql](../rule-mcp-data-sql/SKILL.md) - SQL fundamentals
- [rule-mcp-data-postgresql](../rule-mcp-data-postgresql/SKILL.md) - PostgreSQL reference
