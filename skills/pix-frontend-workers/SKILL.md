---
name: rule-frontend-workers
description: >-
  Use when browser JavaScript blocks the main thread. Covers Web Workers, worker pools, transferables, SharedArrayBuffer, OffscreenCanvas, scheduler.yield, and INP/LoAF measurement.
tags:
  - "frontend"
  - "performance"
  - "workers"
  - "concurrency"
  - "web-worker"
  - "offscreen-canvas"
  - "inp"
frameworks: [all]
---

# rule-frontend-workers - Off-Main-Thread JavaScript

Framework-neutral skill for moving browser work off the main thread.
Applies on top of any framework skill (React, Vue, Svelte, Angular, Astro, vanilla).

Runnable reference implementation: [examples/src/workers/index.js](examples/src/workers/index.js).
Protocol and anti-pattern details: [patterns.md](patterns.md).

## When to activate

- A click, keypress, or scroll freezes the UI
- `INP` is above 200 ms, or `blockingDuration` shows long animation frames
- Heavy synchronous JavaScript: parsing, diffing, compressing, encoding, crypto,
  image or audio processing, search indexing, large-array transforms, WASM calls
- Canvas or WebGL rendering competes with UI updates
- A third-party script dominates the main thread

Do **not** activate for: network waiting, `IndexedDB` reads, `fetch` of small
payloads, or anything already asynchronous. Those do not run on the main thread
in the first place - see [Diagnose before offloading](#diagnose-before-offloading).

## Mental model

The browser gives a page **one main thread**. It runs your JavaScript, style,
layout, paint, and event dispatch. Concurrency for I/O comes from delegation:
`fetch`, `IndexedDB`, and timers are handed to the browser's own subsystems and
surface back as tasks. Nothing in your JavaScript runs in parallel there - there
is exactly one call stack.

A **Web Worker** is a different thing: a separate JavaScript realm with its own
global scope (`self`, a `DedicatedWorkerGlobalScope`), its own event loop, and no
DOM. That isolation is why workers cannot share ordinary objects with the page and
must communicate by message passing.

| Layer                          | Runs your JS in parallel? | Shares memory?                         | Best for                                         | Cost                                                      |
| ------------------------------ | ------------------------- | -------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| `async`/`await` on main thread | No                        | N/A (one thread)                       | Network, IndexedDB, timers - anything that waits | Blocks everything if you compute instead of wait          |
| `scheduler.yield()` / chunking | No                        | N/A                                    | Main-thread work that must touch the DOM         | Total time grows; only responsiveness improves            |
| Dedicated Worker (+ pool)      | Yes                       | Only via `SharedArrayBuffer`           | CPU-bound JavaScript and WASM                    | Startup + structured-clone copying                        |
| `SharedWorker`                 | Yes                       | Between same-origin tabs, via messages | One shared connection/cache across tabs          | Debugging, lifetime, no Android WebView                   |
| `OffscreenCanvas` in a worker  | Yes                       | Canvas is transferred                  | Canvas/WebGL rendering                           | Canvas cannot be touched from the page afterwards         |
| Service Worker                 | Yes                       | No                                     | Network interception, caching, offline           | Wrong tool for computation - it can be killed at any time |

The Node.js analog is exact enough to be useful: main thread ≈ Node's event
loop, Web Worker ≈ `worker_threads`, worker pool ≈ `piscina`. Browsers have no
`cluster` equivalent, and there is no browser knob resembling
`UV_THREADPOOL_SIZE`.

## Diagnose before offloading

Offloading the wrong thing to a background thread costs a worker, a clone, and a
round trip, and improves nothing. Establish which of the two failure modes you
have before writing any worker code.

| Symptom                                     | Bottleneck                   | Fix                                                                   |
| ------------------------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| Spinner spins, page still scrolls and types | Waiting on the network       | Fewer round trips, smaller payload, streaming, caching. Not a worker. |
| Page frozen: no scroll, no hover, no caret  | Computing on the main thread | Move it to a background thread, or chunk and yield                    |
| Frozen only while a list renders            | DOM volume                   | Virtualise the list; a worker cannot touch the DOM                    |
| Frozen right after a third-party tag loads  | Someone else's script        | Remove, defer, or move it server-side                                 |

Confirm with the Performance panel: a solid yellow block of scripting is
CPU-bound and belongs in a worker; a flat gap followed by a short burst is
waiting, and no amount of parallelism will shorten it. Record the LoAF
`blockingDuration` now so you have a before number.

## Core rules

1. **Diagnose before offloading.** Confirm the task is CPU-bound, not waiting.
   A worker never speeds up a slow network.
2. **Never offload work that is already async.** Wrapping `fetch` or
   `IndexedDB` in a worker adds a hop and saves nothing - unless you also move
   the parsing, the transform, or the script's own parse/compile cost.
3. **Pool workers, never spawn per task.** Startup and script compilation are
   paid on every `new Worker()`.
4. **Worker code is pure.** Task modules take data and return data. No DOM,
   no `window`, no framework imports.
5. **Transfer, don't copy, for binary.** `ArrayBuffer`, `ImageBitmap`,
   `OffscreenCanvas`, `MessagePort`, and streams are transferable.
6. **One request/response envelope with an id.** Bare `postMessage` payloads do
   not correlate; concurrent calls will cross wires.
7. **Errors must cross the boundary.** `Error` survives structured clone, but
   an uncaught throw inside a worker only fires `onerror` - reject the pending
   task explicitly.
8. **Every worker has an owner that terminates it.** No orphaned workers on
   route change or component unmount.
9. **`SharedArrayBuffer` requires cross-origin isolation.** Check
   `crossOriginIsolated` and ship a fallback.
10. **Measure the result.** LoAF `blockingDuration` and field INP before/after,
    not a stopwatch feeling.

## Creating a worker

Use module workers and the `new URL(..., import.meta.url)` form. Every modern
bundler (Vite, Rspack, webpack 5, Parcel) statically detects that exact shape and
emits a separate chunk; a plain string path does not survive bundling.

```js
// Correct - bundler-resolvable, ESM inside the worker
const worker = new Worker(new URL("./_pool-worker.js", import.meta.url), {
  type: "module",
  name: "rule-pool-0",
});
```

Constraints that bite:

- `new URL()` must appear **inline** in the `new Worker()` call, and the options
  object must be static literals. Hoisting the URL into a variable breaks
  detection in Vite and webpack.
- Module workers (`type: "module"`) are supported by every current evergreen
  browser; Firefox shipped them last, in 2023. Classic workers plus
  `importScripts()` are only needed for legacy targets.
- The worker script must be same-origin. Cross-origin worker code needs a
  `blob:` shim, which then **inherits the page's CSP** instead of getting its own.
- Vite also accepts `import Worker from "./worker.js?worker"` and
  `?sharedworker`, `?worker&inline`, `?worker&url`. Prefer the standard form so
  the code stays portable.
- Workers need a server. A page opened over `file://` cannot create one.
- Feature-detect only where you have a real fallback: `if (globalThis.Worker)`.
  Every target browser has had workers since 2015, so an absent `Worker` means a
  policy block, not an old browser.

### Loading libraries inside a worker

A module worker uses plain `import`. Classic workers use `importScripts()`,
which fetches in any order but **executes in the listed order** and blocks until
every script has loaded:

```js
// classic worker only - legacy targets
importScripts("lib1.js", "lib2.js");
```

### Inline workers, and why to avoid them

A worker can be built from a string at runtime:

```js
const source = `self.onmessage = ({ data }) => self.postMessage(compute(data));`;
const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
const worker = new Worker(url);

URL.revokeObjectURL(url); // safe once the worker exists; leaks otherwise
```

Reach for this only for a genuinely dynamic worker body. The costs are real: a
`blob:` worker inherits the document's CSP instead of getting its own, has no
stable source URL for breakpoints or stack traces, and defeats bundler chunking.
Serializing an existing function with `fn.toString()` is worse still - the
function loses its closure, so anything it captured is silently undefined inside
the worker.

## Message protocol

Structured clone is what crosses the boundary. It copies deeply and drops
everything that is not data: functions, DOM nodes, class prototypes, getters and
setters, and property descriptors. `Date`, `Map`, `Set`, `RegExp` (minus
`lastIndex`), `Error`, `Blob`, `File`, `ImageData`, and typed arrays all survive.
Anything else throws `DataCloneError`.

Send a tagged envelope, never a raw value:

```js
// main → worker
{ id: 17, task: "parseCsv", payload: { text } }

// worker → main (success)
{ id: 17, ok: true, result: [...] }

// worker → main (failure)
{ id: 17, ok: false, error: { name: "TypeError", message: "...", stack: "..." } }
```

The pending-request map lives on the main thread and is keyed by `id`. See
[patterns.md](patterns.md) for the full envelope contract, cancellation, and
progress events.

## Worker pool

Spawn one worker per logical core minus one, capped, and reuse them.

```js
const size = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
```

`navigator.hardwareConcurrency` is a hint, not a guarantee: browsers clamp it for
fingerprinting reasons, and it says nothing about how loaded those cores are.
Cap it - more workers than useful work means more memory and more clone traffic.

The reference pool in [examples/src/workers/_worker-pool.js](examples/src/workers/_worker-pool.js)
implements: lazy spawn, idle/busy tracking, FIFO queue, per-task
`AbortSignal`, transferables, error propagation, and `dispose()`.

The pool takes a **factory**, not a URL, so the detectable literal stays at the
call site:

```js
import { WorkerPool } from "./workers/index.js";

const pool = new WorkerPool(() => new Worker(new URL("./_pool-worker.js", import.meta.url), { type: "module", name: "rule-pool" }));

const rows = await pool.run("parseCsv", { text }, { signal });

pool.dispose(); // on teardown
```

Application code should not see the pool at all - import `runTask` from the
barrel, which owns the singleton and falls back to running the same task inline
when `Worker` is missing (server rendering).

For third-party alternatives, `comlink` (~1.1 kB brotli) replaces the envelope
with an ES-Proxy RPC: `expose()` in the worker, `wrap()` on the page, every call
returns a promise. It still uses structured clone, so `Comlink.proxy()` is
required for callbacks and `Comlink.transfer()` for buffers. Use it when the
worker API is wide; use the explicit envelope when the API is two or three tasks.

## What a worker can and cannot do

The worker global is `self` (a `DedicatedWorkerGlobalScope`), not `window`.

**Available:** `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `IndexedDB`,
File and File System APIs, Web Crypto, the Performance APIs, `Canvas`/`WebGL`/`WebGPU`
via `OffscreenCanvas`, `BroadcastChannel`, `MessageChannel`, `structuredClone`,
`atob`/`btoa`, timers, `requestAnimationFrame` (dedicated workers), `WebAssembly`,
and nested same-origin workers.

**Absent:** the DOM (`document`, `window`, `parent`), `localStorage` and
`sessionStorage` (use `IndexedDB`), `alert`/`confirm`/`prompt`, and any direct
reference to main-thread variables or functions.

The storage rule catches people: a task that reads a token from `localStorage`
cannot be moved as-is. Pass the value in with the request, or move the whole
data layer to `IndexedDB`.

## Shared workers

One worker instance shared by every same-origin tab, window, and iframe.
Communication goes through a port rather than the worker object.

```js
// every tab runs this
const shared = new SharedWorker(new URL("./shared.js", import.meta.url), { type: "module" });

shared.port.onmessage = ({ data }) => render(data); // assigning onmessage starts the port
shared.port.postMessage({ type: "subscribe" });
```

```js
// shared.js - one connection list, one upstream socket for all tabs
const ports = new Set();

self.onconnect = ({ ports: [port] }) => {
  ports.add(port);
  port.onmessage = ({ data }) => {
    for (const peer of ports) {
      peer.postMessage(handle(data));
    }
  };

  port.start(); // required when you attach a listener instead of onmessage
};
```

The worker shuts down when nothing references it. `new SharedWorker(url, { extendedLifetime: true })`
keeps it alive briefly after the last port closes, which is enough to flush
analytics or persist state during a navigation.

Use it for what genuinely must be single-instance across tabs: one WebSocket,
one poll loop, one cache warm-up. For plain change notification between tabs,
`BroadcastChannel` is simpler and needs no worker. Note that Android WebView has
no `SharedWorker`.

## Transferables and shared memory

```js
// Zero-copy: ownership moves, the source buffer is detached
const pixels = new Uint8ClampedArray(width * height * 4);
worker.postMessage({ id, task: "filter", payload: pixels.buffer }, [pixels.buffer]);
// pixels.buffer.byteLength === 0 here - reading it is a bug
```

Transferable: `ArrayBuffer`, `MessagePort`, `ImageBitmap`, `OffscreenCanvas`,
`ReadableStream`/`WritableStream`/`TransformStream`, `VideoFrame`, `AudioData`,
`RTCDataChannel`.

Copying cost is only worth engineering around when it is measurable: web.dev puts
JSON payloads under ~10 KB in the negligible range. Above that, or for anything
binary, transfer instead.

`SharedArrayBuffer` is the only true shared memory, and it is gated:

```js
if (crossOriginIsolated) {
  const shared = new SharedArrayBuffer(1024, { maxByteLength: 4096 });
  worker.postMessage({ shared });
} else {
  worker.postMessage({ buffer: new ArrayBuffer(1024) });
}
```

Requires a secure context plus both headers on the document:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Enabling those breaks every cross-origin embed that lacks
`Cross-Origin-Resource-Policy` - audit ads, analytics, maps, and iframes first.
Coordinate with `Atomics`: `Atomics.wait()` throws on the main thread by design,
so use `Atomics.waitAsync()` on the page and `Atomics.wait()` only inside workers.

## OffscreenCanvas

Canvas and WebGL rendering can leave the main thread entirely.

```js
// main thread - once; the element can never be drawn to from the page again
const offscreen = document.querySelector("canvas").transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);
```

```js
// worker - owns the frame loop
self.addEventListener("message", ({ data }) => {
  const context = data.canvas.getContext("2d");
  const draw = (time) => {
    renderFrame(context, time);
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
});
```

Widely available: every Baseline browser has shipped `OffscreenCanvas` for more
than 2.5 years. Notes: one context per canvas;
resizing must be messaged in, because the worker has no `ResizeObserver` on the
element; pointer and keyboard events still arrive on the main thread and must be
forwarded; `transferToImageBitmap()` + a `bitmaprenderer` context is the
alternative when you want the page to control presentation.

## When a worker is the wrong tool

Work that must touch the DOM cannot move. Break it into chunks and yield instead.
A task over **50 ms** is a long task; everything past 50 ms is blocking time.

```js
/**
 * Run a job queue without blocking input for more than `budget` ms.
 * @param {Array<() => void>} jobs
 * @param {number} [budget=50]
 * @returns {Promise<void>}
 */
async function runJobs(jobs, budget = 50) {
  let lastYield = performance.now();

  for (const job of jobs) {
    job();
    if (performance.now() - lastYield > budget) {
      await yieldToMain();
      lastYield = performance.now();
    }
  }
}

/**
 * Yield to the main thread, preferring prioritized continuation.
 * @returns {Promise<void>}
 */
function yieldToMain() {
  if (globalThis.scheduler?.yield) {
    return scheduler.yield();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
```

Ranking, best first:

1. **`scheduler.yield()`** - resumes _before_ other queued tasks, so the work
   still finishes promptly. Chrome/Edge 129+, Firefox 142+. Not in Safari.
2. **`scheduler.postTask()`** with `priority: "user-blocking" | "user-visible" |
"background"`, a `TaskController` for reprioritization and abort, and a
   promise result. Same support gap: no Safari.
3. **`setTimeout(fn, 0)`** - the universal fallback. Queues at the back, and
   after five nested timeouts browsers clamp to a 5 ms minimum.
4. **`requestIdleCallback()`** - only for genuinely discardable work
   (prefetch, logging, warm-up). Never for anything the user is waiting on.

Do not use `isInputPending()` as a yield gate: it can report `false` while input
is pending, and yielding also matters for rendering, not just input.

## Measurement: long tasks, INP, and LoAF

Instrument before and after. A worker that moves 8 ms of work is churn, and
"it feels faster" is not a measurement.

```js
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.blockingDuration <= 50) {
      continue;
    }
    const worst = entry.scripts.reduce((a, b) => (a.duration > b.duration ? a : b));

    report({
      blocking: entry.blockingDuration,
      source: `${worst.sourceURL}:${worst.sourceFunctionName}`,
    });
  }
}).observe({ type: "long-animation-frame", buffered: true });
```

| Signal                  | Where                               | Target                             |
| ----------------------- | ----------------------------------- | ---------------------------------- |
| INP (field, p75)        | `web-vitals` library, CrUX          | < 200 ms                           |
| Long task               | `longtask` entries                  | none over 50 ms during interaction |
| LoAF `blockingDuration` | `long-animation-frame` entries      | < 50 ms                            |
| TBT (lab)               | Lighthouse CI                       | < 200 ms                           |
| Worker round trip       | `performance.measure` on both sides | task time ≫ clone + hop time       |

LoAF supersedes `longtask` for diagnosis: it covers the whole frame - rAF
callbacks, style, layout, `ResizeObserver`, `IntersectionObserver` - and
attributes per script with `sourceURL` and `sourceFunctionName`. `longtask` gives
you a duration and almost no attribution. Chromium-only today, so keep `longtask`
as the cross-browser floor.

## Framework integration

The pool is application infrastructure, not component state. Create it once in a
module, hand components a promise-returning function, and let the component own
only cancellation.

| Framework | Own the pool in                            | Cancel on                                        |
| --------- | ------------------------------------------ | ------------------------------------------------ |
| React     | module singleton or context provider       | `useEffect` cleanup -> `AbortController.abort()` |
| Vue 3     | composable over a module singleton         | `onScopeDispose`                                 |
| Svelte 5  | module-level store                         | `$effect` teardown                               |
| Angular   | `providedIn: "root"` service               | `DestroyRef.onDestroy`                           |
| Vanilla   | module singleton in `src/workers/index.js` | element `disconnectedCallback`                   |

Rules that hold everywhere: never instantiate a worker inside a render function;
never keep worker results in a ref that outlives the request; always pass an
`AbortSignal` so a superseded request cannot overwrite fresher state.

Meta-frameworks (Next, Nuxt, Remix, Astro, SvelteKit) run the same module on the
server, where `Worker` does not exist. Guard construction behind a
`typeof window !== "undefined"` check or a dynamic `import()` in a
client-only lifecycle hook.

## Third-party scripts

Analytics and tag managers are often the largest main-thread cost, and you cannot
rewrite them. Options, in order of preference:

1. Remove or defer the script. Measure what it actually earns first.
2. Move tagging server-side (server-side GTM, edge tag managers such as
   Cloudflare Zaraz) so the browser makes one request instead of twenty.
3. `Partytown` proxies third-party scripts into a worker via synchronous
   service-worker interception. Still beta; it breaks on scripts that inject
   many DOM nodes, and it adds its own moving parts. Treat as a last resort and
   verify the tags still fire.

## Security

- Workers are same-origin only; subworkers inherit that constraint.
- A worker script served over HTTP gets its **own** CSP from its own response
  headers - the document's CSP does not apply. Set `script-src` on the worker
  response, and constrain creation from the page with `worker-src 'self'`.
- `blob:` and `data:` workers are the exception: they inherit the document CSP.
  Prefer real files; `blob:` workers also defeat bundler chunking and source maps.
- Never build a worker script from user-controlled strings.
- Cross-origin isolation (needed for `SharedArrayBuffer`) is a page-wide policy
  change - review every embed before enabling it.

## Anti-patterns

| Anti-pattern                                         | Why it fails                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| `new Worker()` per request                           | Startup and compile cost exceed the work                         |
| Moving `fetch` into a worker "for parallelism"       | Network already waits off-thread; only the parsing moves         |
| Passing a class instance and expecting methods       | Structured clone keeps data, drops prototypes                    |
| `JSON.parse(JSON.stringify(x))` before `postMessage` | Doubles the copy; `postMessage` already clones                   |
| Sending a 40 MB array as a plain array               | Use a typed array and transfer the buffer                        |
| Reading a buffer after transferring it               | It is detached; `byteLength === 0`                               |
| A worker per component instance                      | Memory blow-up; pool instead                                     |
| `Atomics.wait()` on the main thread                  | Throws by design - use `Atomics.waitAsync()`                     |
| Bumping the pool to `hardwareConcurrency * 2`        | Oversubscription; there is no I/O to hide                        |
| Shipping a worker without a `terminate()` path       | Leaks across route changes                                       |
| `postMessage({ fn: fn.toString() })` to send logic   | The closure is gone; captured values are undefined in the worker |
| A task that reads `localStorage`                     | Not available in workers - pass the value in, or use `IndexedDB` |
| Offloading a task under ~10 ms                       | Message hop plus clone costs more than the task                  |
| Building the worker from a `blob:` URL by default    | Inherits the page CSP, breaks source maps and bundler chunking   |
| Measuring with `console.time` on a fast laptop       | Field INP is the only verdict                                    |

## Quick reference

```
┌───────────────────────────────────────────────────────────────┐
│  Waiting (network, IDB)      → async/await, no worker         │
│  Computing + needs DOM       → chunk + scheduler.yield()      │
│  Computing, no DOM           → worker pool                    │
│  Canvas / WebGL              → OffscreenCanvas in a worker    │
│  Shared across tabs          → SharedWorker / BroadcastChannel│
│  Third-party tags            → server-side, else Partytown    │
│                                                               │
│  Create:   new Worker(new URL("./w.js", import.meta.url),     │
│                       { type: "module" })                     │
│  Pool:     min(cap, hardwareConcurrency - 1)                  │
│  Envelope: { id, task, payload } / { id, ok, result|error }   │
│  Big data: transfer ArrayBuffer, never copy                   │
│  Shared:   SharedArrayBuffer + COOP/COEP + crossOriginIsolated│
│  Budget:   task < 50ms, INP < 200ms, blockingDuration < 50ms  │
│  Verify:   long-animation-frame + web-vitals in the field     │
└───────────────────────────────────────────────────────────────┘
```

## Checklist

- [ ] Profiled first; the bottleneck is CPU, not network
- [ ] Task module is a pure function, unit-testable without a worker
- [ ] Module worker created with `new URL(..., import.meta.url)`
- [ ] Pool reused, size capped, `dispose()` wired to teardown
- [ ] Envelope carries an `id`; errors reject the matching promise
- [ ] `onerror` and `onmessageerror` both handled
- [ ] Binary payloads transferred, not cloned
- [ ] `crossOriginIsolated` checked before `SharedArrayBuffer`
- [ ] `AbortSignal` passed from the UI; stale results discarded
- [ ] Server-side render guarded against missing `Worker`
- [ ] LoAF/INP measured before and after, in the field
- [ ] `pnpm run test` and `rule_tool_check` pass

## See also

- [rule-platform-web](../rule-platform-web/SKILL.md) - Web platform umbrella and performance budgets
- [rule-frontend](../rule-frontend/SKILL.md) - Frontend framework index
- [rule-styleguide-javascript](../rule-styleguide-javascript/SKILL.md) - JavaScript conventions used in the examples
- [rule-toolchain-vite](../rule-toolchain-vite/SKILL.md) - Worker bundling in Vite
- [rule-devops-testing](../rule-devops-testing/SKILL.md) - Vitest setup for the task-module tests
- [rule-backend-workers](../rule-backend-workers/SKILL.md) - The server-side counterpart: event loop, `worker_threads`, piscina, cluster
- [rule-backend-node](../rule-backend-node/SKILL.md) - Node runtime conventions
- [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) - Reference for the full API surface
- [Functions available to workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Functions_and_classes_available_to_workers) - Authoritative can/cannot list
- [rule](../rule/SKILL.md) - Central skill index and dispatcher
