---
name: rule-frontend-workers
description: >-
  Offload CPU-bound JavaScript to browser Web Workers. Covers dedicated workers, shared workers, service workers, postMessage/structured clone, transferables, SharedArrayBuffer, importScripts, and the decision framework for when to use workers vs main-thread async.
tags:
  - "frontend"
  - "browser"
  - "concurrency"
  - "performance"
frameworks: [vanilla, web-workers]
---

# rule-frontend-workers — Browser Web Workers & Off-Thread Computation

This skill helps you decide **when and how** to split CPU-bound JavaScript off the main UI thread in browser applications using Web Workers.

---

## The Problem: Single-Threaded UI

The browser's main thread handles **rendering, user input, and JavaScript execution** on a single thread. A long-running synchronous task **freezes the entire page** — no clicks, no scrolls, no typing.

**Workers give you the ability to run scripts in background threads**, keeping the UI responsive.

> Workers and the main thread run in **completely separate worlds** — no shared variables, no direct DOM access. Communication is by **message passing** only.

---

## Worker Types at a Glance

| Type                 | Scope                                          | Use case                                                   | API                                  |
| -------------------- | ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------ |
| **Dedicated Worker** | Single script/tab                              | CPU-heavy computation, parsing, image processing           | `new Worker()`                       |
| **Shared Worker**    | Multiple scripts/windows/iframes (same origin) | Shared state, cross-tab coordination                       | `new SharedWorker()`                 |
| **Service Worker**   | Network proxy, offline cache                   | PWAs, offline support, push notifications, background sync | `navigator.serviceWorker.register()` |

---

## Dedicated Workers

Accessible only by the script that created them. The bread-and-butter worker type.

### Feature Detection

```js
if (window.Worker) {
  const worker = new Worker("worker.js");
}
```

### Spawning

```js
// Modern bundler-safe path (Vite, webpack, Parcel)
const worker = new Worker(new URL("worker.js", import.meta.url));

// Classic path (relative to HTML page)
const worker = new Worker("worker.js");
```

### Main ↔ Worker Communication

**Main thread:**

```js
// main.js
const worker = new Worker("worker.js");

// Send data to worker
worker.postMessage({ numbers: [5, 3], operation: "multiply" });

// Receive result from worker
worker.onmessage = (event) => {
  console.log("Result:", event.data);
};

// Handle errors
worker.onerror = (error) => {
  console.error("Worker error:", error.message);
};

// Terminate when done
worker.terminate();
```

**Worker script:**

```js
// worker.js
self.onmessage = (event) => {
  const { numbers, operation } = event.data;

  let result;
  if (operation === "multiply") {
    result = numbers[0] * numbers[1];
  }

  self.postMessage({ result });
};
```

### Inline / Embedded Workers

Create a worker from a string or function — no separate file needed:

```js
// Convert a function to a worker URL
function fn2workerURL(fn) {
  const blob = new Blob([`(${fn.toString()})()`], { type: "text/javascript" });
  return URL.createObjectURL(blob);
}

const worker = new Worker(
  fn2workerURL(() => {
    self.onmessage = (e) => {
      // Heavy computation here
      self.postMessage(result);
    };
  }),
);
```

> ⚠️ `URL.createObjectURL()` creates a blob URL — call `URL.revokeObjectURL(url)` after the worker is created to avoid memory leaks.

### Terminating

```js
// From main thread — kills the worker immediately
worker.terminate();

// From inside the worker — graceful shutdown
self.close();
```

---

## Shared Workers

Accessible by **multiple scripts** across different windows, tabs, iframes, or workers — same origin required.

### Spawning

```js
// main.js (same code in multiple windows/tabs)
const worker = new SharedWorker("shared-worker.js");

// Messages go through a port
worker.port.postMessage({ type: "square", value: 7 });
worker.port.onmessage = (event) => {
  console.log("Result:", event.data);
};
```

### Worker Script

```js
// shared-worker.js
const connections = [];

self.onconnect = (event) => {
  const port = event.ports[0];
  connections.push(port);

  port.onmessage = (e) => {
    const { type, value } = e.data;
    let result;
    if (type === "square") result = value * value;

    // Broadcast to all connected ports
    connections.forEach((p) => p.postMessage({ result }));
  };

  port.start(); // Required when not using onmessage setter
};
```

### Shared Worker Lifetime

- Shut down when **no longer referenced** by any window/iframe/worker
- Browsers **may** keep them alive between same-origin navigations
- `extendedLifetime` keeps worker alive briefly after all references close:

```js
const worker = new SharedWorker("worker.js", { extendedLifetime: true });
// Worker lives a few seconds after all ports close —
// useful for flushing analytics or saving state on navigation
```

---

## Structured Clone & Data Transfer

### Data is COPIED, Not Shared

Messages are deep-copied via the **structured clone algorithm**. This means:

```js
// ✅ These survive cloning:
worker.postMessage({
  numbers: [1, 2, 3],
  date: new Date(),
  map: new Map([["key", "value"]]),
  buffer: new ArrayBuffer(16),
  nested: { circular: null }, // circular references work (unlike JSON)
});

// ❌ These DO NOT survive:
worker.postMessage({
  fn: () => {}, // Functions are dropped
  element: document.body, // DOM nodes are dropped
  instance: new MyClass(), // Class prototypes are dropped
});
```

> JSON can't handle `Date`, `Map`, `Set`, `RegExp`, `ArrayBuffer`, or circular references. Structured clone handles them all.

### Transferable Objects (Zero-Copy)

For large binary data, **transfer** ownership instead of copying:

```js
// Create a 32MB buffer
const buffer = new ArrayBuffer(32 * 1024 * 1024);

// Transfer ownership — buffer is now empty in the main thread
worker.postMessage({ buffer }, [buffer]);

console.log(buffer.byteLength); // 0 — transferred!
```

Transferable objects: `ArrayBuffer`, `MessagePort`, `ReadableStream`, `WritableStream`, `TransformStream`, `ImageBitmap`, `OffscreenCanvas`.

### SharedArrayBuffer (True Shared Memory)

```js
// main.js
const shared = new SharedArrayBuffer(1024);
const view = new Int32Array(shared);
view[0] = 42;

worker.postMessage({ shared });

// worker.js
self.onmessage = (e) => {
  const view = new Int32Array(e.data.shared);
  console.log(view[0]); // 42 — same memory!
  Atomics.add(view, 0, 1); // thread-safe increment
};
```

> ⚠️ `SharedArrayBuffer` requires specific security headers (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`). Use `Atomics` for synchronization.

---

## importScripts — Loading Libraries in Workers

Workers have a global `importScripts()` function that loads scripts synchronously:

```js
// worker.js
importScripts("lib1.js", "lib2.js");

// Now use globals from lib1 and lib2
const result = lib1.process(lib2.transform(data));
```

> Scripts are downloaded in any order but **executed in the order listed**. `importScripts()` blocks until all scripts load.

For ES modules in workers, use the `type: 'module'` option:

```js
const worker = new Worker("worker.js", { type: "module" });
// worker.js can now use: import { foo } from './lib.js';
```

---

## What Workers CAN and CANNOT Do

### ✅ Available in Workers

- `fetch()`, `XMLHttpRequest`
- `setTimeout()`, `setInterval()`, `requestAnimationFrame` (dedicated only)
- `IndexedDB`, `File API`, `File System API`
- `WebSockets`, `Server-Sent Events`
- `Web Crypto API`, `Performance API`
- `Canvas API`, `WebGL`, `WebGPU`
- `Broadcast Channel API`, `Channel Messaging API`
- `Navigator` (limited), `URL API`
- `atob()`, `btoa()`, `structuredClone()`
- Spawn **sub-workers** (same origin)

### ❌ NOT Available in Workers

- **DOM manipulation** (`document`, `window`, `parent`)
- `localStorage` / `sessionStorage` (use IndexedDB)
- `alert()`, `confirm()`, `prompt()`
- Direct access to main-thread variables or functions

> You can test any API at the [Worker Playground](https://mdn.github.io/dom-examples/web-workers/worker-playground/).

---

## Real-World Patterns

### Pattern 1: CPU-Intensive Computation (Fibonacci / Primes)

```js
// main.js
const worker = new Worker(new URL("compute.js", import.meta.url));

document.querySelector("#generate").addEventListener("click", () => {
  const input = document.querySelector("#quota").value;
  worker.postMessage({ command: "generate", quota: input });
});

worker.addEventListener("message", (e) => {
  document.querySelector("#output").textContent = `Finished generating ${e.data} primes!`;
});
```

```js
// compute.js
addEventListener("message", (e) => {
  if (e.data.command === "generate") {
    const primes = generatePrimes(e.data.quota);
    postMessage(primes.length);
  }
});

function generatePrimes(quota) {
  /* heavy computation */
}
```

### Pattern 2: Image Processing with OffscreenCanvas

```js
// main.js
const canvas = document.querySelector("canvas");
const offscreen = canvas.transferControlToOffscreen();

const worker = new Worker("renderer.js");
worker.postMessage({ canvas: offscreen }, [offscreen]);

// worker.js — can now render directly to canvas from a worker!
self.onmessage = (e) => {
  const canvas = e.data.canvas;
  const ctx = canvas.getContext("2d");
  // Draw without blocking the UI thread
};
```

### Pattern 3: Multi-Worker Task Distribution

```js
// Split work across multiple workers for multi-core machines
const workers = [];
const cpuCount = navigator.hardwareConcurrency || 4;

for (let i = 0; i < cpuCount; i++) {
  workers.push(new Worker("task.js"));
}

function parallelMap(data, fn) {
  const chunkSize = Math.ceil(data.length / workers.length);
  return Promise.all(
    workers.map((worker, i) => {
      return new Promise((resolve) => {
        const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
        worker.onmessage = (e) => resolve(e.data);
        worker.postMessage({ chunk, fn: fn.toString() });
      });
    }),
  ).then((results) => results.flat());
}
```

### Pattern 4: QueryableWorker (RPC-Style)

```js
// QueryableWorker class — abstracts postMessage into method calls
class QueryableWorker {
  constructor(url) {
    this.worker = new Worker(url);
    this.listeners = {};

    this.worker.onmessage = (e) => {
      const { listener, args } = e.data;
      if (listener && this.listeners[listener]) {
        this.listeners[listener](...args);
      }
    };
  }

  sendQuery(method, ...args) {
    this.worker.postMessage({ method, args });
  }

  addListener(name, fn) {
    this.listeners[name] = fn;
  }

  terminate() {
    this.worker.terminate();
  }
}

// Usage
const task = new QueryableWorker("task.js");
task.addListener("onResult", (result) => {
  document.querySelector("#output").textContent = result;
});
task.sendQuery("getDifference", 5, 3);
```

---

## Decision Framework

```
"Is the UI freezing/janking?"
            │
      ┌─────┴─────┐
      │           │
   CPU work?   I/O wait?
      │           │
      ▼           ▼
   Worker    async/await
   Thread    (fetch, etc.)
      │
      ▼
"Is it large binary data?"
   ┌─────┴─────┐
   │           │
  Yes         No
   │           │
   ▼           ▼
Transfer   Structured
 (zero-     Clone
  copy)     (auto)
```

### Quick Rules

| Situation                           | Solution                                                          |
| ----------------------------------- | ----------------------------------------------------------------- |
| Heavy computation blocking UI       | **Dedicated Worker** — never run sync CPU work on the main thread |
| Large binary data passing           | **Transferable objects** — zero-copy, ownership moves             |
| Multiple tabs sharing state         | **Shared Worker** — single worker for all same-origin contexts    |
| Offline / background sync / push    | **Service Worker** — network proxy, not for CPU work              |
| Multi-core parallel processing      | **Multiple dedicated workers** — one per core                     |
| Worker startup overhead > task time | Stay on **main thread** — workers have creation cost              |
| Canvas rendering blocking UI        | **OffscreenCanvas** — transfer to worker                          |

### When NOT to Use Workers

- ❌ Simple DOM updates — workers can't touch the DOM
- ❌ Trivial computations (< ~10ms) — worker creation cost outweighs benefit
- ❌ Already-async operations (`fetch`, `setTimeout`) — won't block the UI
- ❌ Tasks that need `localStorage` — use IndexedDB in workers instead

---

## CSP & Security

Workers have their **own execution context**, distinct from the creating document:

- Workers are generally **not governed** by the parent document's CSP
- Set a `Content-Security-Policy` header on the **worker script response** to restrict it
- Exception: `data:` or `blob:` URL workers **inherit** the parent's CSP

---

## Debugging

| Browser | Debug URL                               |
| ------- | --------------------------------------- |
| Chrome  | `chrome://inspect/#workers`             |
| Edge    | `edge://inspect/#workers`               |
| Firefox | `about:debugging#/runtime/this-firefox` |

Workers appear in the Sources panel alongside main-thread scripts. You can set breakpoints, inspect variables, and use the console — just like debugging the main thread.

---

## Guards & Best Practices

### Worker Lifecycle

- ✅ Create workers **once**, not per-task
- ✅ `terminate()` workers when no longer needed (SPA unmount)
- ✅ Handle `worker.onerror` — unhandled errors are silent otherwise
- ❌ Don't create workers in a loop or per-event

### Data Transfer

- ✅ Use **transferables** for large binary data (>1MB)
- ✅ `SharedArrayBuffer` only when you need true shared memory + `Atomics`
- ❌ Don't send functions, DOM nodes, or class instances — structured clone drops them
- ❌ Don't send the entire application state — be selective

### Compatibility

- ✅ Feature-detect: `if (window.Worker) { ... }`
- ✅ Use `new URL('worker.js', import.meta.url)` for bundler compatibility
- ✅ Test with your bundler (Vite, webpack, Parcel) — each has worker syntax
- ❌ Workers require a server — `file://` URLs cannot create workers

### Performance

- ✅ Split work across `navigator.hardwareConcurrency` workers for CPU-bound parallelism
- ✅ Profile before and after — workers are not free
- ❌ Don't create more workers than CPU cores for CPU-bound tasks

---

## Quick Reference

```
┌──────────────────────────────────────────────────────────────────┐
│  rule-frontend-workers — Browser Web Workers                      │
│                                                                  │
│  Worker types:  Dedicated | Shared | Service                     │
│  Communication: postMessage + onmessage (structured clone)      │
│  Zero-copy:     Transferable objects (ArrayBuffer, Offscreen)    │
│  Shared memory: SharedArrayBuffer + Atomics (needs COOP/COEP)   │
│  Libs in worker: importScripts() or { type: 'module' }          │
│                                                                  │
│  CAN do:     fetch, IndexedDB, WebSocket, Canvas, WebGL, Crypto │
│  CANNOT do:  DOM, localStorage, window, alert, parent vars      │
│                                                                  │
│  Decision:                                                       │
│   UI freezing?   → Dedicated Worker                             │
│   Multi-tab?     → Shared Worker                                │
│   Offline/PWA?   → Service Worker (not for CPU)                 │
│   Large binary?  → Transferable (zero-copy)                     │
│   Multi-core?    → One worker per CPU core                      │
│   Trivial task?  → Main thread (worker cost > benefit)          │
│                                                                  │
│  Debug:  chrome://inspect/#workers                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
- [rule-frontend](../rule-frontend/SKILL.md) — Frontend skill index
- [rule-backend-workers](../rule-backend-workers/SKILL.md) — Node.js Worker Threads skill
- [MDN: Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [Functions available to workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Functions_and_classes_available_to_workers)
