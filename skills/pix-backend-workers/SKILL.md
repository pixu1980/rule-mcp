---
name: rule-backend-workers
description: >-
  Offload CPU-bound JavaScript to worker_threads, pools, and cluster. Covers the event loop model, libuv thread pool, piscina, clustering, and the decision framework for async vs workers vs cluster.
tags:
  - "backend"
  - "node"
  - "concurrency"
  - "performance"
frameworks: [node, worker-threads]
---

# rule-backend-workers - Node.js Concurrency & Worker Threads

This skill helps you decide **when and how** to split CPU-bound JavaScript off the main thread in Node.js backends. It covers the event loop mental model, `worker_threads`, worker pools (`piscina`), and `cluster`.

---

## The Core Model: One JS Thread, an Event Loop, and libuv

Node.js executes your **JavaScript on a single thread**, driven by the event loop. Concurrency comes from **outsourcing the waiting** - libuv hands blocking I/O to a background thread pool - not from running your JS in parallel.

| What                         | Where it runs                           | Parallel?              |
| ---------------------------- | --------------------------------------- | ---------------------- |
| Your JavaScript              | Single thread (event loop)              | ❌ No - one call stack |
| fs, dns.lookup, crypto, zlib | libuv thread pool (default 4, max 1024) | ✅ Yes (C-level)       |
| Network sockets              | OS kernel (epoll/kqueue/IOCP)           | ✅ Yes (OS-level)      |

> **Myth**: "Node.js is single-threaded." Your JS runs on one thread; the Node **process** uses several. The distinction is the whole point.

### Concurrency vs Parallelism

- **Concurrency** = multiple tasks make progress over the same period by interleaving (event loop)
- **Parallelism** = multiple tasks execute at the same instant on separate cores (worker threads, cluster)

> Concurrency solves **waiting** problems (I/O). Parallelism solves **computing** problems (CPU). Reaching for the wrong one is the root cause of most Node performance mistakes.

---

## The Event Loop's Six Phases

```
   ┌───────────────────────────┐
┌─>│           timers          │  setTimeout / setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  deferred system callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  internal only
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  I/O callbacks; blocks here if idle
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │  socket.on('close', ...)
   └───────────────────────────┘
```

### Microtasks Are NOT a Phase

Three-tier priority: **process.nextTick → promise microtasks → macrotasks** (timers, I/O, setImmediate).

```js
// Run inside an I/O callback - order is deterministic
const fs = require("node:fs");

fs.readFile(__filename, () => {
  setTimeout(() => console.log("1: setTimeout(0)"), 0);
  setImmediate(() => console.log("2: setImmediate"));
  Promise.resolve().then(() => console.log("3: promise"));
  process.nextTick(() => console.log("4: nextTick"));
});
// Prints: 4, 3, 2, 1
```

> `setImmediate()` always executes before a timer when both are scheduled within an I/O cycle. At the top level, the order is non-deterministic - don't rely on it outside an I/O callback.

---

## The libuv Thread Pool

| Property      | Value                                                  |
| ------------- | ------------------------------------------------------ |
| Default size  | 4 threads                                              |
| Maximum size  | 1024 (`UV_THREADPOOL_SIZE`)                            |
| Preallocation | On first use - must set env var **before** Node starts |

### What Uses It

- ✅ `fs` APIs (except watchers and sync variants)
- ✅ `dns.lookup()` (calls `getaddrinfo`)
- ✅ `crypto.pbkdf2()`, `crypto.scrypt()`, `crypto.randomBytes()`, `crypto.generateKeyPair()`
- ✅ `zlib` compression

### What Does NOT Use It

- ❌ **Network I/O** - handled by OS polling (epoll/kqueue/IOCP), surfaces in poll phase
- ❌ `dns.resolve*()` - uses c-ares, bypasses the pool
- ❌ **Your JavaScript** - the pool runs C-level operations, never your JS

```bash
# Set before Node starts - the pool is preallocated on first use.
UV_THREADPOOL_SIZE=8 node server.js
```

> **Myth**: "Increase `UV_THREADPOOL_SIZE` to speed up CPU work." It speeds up concurrent I/O, **never** CPU-bound JavaScript. For CPU work you need a worker thread.

---

## Worker Threads: Real Parallelism for CPU-Bound JS

Worker threads run JavaScript **in parallel** on separate threads. Each worker is a **separate V8 isolate** with its own event loop and libuv loop - that's why workers can't share ordinary objects and must communicate by message passing.

> **Myth**: "Workers are just OS threads." Each is a full V8 isolate + event loop + libuv loop - no shared globals, no shared closure scope.

### When to Use Workers

| Scenario                       | Tool                                                           |
| ------------------------------ | -------------------------------------------------------------- |
| I/O-bound (network, DB, files) | `async/await` - Node's built-in async I/O is already efficient |
| CPU-bound JavaScript           | `worker_threads` - offload computation off the main thread     |
| Already-async crypto/fs/zlib   | ❌ Do NOT wrap in a worker - already runs on libuv pool        |
| High-frequency worker creation | Worker **pool** (piscina) - reuse, don't recreate              |

### Basic Pattern

```js
// main.js
const { Worker } = require("node:worker_threads");

const worker = new Worker("./fib-worker.js", { workerData: { n: 42 } });
worker.on("message", (result) => console.log("fib(42) =", result));
worker.on("error", (err) => console.error(err));
```

```js
// fib-worker.js
const { parentPort, workerData } = require("node:worker_threads");

function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

parentPort.postMessage(fib(workerData.n));
```

### Single-File Worker with isMainThread

```js
// fib.js - same file, two roles
const { isMainThread, parentPort, workerData } = require("node:worker_threads");

function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

if (isMainThread) {
  // Main: spawn workers
  const { Worker } = require("node:worker_threads");
  const w = new Worker(__filename, { workerData: { n: 42 } });
  w.on("message", console.log);
} else {
  // Worker: compute
  parentPort.postMessage(fib(workerData.n));
}
```

### Message Passing & Isolation

Data through `workerData` or `postMessage()` is **deep-copied** via the HTML structured clone algorithm - functions, class prototypes, and live references don't survive.

The only way to share memory:

```js
// SharedArrayBuffer - read/write from both threads
const shared = new SharedArrayBuffer(1024);
const view = new Int32Array(shared);

// Transferring an ArrayBuffer - moves ownership (zero-copy)
worker.postMessage(buffer, [buffer]);
// buffer is now empty in the sender
```

---

## Worker Pools with Piscina

Spawning a `Worker` for every request is wasteful. Use a **pool**.

```bash
pnpm add piscina
```

```js
// server-pooled.js
const express = require("express");
const Piscina = require("piscina");
const path = require("node:path");

const pool = new Piscina({
  filename: path.resolve(__dirname, "fib-task.js"),
  minThreads: 2,
  maxThreads: 4,
});

const app = express();

app.get("/report", async (req, res) => {
  const value = await pool.run({ n: 45 }); // runs on a worker; loop stays free
  res.json({ value });
});

app.get("/health", (req, res) => res.send("ok"));

app.listen(3000);
```

```js
// fib-task.js
module.exports = ({ n }) => {
  const fib = (x) => (x < 2 ? x : fib(x - 1) + fib(x - 2));
  return fib(n);
};
```

> ✅ `/health` answers immediately while `fib(45)` computes in the background.

### Piscina Config Reference

```js
const pool = new Piscina({
  filename: path.resolve(__dirname, "task.js"),
  minThreads: Math.max(1, Math.floor(os.cpus().length / 2)),
  maxThreads: os.cpus().length - 1, // leave one core for the main thread
  idleTimeout: 30000, // kill idle workers after 30s
  maxQueue: 100, // reject when queue is full
});
```

---

## Clustering: Scaling I/O Across Cores

Cluster forks **multiple processes** (not threads), each with its own event loop and memory, sharing a listening socket.

|          | Worker Threads             | Cluster                             |
| -------- | -------------------------- | ----------------------------------- |
| Unit     | Thread within one process  | Separate process                    |
| Memory   | SharedArrayBuffer possible | Fully isolated (IPC only)           |
| Use case | CPU-bound JS offloading    | Scaling I/O-bound load across cores |
| Overhead | Lower (shared process)     | Higher (process per core)           |

```js
// cluster-server.js
const cluster = require("node:cluster");
const http = require("node:http");
const os = require("node:os");

if (cluster.isPrimary) {
  // Fork one worker per CPU core
  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died - restarting`);
    cluster.fork();
  });
} else {
  // Workers share the same port
  http
    .createServer((req, res) => {
      res.writeHead(200);
      res.end(`Handled by ${process.pid}\n`);
    })
    .listen(3000);
}
```

> High-throughput services often combine both: cluster (or container replicas) to span cores + a worker pool inside each process for CPU spikes.

---

## The Blocked Event Loop: Detection & Fix

### The Failure Mode

```js
// ❌ server-blocking.js - /health stalls while fib runs
app.get("/report", (req, res) => {
  res.json({ value: fib(45) }); // blocks the event loop for seconds
});
app.get("/health", (req, res) => res.send("ok"));
```

**Production signature**: many concurrent users stall at the same wall-clock instant - not one user's bad network.

### Detection

```js
const { monitorEventLoopDelay } = require("node:perf_hooks");
const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval(() => {
  console.log({
    p50: histogram.percentile(50) / 1e6,
    p99: histogram.percentile(99) / 1e6, // high p99 = loop saturated
    max: histogram.max / 1e6,
  });
  histogram.reset();
}, 5000);
```

---

## Decision Framework

```
"Is my endpoint slow?"
         │
   ┌─────┴─────┐
   │           │
  CPU?       I/O?
   │           │
   ▼           ▼
Worker    async/await
Thread    (already fast)
  or
piscina
 pool
```

### Quick Rules

| Situation                                    | Solution                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| I/O-bound (network, DB, files)               | `async/await` - the thread pool + OS already give you concurrency                                         |
| Route does heavy sync computation            | Offload to **worker thread** behind a **pool** (piscina)                                                  |
| Saturating one core under concurrent traffic | **Cluster** across cores (or multiple container replicas)                                                 |
| Tempted to bump `UV_THREADPOOL_SIZE`         | Only if I/O-bound on pool-backed ops (lots of concurrent fs/crypto). Will **never** speed up CPU-bound JS |
| Already-async crypto, fs, zlib               | ❌ Don't wrap in a worker - already runs on libuv pool                                                    |

### Tool Comparison

| Tool                         | Runs JS in parallel? | Shares memory?        | Best for                             | Main cost                          |
| ---------------------------- | -------------------- | --------------------- | ------------------------------------ | ---------------------------------- |
| `async/await` + event loop   | No                   | N/A (one thread)      | I/O-bound (network, DB, files)       | Blocks if you do CPU work          |
| libuv thread pool            | No (runs C, not JS)  | N/A                   | Concurrent fs/dns.lookup/crypto/zlib | Fixed size; not for your JS        |
| Worker threads (+ pool)      | **Yes**              | Via SharedArrayBuffer | CPU-bound JavaScript                 | Startup + structured-clone copying |
| Cluster / multiple processes | **Yes**              | No (IPC only)         | Scaling I/O-bound across cores       | Process overhead; no shared state  |

---

## Guards & Best Practices

### Worker Threads

- ✅ Use a **pool** (piscina) - never spawn per-request
- ✅ Workers for **CPU-bound synchronous** JS only
- ✅ `minThreads` + `maxThreads` tuned to available cores
- ✅ Handle `worker.on('error')` - unhandled errors crash the process
- ❌ Don't wrap already-async `fs`/`crypto`/`zlib` in a worker
- ❌ Don't pass functions or class instances via `postMessage` - structured clone drops them

### Main Thread

- ✅ Keep the event loop free - no synchronous CPU work in request handlers
- ✅ `monitorEventLoopDelay` for production observability
- ✅ `UV_THREADPOOL_SIZE` set before Node starts, not mutated at runtime

### Cluster

- ✅ Fork one worker per CPU core
- ✅ Handle `exit` event - restart dead workers
- ✅ Use a process manager (PM2) or container replicas in production

---

## Quick Reference

```
┌──────────────────────────────────────────────────────────────────┐
│  rule-backend-workers - Node.js Concurrency & Workers             │
│                                                                  │
│  Event loop:  6 phases, microtasks drain between macrotasks     │
│  libuv pool:  4 threads (default), max 1024, C-level only       │
│  Workers:     Separate V8 isolate + event loop, CPU-bound JS    │
│  Pool:        piscina - reuse workers, tune to CPU count        │
│  Cluster:     Fork processes, share socket, scale I/O           │
│                                                                  │
│  Decision:                                                       │
│   I/O-bound    → async/await (already fast)                     │
│   CPU-bound    → worker_threads + piscina pool                  │
│   Core-satur.  → cluster or container replicas                  │
│   Pool tuning  → UV_THREADPOOL_SIZE (I/O only, never CPU)      │
│                                                                  │
│  Detect:  monitorEventLoopDelay → high p99 = loop saturated     │
└──────────────────────────────────────────────────────────────────┘
```

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-backend](../rule-backend/SKILL.md) - Backend skill index
- [rule-frontend-workers](../rule-frontend-workers/SKILL.md) - Browser Web Workers skill
- [Node.js worker_threads docs](https://nodejs.org/api/worker_threads.html)
- [Piscina GitHub](https://github.com/piscinajs/piscina)
