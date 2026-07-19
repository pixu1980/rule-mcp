## 4. Aggregation Pipeline

### Common Patterns

```javascript
// Pattern 1: Group by + count
db.orders.aggregate([
  { $match: { created_at: { $gte: ISODate("2024-01-01") } } },
  { $group: { _id: "$status", count: { $sum: 1 }, total_revenue: { $sum: "$total" } } },
  { $sort: { count: -1 } }
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
      pipeline: [{ $project: { name: 1, price: 1 } }]
    }
  },
  { $unwind: "$product_details" },
  { $group: { _id: "$_id", items: { $push: "$product_details" }, total: { $first: "$total" } } }
]);

// Pattern 3: Pagination with total count (facet)
db.orders.aggregate([
  { $match: { user_id: ObjectId("...") } },
  {
    $facet: {
      metadata: [{ $count: "total" }],
      data: [
        { $sort: { created_at: -1 } },
        { $skip: 0 },
        { $limit: 20 },
        { $project: { _id: 1, total: 1, status: 1, created_at: 1 } }
      ]
    }
  }
]);
```

### Aggregation Pipeline Stages

| Stage | Purpose | Performance Notes |
|-------|---------|-------------------|
| `$match` | Filter documents | Use first, can use indexes |
| `$sort` | Sort documents | Use index if possible |
| `$project` | Select/transform fields | Reduces pipeline data size |
| `$group` | Group by key | Memory-bound (100MB default) |
| `$limit` / `$skip` | Pagination | Put $match before $skip |
| `$lookup` | JOIN from another collection | Use indexes on foreign collection |
| `$unwind` | Deconstruct array | Can increase document count |
| `$facet` | Multi-pipeline (parallel) | Multiple pipelines in one pass |
| `$bucket` / `$bucketAuto` | Histogram | For reporting/analytics |
| `$merge` | Output to collection | Materialized views |

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
        order_rank: { $rank: {} }
      }
    }
  }
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
    { _id: 2, host: "mongo3:27017", arbiterOnly: true } // arbiter (no data)
  ]
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
  { writeConcern: { w: "majority", j: true, wtimeout: 5000 } }
  // w: "majority" — acknowledged by majority of replicas
  // j: true — written to journal
  // wtimeout: 5000ms — fail after 5 seconds
);

// Read preference
db.getMongo().setReadPref("secondary");          // Read from secondary (analytics)
db.getMongo().setReadPref("primaryPreferred");    // Primary if available
db.getMongo().setReadPref("nearest");             // Lowest latency
```

### Monitoring Replication

```javascript
// Replication lag
rs.printSecondaryReplicationInfo();

// Oplog window
rs.printReplicationInfo();

// Member health
rs.status().members.forEach(m => {
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
sh.shardCollection("myapp.organizations", { name: 1 });    // Ranged sharding

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
    items: [{
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
    }],
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
    timestamps: true,  // createdAt + updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index
orderSchema.index({ status: 1, created_at: -1 });

// Virtual (computed field)
orderSchema.virtual("item_count").get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Pre-save hook
orderSchema.pre("save", function(next) {
  this.total = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  next();
});

// Instance method
orderSchema.methods.canCancel = function() {
  return ["pending", "confirmed"].includes(this.status);
};

// Static method
orderSchema.statics.findPending = function() {
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
const result = await orders.aggregate([
  { $match: { user_id: new ObjectId(userId) } },
  { $sort: { created_at: -1 } },
  { $limit: 20 },
  { $lookup: { from: "products", localField: "items.product_id", foreignField: "_id", as: "products" } }
]).toArray();
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
db.setProfilingLevel(1, { slowms: 100 });  // Log queries > 100ms
db.system.profile.find({ millis: { $gt: 1000 } }).sort({ ts: -1 }).limit(20);

// Current operations
db.currentOp({
  $ownOps: false,
  $all: false,
  active: true,
  secs_running: { $gt: 5 }
});

// Kill slow operation
db.killOp(opid);

// Server status (key metrics)
db.serverStatus().connections;       // Connection pool
db.serverStatus().network;           // Network throughput
db.serverStatus().opcounters;        // Operations per second
db.serverStatus().wiredTiger;        // Cache hit ratio, IO
db.serverStatus().mem;               // Memory usage

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
db.orders.find({ _id: { $gt: lastSeenId } }).sort({ _id: 1 }).limit(20);
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

- [rule-data-sql](../rule-data-sql/SKILL.md) — SQL fundamentals (for comparison)
- [rule-data-postgresql](../rule-data-postgresql/SKILL.md) — PostgreSQL
- [rule-data-mysql](../rule-data-mysql/SKILL.md) — MySQL/MariaDB
- [rule](../rule/SKILL.md) — Central skill index
## Reference

See `references/REFERENCE.md` for detailed reference material — load when you need specific API details, syntax, or advanced examples.
