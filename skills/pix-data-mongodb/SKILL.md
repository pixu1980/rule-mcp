---
name: rule-data-mongodb
description: >-
  Use when working with MongoDB 7+. Covers schema design, CRUD operations, aggregation pipeline, indexing, sharding, replication, and Mongoose patterns.
tags:
  - "mongodb"
  - "mongo"
  - "data"
  - "document-db"
  - "nosql"
  - "aggregation"
  - "replica-set"
  - "sharding"
  - "mongoose"
  - "performance"
frameworks: [all]
---

# rule-data-mongodb — MongoDB 7+ Best Practices & Scripts

## Table of Contents

1. [Schema Design Patterns](#1-schema-design-patterns)
2. [CRUD Scripts](#2-crud-scripts)
3. [Indexing Strategy](#3-indexing-strategy)
4. [Aggregation Pipeline](#4-aggregation-pipeline)
5. [Replica Sets](#5-replica-sets)
6. [Sharding](#6-sharding)
7. [Mongoose/Driver Patterns](#7-mongoosedriver-patterns)
8. [Performance Optimization](#8-performance-optimization)
9. [Backup & Recovery](#9-backup--recovery)
10. [Security](#10-security)

---

## 1. Schema Design Patterns

### Embedding vs Referencing

```javascript
// ✅ EMBED: Data that's ALWAYS accessed together
// One-to-one, One-to-few (≤ 100 embedded docs)
const user = {
  _id: ObjectId(),
  name: "John Doe",
  email: "john@example.com",
  profile: {
    avatar: "https://...",
    bio: "Software engineer",
    preferences: { theme: "dark", notifications: true }
  },
  address: {               // One-to-one: embed
    street: "123 Main St",
    city: "Rome",
    country: "IT"
  },
  recent_orders: [         // One-to-few: embed (max 5)
    { id: 1, total: 100, date: ISODate() },
    { id: 2, total: 250, date: ISODate() }
  ],
  created_at: ISODate()
};

// ✅ REFERENCE: Data accessed independently or unbounded arrays
// One-to-many, Many-to-many
const order = {
  _id: ObjectId(),
  user_id: ObjectId("..."),  // Reference to user
  items: [                   // References to products
    { product_id: ObjectId("..."), quantity: 2, price: 50 },
    { product_id: ObjectId("..."), quantity: 1, price: 100 }
  ],
  total: 200,
  status: "pending",
  created_at: ISODate()
};
```

### Schema Design Decision Matrix

| Relationship | Strategy | Why |
|---|---|---|---|
| One-to-one (profile, settings) | **Embed** | Always read together, single document |
| One-to-few (addresses, recent orders) | **Embed** (array) | Accessed together, bounded (<100) |
| One-to-many (orders, posts) | **Reference** array on "one" side | Unbounded growth, independent access |
| One-to-many (thousands of items) | **Reference** array on "many" side | Document size limit (16MB) |
| Many-to-many (products, tags) | **Reference** arrays on both sides | Flexible, normalized |

### Polymorphic Schema

```javascript
// Single collection with discriminator field
const event = {
  _id: ObjectId(),
  type: "click",           // discriminator: "click" | "pageview" | "purchase"
  user_id: ObjectId(),
  timestamp: ISODate(),
  // Click-specific
  element: "#submit-btn",
  // Pageview-specific
  page: "/checkout",
  // Purchase-specific
  total: 150,
  currency: "EUR"
};
// Index with partialFilterExpression for each type
```

### Time-Series Schema (MongoDB 5+)

```javascript
// MongoDB time-series collection
db.createCollection("sensor_readings", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "seconds"
  }
});

db.sensor_readings.insertOne({
  timestamp: ISODate(),
  metadata: { sensor_id: "sensor_01", type: "temperature" },
  value: 22.5
});

// Query
db.sensor_readings.find({
  timestamp: { $gte: ISODate("2024-01-01"), $lt: ISODate("2024-02-01") },
  "metadata.sensor_id": "sensor_01"
}).sort({ timestamp: 1 });
```

---

## 2. CRUD Scripts

### Create

```javascript
// Insert one
db.users.insertOne({
  name: "John Doe",
  email: "john@example.com",
  roles: ["user"],
  created_at: new Date()
});

// Insert many (batch)
db.orders.insertMany([
  { user_id: ObjectId(), total: 100, status: "pending", items: [], created_at: new Date() },
  { user_id: ObjectId(), total: 250, status: "completed", items: [], created_at: new Date() }
]);

// Insert with ordered:false (continue on error)
db.orders.insertMany([...], { ordered: false });
```

### Read

```javascript
// Find with projection
db.users.find(
  { email: "john@example.com" },
  { name: 1, email: 1, _id: 0 }
);

// Find with operators
db.orders.find({
  status: { $in: ["pending", "processing"] },
  total: { $gte: 100, $lte: 500 },
  created_at: { $gte: ISODate("2024-01-01") }
}).sort({ created_at: -1 }).limit(20);

// Text search (requires text index)
db.articles.find(
  { $text: { $search: "database optimization tips" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } }).limit(10);

// Cursor-based pagination
const page = await db.orders.find(
  { _id: { $gt: ObjectId("...") }, user_id: ObjectId("...") }
).sort({ _id: 1 }).limit(20).toArray();

// Count (use estimatedDocumentCount for large collections)
db.orders.estimatedDocumentCount(); // fast, approximate
db.orders.countDocuments({ status: "pending" }); // slow, exact
```

### Update

```javascript
// Update one (atomic)
db.users.updateOne(
  { email: "john@example.com" },
  { $set: { name: "John Updated", updated_at: new Date() } }
);

// Upsert (insert if not exist)
db.users.updateOne(
  { email: "new@example.com" },
  { $set: { name: "New User", created_at: new Date() } },
  { upsert: true }
);

// Array operations
db.orders.updateOne(
  { _id: ObjectId("...") },
  {
    $push: { items: { product_id: ObjectId("..."), quantity: 1, price: 50 } },
    $inc: { total: 50 },
    $set: { updated_at: new Date() }
  }
);

// Remove from array
db.orders.updateOne(
  { _id: ObjectId("...") },
  { $pull: { items: { product_id: ObjectId("...") } } }
);

// Bulk write
db.users.bulkWrite([
  { updateOne: { filter: { email: "user1@example.com" }, update: { $set: { active: true } } } },
  { updateOne: { filter: { email: "user2@example.com" }, update: { $set: { active: false } } } },
]);
```

### Delete

```javascript
// Delete one
db.orders.deleteOne({ _id: ObjectId("..."), user_id: ObjectId("...") });

// Delete many
db.orders.deleteMany({ status: "cancelled", created_at: { $lt: ISODate("2023-01-01") } });

// Drop collection
db.old_logs.drop();

// TTL index for automatic expiry (MongoDB handles deletion)
db.sessions.createIndex({ created_at: 1 }, { expireAfterSeconds: 86400 }); // 24h
```

---

## 3. Indexing Strategy

### Index Types

```javascript
// Single field
db.users.createIndex({ email: 1 });

// Compound (equality first, sort last)
db.orders.createIndex({ user_id: 1, status: 1, created_at: -1 });

// Multikey (array fields)
db.articles.createIndex({ tags: 1 });

// Text index (for $text search)
db.articles.createIndex({ title: "text", body: "text" }, { weights: { title: 10, body: 5 } });

// Hashed (for hash-based sharding)
db.users.createIndex({ email: 1 }, { unique: true });

// Partial (index only matching docs)
db.orders.createIndex(
  { status: 1, created_at: -1 },
  { partialFilterExpression: { status: "pending" } }
);

// TTL (automatic document expiry)
db.sessions.createIndex({ created_at: 1 }, { expireAfterSeconds: 86400 });

// Wildcard (index unknown fields)
db.users.createIndex({ "metadata.$**": 1 });

// Unique + Partial (conditional uniqueness)
db.organizations.createIndex(
  { name: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "deleted" } } }
);
```

### Index Selection Rules

```
1. Equality fields first in compound index: { user_id: 1, status: 1 }
2. Sort field last in compound index: { status: 1, created_at: -1 }
3. High-selectivity fields first (more unique values)
4. Covered queries: all returned fields in the index
5. Partial indexes are smaller and faster for filtered queries
```

### Index Performance Analysis

```javascript
// Explain query
db.orders.find({ user_id: ObjectId("..."), status: "completed" })
  .sort({ created_at: -1 })
  .limit(20)
  .explain("executionStats");
/*
Look for:
- winningPlan.stage: "IXSCAN" (index scan) — good
- winningPlan.stage: "COLLSCAN" (collection scan) — bad, need index
- totalDocsExamined should equal nReturned
- executionTimeMillis — should be < 100ms for OLTP
*/

// List all indexes with sizes
db.orders.getIndexes();
db.orders.aggregate([
  { $indexStats: {} }
]).forEach(i => printjson(i));

// Drop unused indexes
db.orders.dropIndex("unused_index_name");
```

---

## Reference

Load references/REFERENCE.md for detailed MongoDB patterns (indexing, aggregation, sharding, replica sets, performance, security).
