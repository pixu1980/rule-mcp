---
name: rule-data-indexed-db
description: >-
  Use when using IndexedDB in the browser for client-side storage. Covers object stores, indexes, transactions, cursors, and versioning.
tags:
  - "indexeddb"
  - "data"
  - "browser"
  - "local-first"
  - "offline"
  - "storage"
  - "filesystem"
  - "idb"
  - "pwa"
  - "sync"
frameworks: [all]
---

# rule-data-indexed-db - IndexedDB / File System Best Practices & Scripts

## Table of Contents

1. [Database Setup & Schema](#1-database-setup--schema)
2. [Object Stores & Indexes](#2-object-stores--indexes)
3. [CRUD Operations](#3-crud-operations)
4. [Transactions](#4-transactions)
5. [Cursors & Pagination](#5-cursors--pagination)
6. [Schema Migration](#6-schema-migration)
7. [Bulk Operations](#7-bulk-operations)
8. [Blob / File Storage](#8-blob--file-storage)
9. [Offline Sync Patterns](#9-offline-sync-patterns)
10. [Performance Best Practices](#10-performance-best-practices)

---

## 1. Database Setup & Schema

### Open / create database with schema

```javascript
function openDB(name, version, upgradeFn) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (upgradeFn) upgradeFn(db, ev);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Usage
const db = await openDB("MyApp", 2, (db, ev) => {
  if (ev.oldVersion < 1) {
    const store = db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
    store.createIndex("by_uuid", "uuid", { unique: true });
    store.createIndex("by_status", "status", { unique: false });
  }
  if (ev.oldVersion < 2) {
    db.createObjectStore("audit_log", { keyPath: "id", autoIncrement: true });
  }
});
```

## 2. Object Stores & Indexes

### Store with compound indexes

```javascript
const store = db.createObjectStore("entities", { keyPath: "id" });
store.createIndex("by_type_status", ["type", "status"], { unique: false });
store.createIndex("by_updated", "updated_at", { unique: false });
store.createIndex("by_parent", "parent_id", { unique: false });
```

### Index access patterns

```javascript
// Unique index lookup
const tx = db.transaction("entities", "readonly");
const idx = tx.objectStore("entities").index("by_uuid");
const entity = await idx.get(uuid);

// Range query on compound index
const range = IDBKeyRange.bound(["active", minDate], ["active", maxDate]);
const cursor = store.index("by_type_status").openCursor(range);
```

## 3. CRUD Operations

### Put (create/update)

```javascript
async function putItem(data) {
  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  const id = await new Promise((res, rej) => {
    const req = store.put({ ...data, updated_at: new Date().toISOString() });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  await tx.done;
  return id;
}
```

### Get by key

```javascript
async function getItem(id) {
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  return new Promise((res, rej) => {
    const req = store.get(id);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
```

### Delete

```javascript
async function deleteItem(id) {
  const tx = db.transaction("items", "readwrite");
  tx.objectStore("items").delete(id);
  await tx.done;
}
```

## 4. Transactions

### Explicit transaction life cycle

```javascript
const tx = db.transaction(["items", "audit_log"], "readwrite");

// Perform operations
const store = tx.objectStore("items");
store.put(newItem);
const audit = tx.objectStore("audit_log");
audit.add({ action: "create", item_id: newItem.id, ts: new Date().toISOString() });

// Check for errors
tx.onerror = () => console.error("Transaction failed:", tx.error);
tx.onabort = () => console.warn("Transaction aborted");

// Wait for completion
await tx.done;
```

## 5. Cursors & Pagination

```javascript
async function* iterateStore(storeName, query) {
  const tx = db.transaction(storeName, "readonly");
  const source = query?.index ? tx.objectStore(storeName).index(query.index) : tx.objectStore(storeName);
  const range = query?.range || null;
  const direction = query?.direction || "next";

  const cursorReq = source.openCursor(range, direction);
  yield new Promise((res, rej) => {
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        res(cursor.value);
        cursor.continue();
      } else res(null);
    };
    cursorReq.onerror = () => rej(cursorReq.error);
  });
}

// Keyset pagination
async function paginate(storeName, pageSize, cursorId) {
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const range = cursorId ? IDBKeyRange.lowerBound(cursorId, true) : null;
  const cursor = await new Promise((res, rej) => {
    const req = store.openCursor(range, "next");
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

  const results = [];
  let c = cursor;
  while (c && results.length < pageSize) {
    results.push(c.value);
    c.continue();
    await new Promise((r) => {
      c?.source.transaction?.addEventListener("complete", r);
    });
  }
  return { results, nextCursor: c?.key || null };
}
```

## 6. Schema Migration

```javascript
const MIGRATIONS = {
  1: (db) => {
    db.createObjectStore("items", { keyPath: "id" });
    db.createObjectStore("config", { keyPath: "key" });
  },
  2: (db, tx) => {
    const store = tx.objectStore("items");
    store.createIndex("by_status", "status", { unique: false });
  },
  3: (db) => {
    db.createObjectStore("audit_log", { keyPath: "id", autoIncrement: true });
  },
};

async function migrateDB(name, targetVersion) {
  return openDB(name, targetVersion, (db, ev) => {
    for (let v = ev.oldVersion + 1; v <= targetVersion; v++) {
      if (MIGRATIONS[v]) MIGRATIONS[v](db, ev.target.transaction);
    }
  });
}
```

## 7. Bulk Operations

```javascript
async function bulkPut(items) {
  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  for (const item of items) {
    store.put(item);
  }
  await tx.done;
}

async function getAll(storeName) {
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
```

## 8. Blob / File Storage

```javascript
// Store a File/Blob
async function storeFile(file) {
  const id = crypto.randomUUID();
  const tx = db.transaction("files", "readwrite");
  tx.objectStore("files").put({ id, name: file.name, type: file.type, size: file.size, blob: file });
  await tx.done;
  return id;
}

// Retrieve via File System Access API (modern browsers)
async function saveToDisk(blob, filename) {
  const handle = await window.showSaveFilePicker({ suggestedName: filename });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}
```

## 9. Offline Sync Patterns

### Write-ahead queue

```javascript
async function enqueueSync(action, payload) {
  const tx = db.transaction("sync_queue", "readwrite");
  tx.objectStore("sync_queue").add({
    id: crypto.randomUUID(),
    action,
    payload,
    status: "pending",
    created_at: new Date().toISOString(),
  });
  await tx.done;
}

async function processSyncQueue(apiEndpoint) {
  const tx = db.transaction("sync_queue", "readwrite");
  const store = tx.objectStore("sync_queue");
  const pending = await new Promise((r) => {
    const req = store.getAll();
    req.onsuccess = () => r(req.result);
  });

  for (const item of pending.filter((p) => p.status === "pending")) {
    try {
      await fetch(apiEndpoint, { method: "POST", body: JSON.stringify(item.payload) });
      store.put({ ...item, status: "synced", synced_at: new Date().toISOString() });
    } catch {
      store.put({ ...item, status: "failed", retry_count: (item.retry_count || 0) + 1 });
    }
  }
  await tx.done;
}
```

## 10. Performance Best Practices

1. Use explicit transactions - avoid auto-commit by reusing the same transaction.
2. Keep transactions short - don't await network calls inside a transaction.
3. Use indexes for query performance - avoid full store scans.
4. Use `getAll()` for small result sets, cursors for large ones.
5. Batch writes in a single transaction for bulk operations.
6. Use `IDBKeyRange` for efficient range queries.
7. Close unused databases: `db.close()`.
8. Version migrations must be idempotent and backward-compatible.
9. Consider `opfs` (Origin Private File System) for large binary data.
10. Monitor storage quota via `navigator.storage.estimate()`.

## See also

- [rule-data-sql](../rule-data-sql/SKILL.md) - SQL fundamentals
- [rule-data-postgresql](../rule-data-postgresql/SKILL.md) - PostgreSQL reference
