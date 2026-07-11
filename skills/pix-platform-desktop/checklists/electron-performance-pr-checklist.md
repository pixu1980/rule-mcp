# Electron Performance PR Checklist

## 1. IPC optimization

- Are IPC calls batched where possible (avoid sequential round-trips)?
- Are high-frequency IPC calls throttled with `requestAnimationFrame` or debounce?
- Is IPC used for the right things (not for simple React state)?

## 2. Window management

- Are windows created lazily (not all on startup)?
- Are existing windows reused instead of creating new ones?
- Is `show: false` used with `ready-to-show` event?
- Is a splash screen shown for complex initializations?
- Are window references nullified in the `closed` event?

## 3. Main process responsiveness

- Is the main process entry point thin (delegates to modules)?
- Are CPU-heavy tasks offloaded to `worker_threads`?
- Are synchronous `fs` operations avoided in IPC handlers?

## 4. Native modules

- Are Node.js built-ins preferred over native addons?
- Are native modules necessary (not replaceable by built-in APIs)?
- Are native modules listed in `asarUnpack` if ASAR is enabled?

## 5. Dependencies

- Are unused dependencies removed from `package.json`?
- Are large libraries replaced with smaller alternatives?
- Is `electron-builder` configured to exclude dev dependencies?

## 6. Packaging

- Is ASAR enabled for distribution?
- Are native modules and external scripts unpacked from ASAR?
- Are `files` and `extraResources` configured to minimize package size?

## 7. Memory management

- Are window references cleaned up on close?
- Are IPC listeners removed when windows close?
- Are large objects serialized efficiently over IPC?

## 8. Startup time

- Is lazy initialization used for non-critical features?
- Is the renderer page optimized (critical CSS, deferred JS)?
- Are `app.whenReady()` handlers minimal and non-blocking?

## 9. Security (performance impact)

- Is `contextIsolation: true` (also prevents renderer → main process leaks)?
- Is CSP configured appropriately?
- Are web resources loaded only when needed?

## 10. Final review

- Is the app's startup time acceptable (< 3 seconds)?
- Is the package size reasonable?
- Are there any synchronous operations in IPC handlers?
- Has the app been profiled with Electron DevTools?
