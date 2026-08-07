# Electron Performance Playbook

This playbook supports the rule-electron performance review skill. It covers IPC optimization, window management, main process responsiveness, and packaging.

## Mental model

Electron performance is about three things:

1. **IPC cost** - every cross-process call has overhead
2. **Main process responsiveness** - the main process handles all system interactions
3. **App startup** - first impression is everything

## Pattern 1 - IPC batching

### The problem

```js
// Three sequential IPC round-trips (each ~1-5ms + serialization)
const user = await qt.loadUser(id);
const prefs = await qt.loadPreferences();
const recent = await qt.loadRecent();

// Total: 3 × (latency + serialization) minimum
```

### The fix

```js
// One round-trip
const data = await qt.loadInitialData(id);
```

### For parallel requests in renderer

```js
// ❌ Sequential (one at a time)
const a = await qt.getA();
const b = await qt.getB();
const c = await qt.getC();

// ✅ Parallel (all at once)
const [a, b, c] = await Promise.all([qt.getA(), qt.getB(), qt.getC()]);
```

## Pattern 2 - Throttling IPC

### Problem

Mouse moves, scroll events, resize - these fire at 60+ fps. Sending IPC for each frame is wasteful.

### Solutions

```js
// requestAnimationFrame throttling
let pending = null;
element.addEventListener("mousemove", (e) => {
  pending = e;
  if (!rafScheduled) {
    rafScheduled = true;
    requestAnimationFrame(() => {
      qt.sendPosition(pending.x, pending.y);
      rafScheduled = false;
    });
  }
});
```

```js
// Debounce for less frequent updates
const debouncedSave = debounce((text) => {
  qt.saveDraft(id, text);
}, 500);
editor.addEventListener("input", (e) => debouncedSave(e.target.value));
```

## Pattern 3 - Window creation

### Eager → Lazy

```js
// ❌ Eager
function createWindows() {
  mainWin = new BrowserWindow({...});
  prefsWin = new BrowserWindow({...});
  aboutWin = new BrowserWindow({...});
}

// ✅ Lazy
function openPreferences() {
  if (!prefsWin || prefsWin.isDestroyed()) {
    prefsWin = new BrowserWindow({...});
    prefsWin.on('closed', () => { prefsWin = null; });
  } else {
    prefsWin.focus();
  }
}
```

### Ready-to-show pattern

```js
const win = new BrowserWindow({
  show: false,
  backgroundColor: "#1a1a2e",
});

win.once("ready-to-show", () => {
  win.show();
});

win.loadURL("file://...");
```

## Pattern 4 - Native modules

Native modules (`.node` files) are expensive. Each one:

- Must be compiled for the target platform (`electron-rebuild`)
- Increases package size significantly
- Can cause version compatibility issues with Electron

### Prefer built-ins

| Need        | Built-in alternative                  |
| ----------- | ------------------------------------- |
| Hashing     | `crypto.createHash()`                 |
| UUID        | `crypto.randomUUID()`                 |
| JSON        | `JSON.parse / JSON.stringify`         |
| HTTP        | `fetch()` (Node 18+) or `http` module |
| Path        | `path` module                         |
| File system | `fs` module                           |
| Compression | `zlib` module                         |
| Events      | `EventEmitter`                        |

## Pattern 5 - Startup optimization

### Timeline

```
app.whenReady()
  → create window (show: false)
  → loadRenderer
  → renderer paints first frame
  → ready-to-show fires
  → window.show()
  → first meaningful paint
```

### Optimizations

- **Main process**: lazy-require modules, use dynamic `import()` for non-critical handlers
- **Renderer**: critical CSS in `<head>`, defer non-critical JS, optimize images
- **Packaging**: ASAR for faster reads, exclude dev dependencies

### Splash screen

```js
// Simple splash
const splash = new BrowserWindow({
  width: 400,
  height: 300,
  frame: false,
  alwaysOnTop: true,
  backgroundColor: "#1a1a2e",
});
splash.loadURL(`file://${__dirname}/splash.html`);

// Close when main is ready
mainWin.once("ready-to-show", () => {
  splash.close();
  mainWin.show();
});
```

## Pattern 6 - Worker threads

CPU-heavy work in the main process blocks all IPC and window management.

```js
// worker.js
const { parentPort } = require("worker_threads");

parentPort.on("message", (data) => {
  const result = expensiveComputation(data);
  parentPort.postMessage(result);
});
```

```js
// main.js
const { Worker } = require("worker_threads");

function runWorker(workerPath, data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath);
    worker.postMessage(data);
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}
```

Good candidates for workers: PDF generation, image processing, data transformation, large JSON parsing.

## Pattern 7 - Dependency audit

### How to audit

```bash
# Check package size
pnpm pack --dry-run

# Find large dependencies
pnpx cost-of-modules

# Check dependency tree
pnpm ls --depth=0

# Find unused deps
pnpx depcheck
```

### Common swaps

| Heavy package | Lighter alternative                                  |
| ------------- | ---------------------------------------------------- |
| `lodash`      | Native array/object methods                          |
| `moment`      | `Intl.DateTimeFormat` or `date-fns` (tree-shakeable) |
| `axios`       | `fetch()` (Node 18+)                                 |
| `uuid`        | `crypto.randomUUID()`                                |
| `fs-extra`    | `fs` + manual mkdirp                                 |

## Pattern 8 - ASAR and packaging

ASAR archives all files into a single blob for faster reads. However, native modules and external scripts may need to be unpacked.

```json
{
  "build": {
    "asar": true,
    "asarUnpack": ["node_modules/**/*.node", "scripts/**", "python/**"],
    "files": ["electron/**/*", "src/**/*", "assets/**/*", "!**/*.map", "!**/*.test.*"]
  }
}
```

## Pattern 9 - Window cleanup

```js
let win = null;

function createWindow() {
  win = new BrowserWindow({...});
  win.on('closed', () => {
    // ✅ Critical: allow GC to collect the window
    win = null;
  });
}
```

Without nullification, the window object remains in memory even after the window is closed.

## Pattern 10 - Main process architecture

Keep the main entry point thin:

```js
// electron/main.js
const { app } = require("electron");
const { bootstrap } = require("./_bootstrap.js");

app.whenReady().then(() => bootstrap());
```

```js
// electron/_bootstrap.js
const { createMainWindow } = require("./windows/_main.js");
const { registerAllHandlers } = require("./ipc/index.js");

function bootstrap() {
  createMainWindow();
  registerAllHandlers();
  // Lazy-load non-critical features
  import("./features/_auto-updater.js").then((m) => m.init());
}
```

## Measurement notes

- **Electron DevTools**: Performance tab for main process profiling
- **Chrome DevTools in renderer**: Performance, Memory, Network tabs
- **`process.getProcessMemoryInfo()`**: Memory usage in main process
- **`app.getAppMetrics()`**: CPU and memory per process
- **electron-builder output**: Package size breakdown

## Final principle

Electron apps have three performance levers: IPC batching, window lifecycle management, and dependency minimization. Fix these before any micro-optimizations.
