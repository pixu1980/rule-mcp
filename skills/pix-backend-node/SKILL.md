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
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "2.0"
---

# Scaffolding Backend Node

## Project type

Create a backend-only repository for REST APIs and business logic services.
The generated project must be production-ready, typed, testable, and runnable locally and in CI.

## Required main libraries

Use these libraries unless explicitly overridden by user requirements:

- Runtime and API:
  - `express`
  - `cors`
  - `helmet`
- Validation and configuration:
  - `zod`
  - `dotenv`
- Logging:
  - `pino`
  - `pino-http`
- Tooling and DX:
  - `typescript`
  - `tsx`
  - `vitest`
  - `supertest`
  - `@biomejs/biome`

## Mandatory folder structure

Create and immediately populate all folders with real files:

```text
project-root/
├── scripts/
│   ├── create-agent.ts
│   └── create-tool.ts
├── src/
│   ├── agent-runner.ts
│   ├── index.ts
│   ├── logger.ts
│   ├── types.ts
│   ├── agents/
│   │   ├── echo.agent.ts
│   │   └── openai-test.agent.ts
│   ├── common/
│   │   ├── error.ts
│   │   └── middleware/
│   │       └── error-handler.ts
│   ├── memory/
│   │   ├── in-memory.ts
│   │   └── index.ts
│   ├── providers/
│   │   ├── antigravity.ts
│   │   ├── claude.ts
│   │   ├── openai.ts
│   │   ├── windsurf.ts
│   │   └── index.ts
│   ├── registries/
│   │   ├── agent-registry.ts
│   │   ├── provider-registry.ts
│   │   └── tool-registry.ts
│   ├── tools/
│   │   └── current-time.tool.ts
│   └── utils/
│       └── zod-to-json-schema.ts
├── tests/
│   ├── agentRunner.test.ts
│   ├── memory.test.ts
│   └── registries.test.ts
├── initEnv.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## Step-by-step scaffolding instructions

### Step 1 - Generate baseline configuration

Create:

- `package.json` with scripts aligned to `apps/backend` style:
  - `dev`, `build`, `type-check`, `new:agent`, `new:tool`
- `tsconfig.json`
- `.env.example` with runtime variables for providers and server startup
- `initEnv.ts` to validate and normalize env variables

### Step 2 - Generate Express bootstrap files

- `src/index.ts` must be the single backend entrypoint.
- Register JSON parser, auth middleware (if configured), and `cors`.
- Register API routes and global error middleware from `src/common/middleware/error-handler.ts`.

### Step 3 - Generate mandatory backend modules

- Generate all folders under `src/` listed in the mandatory structure.
- Ensure registries (`agent`, `provider`, `tool`) are implemented and wired in the runtime.
- Ensure `src/agent-runner.ts` executes provider + tool loop in a typed way.

Example (`src/index.ts` health route):

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

### Step 4 - Generate mandatory scripts and tests

- Create `scripts/` folder with `create-agent.ts` and `create-tool.ts` scripts copied from `assets/templates/scripts/` of this skill.
- `scripts/create-agent.ts` must generate new agent module files under `src/agents`.
- `scripts/create-tool.ts` must generate new tool module files under `src/tools`.
- Generate tests under `tests/` for runner, memory, and registries.

### Step 5 - Apply standards

- Testing guardrails: use `testing-standards` rule
- Type safety: use `typescript` rule
- Docker: use `docker-standards` and `docker` skills
- Docs: use `documentation` rule and `documentation` skill

### Step 6 - Finalize

- Generate `.gitlab-ci.yml` using `gitlab-ci` skill
- Run seed before first start
- Verify tests and build

### Step 7 - Final validation

- Verify backend starts with `pnpm run dev`
- Verify TypeScript build with `pnpm run build`
- Verify tests pass

## Quality gates

- Never generate empty files or empty directories.
- Never leave TODO placeholders.
- TypeScript strict mode must be enabled.
- `pnpm run build` must pass.
- Generated structure must stay aligned with `apps/backend`.

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
  event. See
  [rule-backend-api-design](../rule-backend-api-design/SKILL.md) for the
  key and its lifetime.
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
