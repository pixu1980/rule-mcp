---
name: rule-platform-desktop
description: >-
  Use when building desktop applications with Electron. Covers main/preload/IPC, native APIs, window management, packaging, and auto-update.
tags:
  - "platform"
  - "desktop"
frameworks: [electron, desktop]
---

# rule-platform-desktop — Desktop Applications with rule Principles

This skill is the **project type umbrella for desktop apps**.
Choose a desktop framework below, then pair with a UI framework.

## Supported Desktop Frameworks

| Framework                  | Skill plugin                    | Platform                   | Runtime               |
| -------------------------- | ------------------------------- | -------------------------- | --------------------- |
| **Electron** (embedded)    | rule-platform-desktop/electron   | macOS, Windows, Linux      | Chromium + Node.js    |
| **Tauri** (planned)        | rule-platform-desktop/tauri      | macOS, Windows, Linux      | System webview + Rust |
| **Neutralinojs** (planned) | rule-platform-desktop/neutralino | macOS, Windows, Linux, Web | Native OS APIs        |

## When to use rule-platform-desktop

- Building any desktop application (cross-platform)
- Choosing Electron as the desktop framework for mature ecosystem and full Chromium APIs
- Setting up IPC between main/preload and renderer processes
- Integrating native OS features (file system, shell, menus, notifications, auto-updater)
- Packaging with electron-builder for distribution
- Planning migration from Electron to Tauri for smaller bundles

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** — only element selectors + `[data-part="..."]` + `[data-*]` attribute selectors
2. **Zero inline styles** — all styling in external `.css` files via `adoptedStyleSheets`
3. **Semantic HTML is mandatory** — never `<div>` where `<section>`, `<article>`, `<header>`, etc. exists
4. **Barrel pattern** — every component folder has `index.js` re-export, files are `_PascalCase.ext`
5. **No CSS-in-JS, no Tailwind** — external `.css` files only
6. **IPC isolation** — `contextBridge` + `ipcRenderer` in preload, never `nodeIntegration: true`
7. **Main process is thin orchestration** — defer business logic to modules

---

# Electron Framework (rule-platform-desktop/electron)

The following sections cover the **Electron** desktop framework within rule-platform-desktop.

## File Tree Convention (Electron)

```
project/
├── electron/
│   ├── main.js              ← Main process entry (thin)
│   ├── preload.js           ← Context bridge (minimal)
│   ├── ipc/                 ← IPC handler modules
│   │   ├── index.js         ← Barrel
│   │   ├── _archive.js      ← Archive read/write handlers
│   │   ├── _pdf.js          ← PDF generation handlers
│   │   └── _config.js       ← Config handlers
│   ├── helpers/             ← Main-process utilities
│   │   ├── index.js
│   │   ├── _paths.js        ← Directory/path resolution
│   │   └── _venv.js         ← Python virtualenv bootstrap
│   └── __tests__/
│       ├── _archive.test.js
│       └── _pdf.test.js
├── src/
│   ├── index.html
│   └── components/...       ← rule-styleguide barrel structure
├── scripts/
│   ├── generate_pdf.py      ← Optional Python PDF generator
│   └── dev/
│       └── dev-server.js    ← Browser-mode dev server
└── package.json
```

## Main Process Patterns (Electron)

### Thin Entry Point

Keep `electron/main.js` focused on app lifecycle and window creation.
Delegate all IPC handlers to dedicated modules.

```js
// electron/main.js — thin entry point
const { app, BrowserWindow } = require("electron");
const { registerIpcHandlers } = require("./ipc/index.js");

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, "..", "src", "index.html"));
}
```

### IPC Handler Modules

Separate handlers by domain. Each file returns an `ipcMain.handle()` registration function.

```js
// electron/ipc/_archive.js
const { ipcMain } = require("electron");
const { readArchive, writeArchive } = require("../helpers/_archive.js");

function registerArchiveHandlers() {
  ipcMain.handle("load-archive", () => readArchive());
  ipcMain.handle("save-quote", (_, quoteData) => {
    const arch = readArchive();
    const entry = buildEntry(quoteData, arch);
    arch.quotes.unshift(entry);
    writeArchive(arch);
    return { ok: true, entry };
  });
}

module.exports = { registerArchiveHandlers };
```

### Barrel for IPC

```js
// electron/ipc/index.js
const { registerArchiveHandlers } = require("./_archive.js");
const { registerPdfHandlers } = require("./_pdf.js");
const { registerConfigHandlers } = require("./_config.js");

function registerIpcHandlers() {
  registerArchiveHandlers();
  registerPdfHandlers();
  registerConfigHandlers();
}

module.exports = { registerIpcHandlers };
```

## Preload / Context Bridge (Electron)

Always use `contextBridge` + `ipcRenderer.invoke`. Never enable `nodeIntegration`.

```js
// electron/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("qt", {
  loadArchive: () => ipcRenderer.invoke("load-archive"),
  loadConfig: () => ipcRenderer.invoke("load-config"),
  saveQuote: (data) => ipcRenderer.invoke("save-quote", data),
  generatePDF: (data) => ipcRenderer.invoke("generate-pdf", data),
  previewPDF: (path) => ipcRenderer.invoke("preview-pdf", path),
});
```

### Preload Rules

- **Never expose `ipcRenderer.on`** to the renderer — use `invoke` for request/response.
- **Never expose `nodeRequire`** or `process` — use `contextBridge` only.
- **Keep preload minimal** — one function per IPC channel.
- **Name channels with kebab-case** — `"load-archive"`, `"save-quote"`, `"generate-pdf"`.

## Renderer Mocking (Browser Dev Mode for Electron)

Always provide a fallback mock so the app works in browser mode during development.

```js
// In the renderer entry point:
if (typeof qt === "undefined") {
  window.qt = {
    loadArchive: async () => ({ next_number: 1, quotes: [] }),
    loadConfig: async () => ({ brand: "QuoteTool" }),
    saveQuote: async (data) => ({ ok: true, entry: { number: "001" } }),
    generatePDF: async () => {
      throw new Error("PDF only in Electron");
    },
  };
}
```

## Native API Patterns (Electron)

### File System (fs)

```js
const fs = require("fs");
const path = require("path");

function readArchive(filePath) {
  if (!fs.existsSync(filePath)) {
    const init = { next_number: 1, quotes: [] };
    fs.writeFileSync(filePath, JSON.stringify(init, null, 2));
    return init;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
```

### Child Process (spawning Python for PDF)

```js
const { spawn } = require("child_process");

function generatePDF(pythonCmd, scriptPath, dataPath, pdfPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonCmd, [scriptPath, dataPath, pdfPath]);
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      code === 0 ? resolve({ ok: true, pdf_path: pdfPath }) : reject(new Error(stderr.trim()));
    });
  });
}
```

### Shell (opening files)

```js
const { shell } = require("electron");

ipcMain.handle("open-file", (_, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.openPath(filePath);
    return { ok: true };
  }
  return { ok: false, error: "File not found" };
});
```

### Window Management

```js
// Preview window
ipcMain.handle("preview-pdf", (_, pdfPath) => {
  const preview = new BrowserWindow({
    width: 920,
    height: 1100,
    title: "PDF Preview",
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  preview.loadURL(`file://${pdfPath}`);
  return { ok: true };
});
```

## PDF Generation Integration (Electron)

### Python + ReportLab Pattern

```
project/
├── scripts/
│   └── generate_pdf.py    ← PDF generation script
├── requirements.txt       ← Python dependencies
├── .venv/                 ← Python virtualenv (auto-bootstrapped)
└── quotes/
    ├── archive.json       ← Quote archive
    ├── data/              ← Quote JSON files
    └── pdf/               ← Generated PDFs
```

## Packaging with electron-builder (Electron)

### package.json Skeleton

```json
{
  "main": "electron/main.js",
  "build": {
    "appId": "com.example.app",
    "productName": "MyApp",
    "asar": true,
    "directories": { "output": "release" },
    "files": ["electron/**/*", "src/**/*", "assets/**/*", "scripts/**/*", "requirements.txt", "package.json"],
    "mac": { "target": ["dmg", "zip"] },
    "win": { "target": ["nsis", "portable"] },
    "linux": { "target": ["AppImage", "deb", "rpm"] }
  },
  "scripts": {
    "dev": "electron .",
    "build": "electron-builder",
    "dist": "electron-builder --publish never"
  }
}
```

### CSP for Electron

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'"
/>
```

## Auto-Update Patterns

### Electron (electron-updater)

```js
// electron/main.js
const { autoUpdater } = require("electron-updater");

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
  autoUpdater.on("download-progress", (p) => {
    mainWin.webContents.send("update-progress", p.percent);
  });
});
```

Configure publisher in electron-builder:

```json
"publish": [{
  "provider": "github",
  "owner": "myorg",
  "repo": "myapp"
}]
```

### Tauri (built-in updater)

```toml
# tauri.conf.json > plugins > updater
{
  "plugins": {
    "updater": {
      "endpoints": ["https://releases.myapp.com/{{target}}/{{current_version}}"],
      "pubkey": "..."
    }
  }
}
```

## Code Signing & Notarization

### macOS

```
# CI step
xcrun notarytool submit MyApp.dmg --apple-id $APPLE_ID --password $APP_PW --team-id $TEAM_ID
```

Include in electron-builder config:

```json
"mac": {
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build/entitlements.mac.plist"
}
```

### Windows

```
# Set env vars: CSC_LINK, CSC_KEY_PASSWORD
# electron-builder handles authenticating via Azure Key Vault or local .pfx
```

## Crash Reporting

### Electron (Sentry)

```js
const Sentry = require("@sentry/electron");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

- Capture both main and renderer process crashes
- Include system info (OS, Electron version, GPU) for debugging
- Set user context for identifying recurring issues per installation

## Debugging Guide

| Task         | Technique                                                                |
| ------------ | ------------------------------------------------------------------------ |
| Main process | `electron --inspect=5858 .` → Chrome DevTools → Node.js icon             |
| Renderer     | Open DevTools with `win.webContents.openDevTools()`                      |
| Preload      | `console.log` statements appear in the renderer DevTools console         |
| IPC tracing  | Add `ipcMain` / `ipcRenderer` event listeners for `'before-input-event'` |
| Performance  | `electron --js-flags="--trace-gc"` for garbage collection logging        |

### DevTools Extensions

```js
const { BrowserWindow, session } = require("electron");
const devTools = path.join(os.homedir(), ".config/chromium/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/");
session.defaultSession.loadExtension(devTools);
```

## Tauri Patterns

### IPC with Rust Commands

```rust
// src-tauri/src/main.rs
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Frontend Invocation

```js
// In the renderer (any UI framework)
import { invoke } from "@tauri-apps/api/core";

const greeting = await invoke("greet", { name: "World" });
```

### Tauri Config

```json
// src-tauri/tauri.conf.json
{
  "build": {
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173"
  },
  "bundle": {
    "active": true,
    "identifier": "com.myorg.myapp",
    "icon": ["icons/icon.png"]
  }
}
```

## Protocol Handling (Deep Links)

### Electron

```js
app.setAsDefaultProtocolClient("myapp");

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url); // e.g., myapp://open/setting/42
});
```

### Tauri

```toml
# tauri.conf.json
{
  "plugins": {
    "deep-link": {
      "desktop": {
        "schemes": ["myapp"]
      }
    }
  }
}
```

## Guards & Best Practices

### Security

- ✅ `contextIsolation: true` — always
- ✅ `nodeIntegration: false` — always
- ✅ Preload via `contextBridge` only
- ✅ CSP header in HTML
- ✅ Validate file paths with `path.resolve` + prefix check
- ❌ Never expose `ipcRenderer.on` or `require`

### Main Process

- ✅ Keep main.js thin — delegate to modules
- ✅ Handle IPC errors with try/catch
- ✅ Use `worker_threads` for CPU-heavy work
- ✅ Clean up window references on close (nullify `closed` event)

### Renderer

- ✅ Mock IPC for browser dev mode
- ✅ `data-part` attributes (rule-styleguide)
- ✅ Zero CSS classes, zero inline styles
- ✅ Throttle IPC calls with `requestAnimationFrame`

## Quick Reference

```
┌────────────────────────────────────────────────────────────┐
│  rule-platform-desktop — Desktop Application Project Type            │
│                                                           │
│  Framework:  Electron (primary) / Tauri / Neutralinojs    │
│  UI layer:   Any rule-* framework skill                    │
│  Update:     electron-updater / Tauri updater              │
│  Signing:    macOS notarization + Windows Authenticode    │
│  Crash:      Sentry for main + renderer processes          │
│                                                           │
│  electron/                                                 │
│   ├── main.js           ← app lifecycle + createWindow    │
│   ├── preload.js        ← contextBridge only              │
│   ├── ipc/              ← domain handler modules          │
│   └── helpers/          ← fs, path, venv utilities        │
│                                                           │
│  IPC pattern:                                             │
│   preload: qt.fn = () => ipcRenderer.invoke('channel')   │
│   main:    ipcMain.handle('channel', handler)             │
│                                                           │
│  Security: contextIsolation=true, nodeIntegration=false   │
│  Styling:  data-part attributes, zero classes             │
│  Build:    electron-builder, asar, multi-platform         │
└────────────────────────────────────────────────────────────┘
```

---

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
- [rule-platform](../rule-platform/SKILL.md) — Platform skill index
