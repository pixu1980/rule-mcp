---
name: rule-backend-node
description: >-
  Use when scaffolding or hardening a Node.js backend. Covers project structure, required libraries, quality gates, and the patterns that break under real traffic: blocking the event loop, unbounded Promise.all, buffering payloads, in-memory state, backpressure, missing timeouts, and fire-and-forget work.
tags:
  - "backend"
  - "node"
  - "traffic"
  - "load"
  - "concurrency"
  - "promise-all"
  - "backpressure"
  - "timeout"
  - "streaming"
  - "memory"
  - "event-loop"
  - "queue"
  - "packages"
frameworks: [node, api]
metadata:
  author: rule-engineering
  version: "2.1"
---

# Scaffolding Backend Node

## Project profile

This repository is backend-only: it exposes HTTP APIs and implements the business
logic behind them. Whatever the generator emits has to be production-ready from
the first commit — typed everywhere, covered by tests, and runnable unchanged in
local development and in CI.

## Dependency baseline

Start from the standard set. Deviate only when the user explicitly names an
exception.

- HTTP layer and middleware: `express`, `cors`, `helmet`
- Parsing and configuration: `zod`, `dotenv`
- Structured logging: `pino`, plus `pino-http` for request context
- Development toolchain: `typescript`, `tsx`, `vitest`, `supertest`,
  `@biomejs/biome`

## Required layout

Materialize every folder and file below immediately, each with a real
implementation. Empty directories and placeholder bodies are not scaffold.

The tree groups the runtime into five coherent corners — the agent modules, the
provider adapters, the registries that wire them, the tools they call, and the
shared plumbing (`common`/`memory`) — plus the entrypoint, the generators and
the test files:

- `scripts/` — handwritten generators: `create-agent.ts`, `create-tool.ts`
- `src/index.ts` — the one entrypoint for the process
- `src/agent-runner.ts` — drives the provider + tool loop, typed
- `src/logger.ts`, `src/types.ts` — shared logging and shared types
- `src/agents/` — per-agent modules: `echo.agent.ts`, `openai-test.agent.ts`
- `src/common/` — `error.ts` and `middleware/error-handler.ts`
- `src/memory/` — local state via `in-memory.ts`, exposed through `index.ts`
- `src/providers/` — `antigravity.ts`, `claude.ts`, `openai.ts`, `windsurf.ts`,
  with an `index.ts` barrel
- `src/registries/` — `agent-registry.ts`, `provider-registry.ts`,
  `tool-registry.ts`
- `src/tools/` — a sample tool such as `current-time.tool.ts`
- `src/utils/` — the schema bridge `zod-to-json-schema.ts`
- `tests/` — `agentRunner.test.ts`, `memory.test.ts`, `registries.test.ts`
- Root files: `initEnv.ts`, `package.json`, `tsconfig.json`, `.env.example`

## Build order

Walk the stages below in sequence so the skeleton never sits half-formed.

### 1 · Baseline files

- `package.json` carrying the usual quartet (`dev`, `build`, `type-check`)
  and the two generators exposed as `new:agent` and `new:tool`
- `tsconfig.json` in strict mode
- `.env.example` naming every variable the providers and the server read at
  boot
- `initEnv.ts` that validates and normalizes those variables

### 2 · Bootstrap the Express app

- `src/index.ts` remains the only process entry.
- Register the JSON parser, `cors`, and the auth middleware when one is
  configured.
- Mount the API routes and the global error middleware from
  `src/common/middleware/error-handler.ts`.

Reference health route:

```ts
import express from "express";
import type { Request, Response } from "express";

const app = express();

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "backend",
    timestamp: new Date().toISOString(),
  });
});
```

### 3 · Fill in the domain modules

- Create every `src/` folder from the layout above.
- The agent, provider and tool registries must be implemented and reachable
  from the runtime.
- `src/agent-runner.ts` has to run the provider + tool loop in a typed fashion.

### 4 · Ship the generators and the test suite

- `scripts/create-agent.ts` emits new agent modules under `src/agents/`;
  `scripts/create-tool.ts` emits new tool modules under `src/tools/`.
- `tests/` must cover the runner, the memory layer and the registries.

### 5 · Apply the surrounding standards

- Testing and coverage: align with `rule-devops-testing`.
- Types: follow `rule-toolchain-typescript` (strict, no loose casts).
- Containers: follow `rule-devops-docker` for images and base-image policy.
- Prose and records: `rule-styleguide-markdown` for documentation,
  `rule-process-adr` for decisions.

### 6 · Finalize

- Seed data before first start where the app depends on it.
- Verify locally: `pnpm run dev` boots the backend, `pnpm run build` emits, and
  the test suite is green.

## Quality gates

- No empty files, no empty directories, no TODO stubs.
- TypeScript runs in strict mode.
- `pnpm run build` must pass.
- The emitted tree matches the layout this skill defines; nothing is added
  outside it without a reason.

## Local-First Storage Patterns (from rule-backend)

### Pattern: Filesystem as Source of Truth

```javascript
// electron/helpers/_archive.js
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

const DATA_DIR = join(app.getPath("userData"), "data");

export function readCollection(name) {
  const path = join(DATA_DIR, `${name}.json`);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function writeCollection(name, data) {
  const path = join(DATA_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2));
}
```

### Pattern: IndexedDB in Renderer

```javascript
import { get, set, keys, del } from "idb-keyval";

await set("user-preferences", { theme: "dark" });
const prefs = await get("user-preferences");
```

| Storage        | Best for                  | Technology                           |
| -------------- | ------------------------- | ------------------------------------ |
| **IndexedDB**  | Browser/Electron renderer | idb-keyval, Dexie.js                 |
| **Filesystem** | Electron main process     | fs (JSON, SQLite via better-sqlite3) |
| **SQLite**     | Embedded local DB         | better-sqlite3, sql.js               |
| **DuckDB**     | Analytics / OLAP          | duckdb (in-process OLAP)             |

---

## Patterns that break under real traffic: slow endpoints, Promise.all, memory, timeouts

Node handles concurrency well while work stays small, bounded and mostly
asynchronous. Every pattern below is correct for one request and fails when many
arrive together, which is why staging never catches them.

### Synchronous work in a request blocks every other request

JavaScript on the main thread stops that thread from running any other
JavaScript. `readFileSync`, `pbkdf2Sync`, `execSync` are the obvious cases; large
JSON serialization, expensive regexes, sorting big collections and image
metadata are the ones that surprise people.

The symptom rarely points at the cause. Database calls look slow because their
callbacks cannot run. Timers fire late. Health checks time out and the load
balancer marks the instance unhealthy. The event loop is not slow, it is
unavailable.

Measure with realistic input sizes: 2 ms on test data can be several seconds on
a document a user actually uploads. Move real computation to a worker thread or
a separate service ([rule-backend-workers](../rule-backend-workers/SKILL.md)).

### Unbounded Promise.all: slow under load, and a resource attack you wrote yourself

```js
// Bad: concurrency comes from the input, so the caller decides how hard to hit the database
return Promise.all(orders.map((order) => enrich(order)));
```

With five orders this is faster. With five thousand it starts thousands of
operations at once, each one taking a pool connection, a socket, buffers and
downstream queue slots. The pool has twenty connections; the other requests wait
in memory. Ten concurrent users produce ten thousand in-flight operations before
anything applies pressure.

Bound it to what the slowest dependency can take, or batch, or replace N queries
with one join. Concurrency is a resource decision, not a syntax improvement: the
question is not whether these can run in parallel but how many should.

The bound belongs in code, not in a comment. A pool that keeps exactly `limit`
operations in flight and starts the next one as a slot frees:

```js
/**
 * Run tasks with at most `limit` in flight, preserving input order in the result.
 *
 * @param {Array<() => Promise<unknown>>} tasks - Thunks, not promises: a promise
 *   has already started, so an array of promises cannot be throttled.
 * @param {number} limit - Maximum concurrent operations.
 * @returns {Promise<unknown[]>} Results in the order the tasks were given.
 */
async function runWithLimit(tasks, limit) {
  const results = Array.from({ length: tasks.length });
  let next = 0;

  const worker = async () => {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));

  return results;
}
```

Two details decide whether this works. **Tasks are thunks**: an array of promises
is already running, so nothing downstream can throttle it. And the limit comes
from the narrowest dependency in the path, usually the connection pool, not from
a number that looked reasonable.

The failure semantics are `Promise.all`'s: the first rejection rejects the whole
call while the other workers keep going. If partial success is acceptable, have
each task settle rather than throw, and read the outcomes.

### Fan-out at scale: one event, a million deliveries

Sending to one recipient is a function call. Sending to a million is a
different system, and the request that triggers it must not be the thing doing
it. The request writes one job and returns; workers expand it.

Expand in stages rather than in one query. One job per batch of recipients keeps
each unit of work small enough to retry, and small enough that a crash loses
seconds of progress rather than an hour of it.

**The constraint is never your own throughput.** A hundred workers at a hundred
sends a second is ten thousand a second, and the delivery provider will rate
limit long before your fleet is busy. So the rate limit belongs at the worker
layer, matched to what the downstream accepts, not to what the fleet can
produce.

That builds a backlog, and **a backlog is the queue doing its job**. A growing
queue is almost always safer than a saturated dependency: one recovers by
waiting, the other by being restarted. Scale the worker fleet on queue depth,
independently of the servers serving requests, since the two have nothing to do
with each other.

Three failures to design for before the first send:

- **Redelivery.** A worker that sends successfully and dies before acknowledging
  will see the message again. At-least-once is the guarantee you actually have,
  so the send has to be idempotent, keyed on something stable per recipient per
  event. Treat the key like a credential: define it with the rest of the auth
  surface (`rule-backend-security`) so it is single-use where it should be.
- **The poison message.** One recipient whose record makes the worker throw will
  be retried forever and will block progress. Cap the attempts and move it to a
  dead-letter queue that somebody actually reads, with the failure attached.
- **Per-recipient duplication.** Several events can target the same person in a
  minute. Deduplicate on the recipient and a window, not only on the job, or the
  first incident of the day sends five copies of the same alert.

Track delivery as data: accepted, sent, failed, dead-lettered, per event. Without
it, "did it go out" is answered by looking at logs, and the answer arrives after
the question stopped mattering.

### Buffering a whole payload works until several users do it together

A 50 MB upload is fine. Twenty concurrent ones are a gigabyte of raw buffers
before parsing, validating or re-uploading makes copies. No single request
violates its limit and the process still dies.

Memory pressure rarely produces one clean OOM. Garbage collection gets more
frequent and more expensive, latency turns irregular, then the process restarts.
Stream when the work is incremental, and keep input limits anyway: streaming
stops the buffer, it does not make unlimited data free to receive.

The number that matters is not the memory one successful request needs. It is
the memory the concurrency limit allows.

### In-memory state stops being shared the moment you scale

A `Map` of sessions, a rate-limit counter, a webhook dedup set. All correct on
one process. Production runs several, each with its own heap: the user logs in
on one instance and the next request lands on another, a limit of 100 becomes
100 per instance, and a webhook already handled is accepted again.

Restarts erase it too - deployments, crashes, scaling events. Process memory is
for values that are local, temporary and safe to lose. Correctness-critical
shared state needs a store with shared visibility.

### Backpressure, or the slow consumer wins

Streams solve the memory problem only with backpressure. The database produces
rows faster than a mobile connection accepts them; without a rule for slowing
down, the difference accumulates in the process. The endpoint is fine on office
wifi and expensive on real networks.

Use `pipeline`, which coordinates flow and propagates errors. Writing manually,
a `false` from `write` means wait for `drain`. The same applies past streams: a
queue consumer should not accept work faster than it finishes it.

### A request with no timeout is an unbounded claim on capacity

A dependency that accepts the socket and answers very slowly is worse than one
that refuses. The request stays pending and holds memory, socket and context.
One is invisible; hundreds exhaust the pool and file descriptors, and the
failure spreads to handlers that only needed the database.

Set separate limits for connect, headers, body and the whole operation, chosen
from the user journey rather than one global number. Propagate an `AbortSignal`
so an abandoned request releases resources. And note that a timeout does not
stop the remote work - retrying a timed-out mutation duplicates it unless the
API is idempotent.

### Fire-and-forget work disappears with the process

```js
// Bad: the user was told the order succeeded; the email has no owner
sendConfirmationEmail(order).catch(console.error);
res.status(201).json(order);
```

The response got faster and the work lost its guarantee. A deployment can
terminate the instance a millisecond later. Analytics may be safe to lose; a
password-reset email or a financial event is not.

Durable background work is a queue or a transactional outbox: the request
records that the work must happen, a worker retries it, and the response stays
fast without depending on this process staying alive. Workers need idempotency,
a retry limit and a dead-letter path, because a redelivered job is normal and a
poison message must not block every job behind it.

## Packages worth the dependency

Vetted against the project rules: exact versions, pnpm, and a real reason each
one beats the platform.

| Package   | For                                | Note                                                                              |
| --------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| `zod`     | Runtime validation at the boundary | The one that earns its place most often: parse untrusted input into a typed value |
| `pino`    | Structured JSON logging            | Low overhead, child loggers carry request context                                 |
| `p-retry` | Retry with backoff                 | Pair with a timeout and idempotency, never retry blindly                          |
| `execa`   | Child processes                    | Sane promise API, no shell injection by default                                   |
| `tsx`     | Running TypeScript directly        | Development only                                                                  |
| `cheerio` | Server-side HTML parsing           | Only when you actually parse HTML                                                 |

Node covers what used to need a package: `--env-file` replaces `dotenv`,
`node:test` replaces a runner for most projects, `fetch` is global, and
`structuredClone` replaces deep-clone helpers. Check the platform before adding
a dependency ([rule-toolchain-pnpm](../rule-toolchain-pnpm/SKILL.md)).

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-backend](../rule-backend/SKILL.md) - Backend skill index
- [rule-toolchain-project](../rule-toolchain-project/SKILL.md) - Project configuration baseline
- [rule-devops-testing](../rule-devops-testing/SKILL.md) - Testing and coverage
