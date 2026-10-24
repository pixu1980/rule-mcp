# rule-mcp-frontend-workers - Patterns

Companion to [SKILL.md](SKILL.md). Contracts, framework wiring, and the
decisions that are easy to get wrong.

## Decision tree

```
Is the slow thing waiting or computing?
├─ Waiting (network, IndexedDB, timers)
│   └─ Already off the main thread. A worker changes nothing.
│      Fix the request: fewer round trips, smaller payload, streaming, caching.
└─ Computing
    ├─ Does it need the DOM?
    │   ├─ Yes → chunk it + scheduler.yield(); consider virtualising the list
    │   │        so there is less DOM to touch in the first place.
    │   └─ No  → worker
    │       ├─ Runs on every keystroke / interaction  → pool + latest-wins abort
    │       ├─ Runs once at startup                   → single worker, terminate after
    │       ├─ Draws pixels                           → OffscreenCanvas in the worker
    │       └─ Needs the same state in several tabs   → SharedWorker / BroadcastChannel
    └─ Is it a third-party script?
        └─ Remove it, move it server-side, or (last resort) Partytown.
```

## Envelope contract

Everything crossing `postMessage` uses one shape. No exceptions, no bare values.

| Direction      | Shape                      | Notes                                                   |
| -------------- | -------------------------- | ------------------------------------------------------- |
| main -> worker | `{ id, task, payload }`    | `id` is a monotonic number; `task` indexes the registry |
| worker -> main | `{ id, ok: true, result }` | `result` may be transferred, not cloned                 |
| worker -> main | `{ id, ok: false, error }` | `error` is `{ name, message, stack }`                   |
| worker -> main | `{ id, progress }`         | Optional; does not settle the promise                   |

Rules:

- The main thread keeps `Map<id, { resolve, reject }>`. The worker is stateless
  between messages.
- Never resolve on a message whose `id` does not match the job that worker is
  running - a mismatch means the worker was recycled and the answer is stale.
- `Error` is structured-cloneable, but an _uncaught_ throw never reaches
  `onmessage`; it fires `onerror` with `{ message, filename, lineno }` and no
  `id`. Catch inside the worker and answer on the envelope; treat `onerror` as
  "this worker is unusable" rather than "this task failed".
- Handle `messageerror` on both sides. It fires when a payload arrives that
  could not be deserialised, and it is the only signal you get.

## Cancellation

Structured-clone messaging has no cancellation primitive. There are exactly
three honest options:

1. **Drop the result.** Cheapest. The worker keeps burning CPU; only the UI is
   protected. Fine for tasks under a few hundred milliseconds.
2. **Terminate and replace the worker.** The only way to reclaim the CPU from a
   synchronous task. Costs one worker startup. This is what
   `WorkerPool._abort()` does for an in-flight job.
3. **Cooperative checks inside the task.** The task polls a flag in a
   `SharedArrayBuffer` (`Atomics.load`) at loop boundaries and returns early.
   Requires cross-origin isolation, and only works for loop-shaped work.

Latest-wins is the common UI case: abort the previous request on every new one,
so a fast typist never waits behind stale work. See `latestOnly()` in
[examples/src/index.js](examples/src/index.js).

## Progress and streaming

A long task that reports nothing looks broken. Two shapes:

```js
// worker: interleave progress messages, settle exactly once
self.postMessage({ id, progress: { done: index, total } });
```

```js
// worker: stream results instead of buffering them
const stream = new ReadableStream({
  start(controller) {
    for (const chunk of produce()) {
      controller.enqueue(chunk);
    }

    controller.close();
  },
});

self.postMessage({ id, ok: true, result: stream }, [stream]);
```

`ReadableStream`, `WritableStream`, and `TransformStream` are transferable, so
the consumer can start rendering before the producer finishes. That beats a
progress bar over a single giant result: it lowers peak memory and shortens time
to first paint of the output.

## Sharing across tabs

| Need                                   | Tool                                    |
| -------------------------------------- | --------------------------------------- |
| Broadcast a change to other tabs       | `BroadcastChannel` - trivial, no worker |
| One WebSocket / poll loop for all tabs | `SharedWorker`                          |
| Persisted shared state                 | `IndexedDB` (works inside workers)      |
| Offline / network interception         | Service Worker                          |

`SharedWorker` caveats: no support in Android WebView; each page connects via
`worker.port` and must call `port.start()` unless it assigns `port.onmessage`;
debugging is per-browser (`chrome://inspect`, `about:debugging`). Do not reach
for it purely to save memory - a dedicated pool per tab is simpler and the
browser reclaims it on close.

## WebAssembly

WASM is the strongest reason to run a worker: compilation and execution are both
CPU-bound and both block.

- Instantiate inside the worker, once, at module scope. Never re-instantiate per
  task.
- Use `WebAssembly.instantiateStreaming(fetch(url))` so compilation overlaps the
  download.
- WASM threads need `SharedArrayBuffer`, therefore cross-origin isolation - the
  same COOP/COEP requirement.
- Emscripten's own pthread pool is a worker pool. Do not nest it inside another
  one; give it the cores directly.

## IndexedDB inside a worker

`IndexedDB` is available in workers, and reads there do not block the page. Move
the whole data layer in when the page is only rendering the result: query,
join, sort, and paginate in the worker, and post back one screen of rows. The
main thread then never holds the full dataset.

## Framework wiring

React - the pool is module-level, the component owns only the signal:

```jsx
function useTask(task) {
  const [state, setState] = useState({ status: "idle" });

  const run = useCallback(
    (payload) => {
      const controller = new AbortController();

      setState({ status: "pending" });
      runTask(task, payload, { signal: controller.signal })
        .then((result) => setState({ status: "done", result }))
        .catch((error) => {
          if (error.name !== "AbortError") {
            setState({ status: "error", error });
          }
        });

      return () => controller.abort();
    },
    [task],
  );

  return [state, run];
}
```

Vue 3 - a composable over the same singleton, torn down by the effect scope:

```js
export function useTask(task) {
  const result = shallowRef();
  const controller = new AbortController();

  onScopeDispose(() => controller.abort());

  async function run(payload) {
    result.value = await runTask(task, payload, { signal: controller.signal });
  }

  return { result, run };
}
```

Angular - `providedIn: "root"` service, canceled through `DestroyRef`.
Svelte 5 - module-level store; abort in `$effect` teardown.
Vanilla - the singleton in `src/workers/index.js`; abort in
`disconnectedCallback`.

In every case: never construct a worker inside a render function, and never let
a component's unmount dispose a pool other components share.

## Meta-framework guards

`Worker` does not exist during server rendering. `getPool()` in
[examples/src/workers/index.js](examples/src/workers/index.js) returns
`undefined` on the server and `runTask()` falls back to running the same task
function inline. That keeps one code path for both environments and makes the
task registry the single definition of behavior.

Alternative: `const { runTask } = await import("./workers/index.js")` inside a
client-only lifecycle hook. Preferable when the worker bundle is large enough
that you do not want it in the server graph at all.

## Testing

| Layer                                           | How                                                                        | Tool                        |
| ----------------------------------------------- | -------------------------------------------------------------------------- | --------------------------- |
| Task logic                                      | Import the function, call it                                               | Vitest, node environment    |
| Envelope handling                               | Fake worker: an object with `postMessage`, `addEventListener`, `terminate` | Vitest                      |
| Pool behavior (queueing, abort, crash recovery) | Fake worker that replies asynchronously and can be made to throw           | Vitest                      |
| Real worker round trip                          | Vitest browser mode (Playwright provider) or a Playwright test             | Vitest browser / Playwright |

Keep the split. Almost all the logic worth testing is in the task functions,
which need no worker at all. Reserve the slow browser test for one end-to-end
proof that the wiring works: post a message, get the right answer back.

jsdom has no `Worker`. Do not polyfill it to force unit tests through the worker
path - test the task function directly and the pool with a fake.

## Debugging

- Workers appear in DevTools as separate threads: `chrome://inspect`,
  `edge://inspect`, `about:debugging#/runtime/this-firefox`. Breakpoints and
  `console.log` work normally.
- Give every worker a `name` - it is what shows in the thread list and in
  performance profiles.
- Chrome's Performance panel shows a track per worker. If the worker track is
  empty and the main track is full, the offload did not happen: usually a
  bundler that inlined the worker, or a task that fell back to the main thread.
- `blob:` workers have no stable source URL, which is why they are worth
  avoiding beyond the CSP inheritance issue.

## Migration recipe

1. Record a profile with the interaction that stalls. Note the LoAF
   `blockingDuration` and the attributed script.
2. Extract the hot function into `src/tasks/_name.js` as a pure function of its
   input. Add a unit test - it should pass unchanged.
3. Register it in `src/tasks/index.js`.
4. Replace the call site with `runTask("name", payload, { signal })`.
5. Convert large payloads to typed arrays and transfer the buffers.
6. Re-profile. If `blockingDuration` did not drop, the work was not what you
   thought it was - go back to step 1 rather than adding more workers.
7. Watch field INP after release. Lab numbers on a developer machine routinely
   hide the regression that matters.

## See also

- [SKILL.md](SKILL.md) - Rules, APIs, and budgets
- [examples/src/workers/_worker-pool.js](examples/src/workers/_worker-pool.js) - Pool implementation
- [examples/src/tasks/index.js](examples/src/tasks/index.js) - Task registry
