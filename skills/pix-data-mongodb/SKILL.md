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

# rule-data-mongodb - MongoDB 7+ Best Practices & Scripts

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
    preferences: { theme: "dark", notifications: true },
  },
  address: {
    // One-to-one: embed
    street: "123 Main St",
    city: "Rome",
    country: "IT",
  },
  recent_orders: [
    // One-to-few: embed (max 5)
    { id: 1, total: 100, date: ISODate() },
    { id: 2, total: 250, date: ISODate() },
  ],
  created_at: ISODate(),
};

// ✅ REFERENCE: Data accessed independently or unbounded arrays
// One-to-many, Many-to-many
const order = {
  _id: ObjectId(),
  user_id: ObjectId("..."), // Reference to user
  items: [
    // References to products
    { product_id: ObjectId("..."), quantity: 2, price: 50 },
    { product_id: ObjectId("..."), quantity: 1, price: 100 },
  ],
  total: 200,
  status: "pending",
  created_at: ISODate(),
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
  type: "click", // discriminator: "click" | "pageview" | "purchase"
  user_id: ObjectId(),
  timestamp: ISODate(),
  // Click-specific
  element: "#submit-btn",
  // Pageview-specific
  page: "/checkout",
  // Purchase-specific
  total: 150,
  currency: "EUR",
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
    granularity: "seconds",
  },
});

db.sensor_readings.insertOne({
  timestamp: ISODate(),
  metadata: { sensor_id: "sensor_01", type: "temperature" },
  value: 22.5,
});

// Query
db.sensor_readings
  .find({
    timestamp: { $gte: ISODate("2024-01-01"), $lt: ISODate("2024-02-01") },
    "metadata.sensor_id": "sensor_01",
  })
  .sort({ timestamp: 1 });
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
db.users.find({ email: "john@example.com" }, { name: 1, email: 1, _id: 0 });

// Find with operators
db.orders
  .find({
    status: { $in: ["pending", "processing"] },
    total: { $gte: 100, $lte: 500 },
    created_at: { $gte: ISODate("2024-01-01") },
  })
  .sort({ created_at: -1 })
  .limit(20);

// Text search (requires text index)
db.articles
  .find({ $text: { $search: "database optimization tips" } }, { score: { $meta: "textScore" } })
  .sort({ score: { $meta: "textScore" } })
  .limit(10);

// Cursor-based pagination
const page = await db.orders
  .find({ _id: { $gt: ObjectId("...") }, user_id: ObjectId("...") })
  .sort({ _id: 1 })
  .limit(20)
  .toArray();

// Count (use estimatedDocumentCount for large collections)
db.orders.estimatedDocumentCount(); // fast, approximate
db.orders.countDocuments({ status: "pending" }); // slow, exact
```

### Update

```javascript
// Update one (atomic)
db.users.updateOne({ email: "john@example.com" }, { $set: { name: "John Updated", updated_at: new Date() } });

// Upsert (insert if not exist)
db.users.updateOne({ email: "new@example.com" }, { $set: { name: "New User", created_at: new Date() } }, { upsert: true });

// Array operations
db.orders.updateOne(
  { _id: ObjectId("...") },
  {
    $push: { items: { product_id: ObjectId("..."), quantity: 1, price: 50 } },
    $inc: { total: 50 },
    $set: { updated_at: new Date() },
  },
);

// Remove from array
db.orders.updateOne({ _id: ObjectId("...") }, { $pull: { items: { product_id: ObjectId("...") } } });

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
db.orders.createIndex({ status: 1, created_at: -1 }, { partialFilterExpression: { status: "pending" } });

// TTL (automatic document expiry)
db.sessions.createIndex({ created_at: 1 }, { expireAfterSeconds: 86400 });

// Wildcard (index unknown fields)
db.users.createIndex({ "metadata.$**": 1 });

// Unique + Partial (conditional uniqueness)
db.organizations.createIndex({ name: 1 }, { unique: true, partialFilterExpression: { status: { $ne: "deleted" } } });
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
db.orders
  .find({ user_id: ObjectId("..."), status: "completed" })
  .sort({ created_at: -1 })
  .limit(20)
  .explain("executionStats");
/*
Look for:
- winningPlan.stage: "IXSCAN" (index scan) - good
- winningPlan.stage: "COLLSCAN" (collection scan) - bad, need index
- totalDocsExamined should equal nReturned
- executionTimeMillis - should be < 100ms for OLTP
*/

// List all indexes with sizes
db.orders.getIndexes();
db.orders.aggregate([{ $indexStats: {} }]).forEach((i) => printjson(i));

// Drop unused indexes
db.orders.dropIndex("unused_index_name");
```

---

## 4. Aggregation Pipeline

### Common Patterns

```javascript
// Pattern 1: Group by + count
db.orders.aggregate([
  { $match: { created_at: { $gte: ISODate("2024-01-01") } } },
  { $group: { _id: "$status", count: { $sum: 1 }, total_revenue: { $sum: "$total" } } },
  { $sort: { count: -1 } },
]);

// Pattern 2: Lookup (JOIN)
db.orders.aggregate([
  { $match: { user_id: ObjectId("...") } },
  {
    $lookup: {
      from: "products",
      localField: "items.product_id",
      foreignField: "_id",
      as: "product_details",
      pipeline: [{ $project: { name: 1, price: 1 } }],
    },
  },
  { $unwind: "$product_details" },
  { $group: { _id: "$_id", items: { $push: "$product_details" }, total: { $first: "$total" } } },
]);

// Pattern 3: Pagination with total count (facet)
db.orders.aggregate([
  { $match: { user_id: ObjectId("...") } },
  {
    $facet: {
      metadata: [{ $count: "total" }],
      data: [{ $sort: { created_at: -1 } }, { $skip: 0 }, { $limit: 20 }, { $project: { _id: 1, total: 1, status: 1, created_at: 1 } }],
    },
  },
]);
```

### Aggregation Pipeline Stages

| Stage                     | Purpose                      | Performance Notes                 |
| ------------------------- | ---------------------------- | --------------------------------- |
| `$match`                  | Filter documents             | Use first, can use indexes        |
| `$sort`                   | Sort documents               | Use index if possible             |
| `$project`                | Select/transform fields      | Reduces pipeline data size        |
| `$group`                  | Group by key                 | Memory-bound (100MB default)      |
| `$limit` / `$skip`        | Pagination                   | Put $match before $skip           |
| `$lookup`                 | JOIN from another collection | Use indexes on foreign collection |
| `$unwind`                 | Deconstruct array            | Can increase document count       |
| `$facet`                  | Multi-pipeline (parallel)    | Multiple pipelines in one pass    |
| `$bucket` / `$bucketAuto` | Histogram                    | For reporting/analytics           |
| `$merge`                  | Output to collection         | Materialized views                |

### Window Functions (MongoDB 5+)

```javascript
// Running total
db.orders.aggregate([
  { $match: { user_id: ObjectId("...") } },
  { $sort: { created_at: 1 } },
  {
    $setWindowFields: {
      partitionBy: null,
      sortBy: { created_at: 1 },
      output: {
        running_total: { $sum: "$total", window: { documents: ["unbounded", "current"] } },
        order_rank: { $rank: {} },
      },
    },
  },
]);
```

---

## 5. Replica Sets

### Initialize Replica Set

```javascript
// On each member, start mongod with --replSet rs0

// Connect to primary and initiate
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 2 },
    { _id: 1, host: "mongo2:27017", priority: 1 },
    { _id: 2, host: "mongo3:27017", arbiterOnly: true }, // arbiter (no data)
  ],
});

// Check status
rs.status();
rs.conf();
rs.printReplicationInfo();
```

### Read/Write Concerns

```javascript
// Write concern (acknowledgment level)
db.orders.insertOne(
  { user_id: ObjectId("..."), total: 100 },
  { writeConcern: { w: "majority", j: true, wtimeout: 5000 } },
  // w: "majority" - acknowledged by majority of replicas
  // j: true - written to journal
  // wtimeout: 5000ms - fail after 5 seconds
);

// Read preference
db.getMongo().setReadPref("secondary"); // Read from secondary (analytics)
db.getMongo().setReadPref("primaryPreferred"); // Primary if available
db.getMongo().setReadPref("nearest"); // Lowest latency
```

### Monitoring Replication

```javascript
// Replication lag
rs.printSecondaryReplicationInfo();

// Oplog window
rs.printReplicationInfo();

// Member health
rs.status().members.forEach((m) => {
  print(m.name + ": " + m.stateStr + " (health: " + m.health + ")");
});
```

---

## 6. Sharding

### Enable Sharding

```javascript
// Connect to mongos
sh.enableSharding("myapp");
sh.shardCollection("myapp.orders", { user_id: "hashed" }); // Hashed sharding
// OR
sh.shardCollection("myapp.organizations", { name: 1 }); // Ranged sharding

// Create index to support shard key
db.orders.createIndex({ user_id: 1 });

// Add shard
sh.addShard("shard1.example.com:27017");
sh.addShard("shard2.example.com:27017");

// Check sharding status
sh.status();
db.orders.getShardDistribution();
```

### Shard Key Selection

```
✅ GOOD shard keys:
  - Hashed _id (best distribution)
  - High-cardinality fields (user_id, email)
  - Compound keys with high-cardinality prefix
  - Monotonically increasing keys → use HASHED

❌ BAD shard keys:
  - Boolean / low-cardinality fields
  - Monotonically increasing keys without HASHED (all writes to last shard)
  - Fields that don't appear in most queries

Rule: shard key should match your most common query pattern
```

---

## 7. Mongoose/Driver Patterns

### Mongoose Schema

```javascript
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [
      {
        product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    shipping_address: {
      street: String,
      city: String,
      country: String,
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true, // createdAt + updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index
orderSchema.index({ status: 1, created_at: -1 });

// Virtual (computed field)
orderSchema.virtual("item_count").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Pre-save hook
orderSchema.pre("save", function (next) {
  this.total = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  next();
});

// Instance method
orderSchema.methods.canCancel = function () {
  return ["pending", "confirmed"].includes(this.status);
};

// Static method
orderSchema.statics.findPending = function () {
  return this.find({ status: "pending" }).sort({ created_at: -1 });
};

export const Order = mongoose.model("Order", orderSchema);
```

### Native Driver (mongodb)

```javascript
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI, {
  maxPoolSize: 100,
  minPoolSize: 10,
  maxIdleTimeMS: 60000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000,
});

await client.connect();
const db = client.db("myapp");
const orders = db.collection("orders");

// Using aggregation
const result = await orders
  .aggregate([
    { $match: { user_id: new ObjectId(userId) } },
    { $sort: { created_at: -1 } },
    { $limit: 20 },
    { $lookup: { from: "products", localField: "items.product_id", foreignField: "_id", as: "products" } },
  ])
  .toArray();
```

---

## 8. Performance Optimization

### WiredTiger Configuration

```javascript
// mongod.conf
storage:
  dbPath: /data/db
  wiredTiger:
    engineConfig:
      cacheSizeGB: 10           # 60% of RAM minus 1GB
      statisticsLogDelaySecs: 0
    collectionConfig:
      blockCompressor: snappy   # snappy (balance), zstd (better ratio), none (fastest)
    indexConfig:
      prefixCompression: true
```

### Performance Monitoring

```javascript
// Slow query profiler
db.setProfilingLevel(1, { slowms: 100 }); // Log queries > 100ms
db.system.profile
  .find({ millis: { $gt: 1000 } })
  .sort({ ts: -1 })
  .limit(20);

// Current operations
db.currentOp({
  $ownOps: false,
  $all: false,
  active: true,
  secs_running: { $gt: 5 },
});

// Kill slow operation
db.killOp(opid);

// Server status (key metrics)
db.serverStatus().connections; // Connection pool
db.serverStatus().network; // Network throughput
db.serverStatus().opcounters; // Operations per second
db.serverStatus().wiredTiger; // Cache hit ratio, IO
db.serverStatus().mem; // Memory usage

// Collection stats
db.orders.stats();
```

### Common Performance Issues

```javascript
// ❌ BAD: Unindexed query
db.orders.find({ status: "pending" }).sort({ created_at: -1 });
// ✅ FIX: Add compound index
db.orders.createIndex({ status: 1, created_at: -1 });

// ❌ BAD: Massive $in array
db.orders.find({ user_id: { $in: thousandsOfIds } });
// ✅ FIX: Process in batches of 100

// ❌ BAD: Returning too many fields
db.orders.find({ user_id: userId }).toArray();
// ✅ FIX: Add projection
db.orders.find({ user_id: userId }, { _id: 1, total: 1, status: 1 }).toArray();

// ❌ BAD: Negative skip (cursor-based is better)
db.orders.find().sort({ _id: 1 }).skip(10000).limit(20);
// ✅ FIX: Use range query
db.orders
  .find({ _id: { $gt: lastSeenId } })
  .sort({ _id: 1 })
  .limit(20);
```

---

## 9. Backup & Recovery

```bash
# mongodump (logical backup)
mongodump --uri="mongodb://user:pass@localhost:27017/myapp" \
  --out=/backup/mongo/$(date +%Y%m%d)

# With gzip compression
mongodump --uri="mongodb://localhost:27017/myapp" \
  --archive=/backup/mongo/$(date +%Y%m%d).gz --gzip

# mongorestore
mongorestore --uri="mongodb://localhost:27017/myapp" \
  /backup/mongo/20240115/dump

# From archive
mongorestore --archive=/backup/mongo/20240115.gz --gzip \
  --nsInclude="myapp.*"

# mongodump specific collection
mongodump --uri="mongodb://localhost:27017/myapp" \
  --collection=orders --out=/backup/mongo/orders_backup

# Atlas backup (automated)
# https://cloud.mongodb.com → Backup → Schedule
```

---

## 10. Security

```javascript
// Create application user
use myapp;
db.createUser({
  user: "app_user",
  pwd: "strong_password",
  roles: [{ role: "readWrite", db: "myapp" }]
});

// Create read-only user for analytics
db.createUser({
  user: "readonly",
  pwd: "password",
  roles: [{ role: "read", db: "myapp" }]
});

// Enable authentication in mongod.conf
// security:
//   authorization: enabled

// TLS/SSL
// net:
//   tls:
//     mode: requireTLS
//     certificateKeyFile: /etc/ssl/mongodb.pem
//     CAFile: /etc/ssl/ca.pem

// Field level encryption (MongoDB 4.2+)
// Use mongosh or drivers with automatic encryption enabled

// Connection string with TLS
// mongodb://user:pass@host:27017/myapp?tls=true&tlsCAFile=/etc/ssl/ca.pem
```

## See also

- [rule-data-sql](../rule-data-sql/SKILL.md) - SQL fundamentals (for comparison)
- [rule-data-postgresql](../rule-data-postgresql/SKILL.md) - PostgreSQL
- [rule-data-mysql](../rule-data-mysql/SKILL.md) - MySQL/MariaDB
- [rule](../rule/SKILL.md) - Central skill index
