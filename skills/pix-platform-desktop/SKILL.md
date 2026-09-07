---
name: rule-platform-desktop
description: >-
  Use when building desktop applications with Electron. Covers main/preload/IPC, native APIs, window management, packaging, and auto-update.
tags:
  - "platform"
  - "desktop"
frameworks: [electron, desktop]
---

# rule-platform-desktop - Desktop Applications with rule Principles

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

1. **Zero CSS classes** - only element selectors + `[data-part="..."]` + `[data-*]` attribute selectors
2. **Zero inline styles** - all styling in external `.css` files via `adoptedStyleSheets`
3. **Flex first** - `display: grid` only for named areas, subgrid, explicit placement, or auto-fit tracks; anything a flex row or column can do is flex.
4. **Semantic HTML is mandatory** - never `<div>` where `<section>`, `<article>`, `<header>`, etc. exists
5. **Barrel pattern** - every component folder has `index.js` re-export, files are `_PascalCase.ext`
6. **No CSS-in-JS, no Tailwind** - external `.css` files only
7. **IPC isolation** - `contextBridge` + `ipcRenderer` in preload, never `nodeIntegration: true`
8. **Main process is thin orchestration** - defer business logic to modules

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
// electron/main.js - thin entry point
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

- **Never expose `ipcRenderer.on`** to the renderer - use `invoke` for request/response.
- **Never expose `nodeRequire`** or `process` - use `contextBridge` only.
- **Keep preload minimal** - one function per IPC channel.
- **Name channels with kebab-case** - `"load-archive"`, `"save-quote"`, `"generate-pdf"`.

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

## Electron Forge vs electron-builder

| Criterion       | Electron Forge                   | electron-builder                     |
| --------------- | -------------------------------- | ------------------------------------ |
| Maintainer      | Electron project (official)      | Community                            |
| Support model   | Official Electron support        | Community-maintained                 |
| Downloads       | Lower                            | ~2-3M weekly                         |
| Auto-updater    | External (`update-electron-app`) | Built-in (`electron-updater`)        |
| Config location | `forge.config.js`                | `package.json` -> `build` key        |
| Current stable  | v7.x (2026)                      | v26.15.x (2026)                      |
| Next major      | -                                | v27 alpha (ESM-native, Node >=22.12) |

**Decision rule**: Pick **Electron Forge** for official support and all-in-one pipeline. Pick **electron-builder** for the most mature built-in auto-updater and widest community footprint. Both produce signed, updatable installers for all platforms.

> ⚠️ If you do NOT use Electron Forge, other tools are maintained by community members and do NOT come with official support from the Electron project.

---

## Packaging with electron-builder (Electron)

electron-builder produces native installers from a single `build` block in `package.json`.

### Package.json Skeleton (Production-Ready)

```json
{
  "main": "electron/main.js",
  "build": {
    "appId": "com.example.app",
    "productName": "MyApp",
    "asar": true,
    "directories": { "output": "release" },
    "files": ["electron/**/*", "src/**/*", "assets/**/*", "scripts/**/*", "requirements.txt", "package.json"],
    "mac": {
      "category": "public.app-category.productivity",
      "target": ["dmg", "zip"],
      "hardenedRuntime": true,
      "notarize": true
    },
    "win": {
      "target": ["nsis"]
    },
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "category": "Utility"
    },
    "publish": [{ "provider": "github" }]
  },
  "scripts": {
    "dev": "electron .",
    "build": "electron-builder",
    "dist": "electron-builder --publish never"
  }
}
```

### Platform Target Reference

| Platform | Targets                                     | When to use                                                                                                    |
| -------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| macOS    | `dmg`, `pkg`, `zip`                         | DMG = standard drag-to-Applications; PKG = enterprise scripts; **zip = REQUIRED for Squirrel.Mac auto-update** |
| Windows  | `nsis`, `msi`, `portable`                   | NSIS = customizable wizard + uninstaller; MSI = GPO/Intune deployment; portable = no install                   |
| Linux    | `AppImage`, `deb`, `rpm`, `snap`, `flatpak` | AppImage = single executable; deb/rpm = apt/dnf integration; Snap/Flatpak = store distribution                 |

> ⚠️ The `zip` target on macOS is NOT optional if you auto-update: without it, `latest-mac.yml` cannot be created, which causes an `autoUpdater` error. The default macOS target is `dmg+zip`, so there is usually no need to specify it explicitly.

### Build Command

```bash
npx electron-builder --mac --win --linux
```

> ⚠️ You can only fully build a given platform's signed installers on (or for) that platform - which is why CI matters.

### CSP for Electron

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'" />
```

## Auto-Update Patterns

### The Dependency Chain (Critical)

> 🔴 **macOS rule**: Your application MUST be signed for automatic updates to work - this is a requirement of **Squirrel.Mac**. Code signing -> notarization -> working silent updates is one unbreakable chain.

| Scenario           | macOS behavior                                              |
| ------------------ | ----------------------------------------------------------- |
| Signed + notarized | Silent install works                                        |
| Unsigned           | Can notify user about update, but CANNOT replace the binary |

### Electron (electron-updater)

`electron-updater` is electron-builder's companion. It supports GitHub Releases, Amazon S3, DigitalOcean Spaces, Keygen, and generic HTTP(S) servers.

```js
// electron/main.js - minimal two-liner
const { autoUpdater } = require("electron-updater");

app.whenReady().then(() => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});
```

> Do NOT call `setFeedURL` - electron-builder automatically creates an internal `app-update.yml` file on build.

With progress reporting:

```js
// electron/main.js
const { autoUpdater } = require("electron-updater");

app.whenReady().then(() => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("download-progress", (progress) => {
    mainWin.webContents.send("update-progress", progress.percent);
  });

  autoUpdater.on("update-downloaded", () => {
    mainWin.webContents.send("update-ready");
  });
});
```

Where you host releases is set by the `publish` block in your build config:

```json
"publish": [{
  "provider": "github",
  "owner": "myorg",
  "repo": "myapp"
}]
```

This means: push a tag -> CI uploads artifacts to GitHub Release -> updater finds them automatically.

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

### The Dependency Chain

```
Code Signing → Notarization → Working Silent Auto-Update
     ❌              ❌              ❌
  Skip signing and the entire downstream chain collapses.
```

> 🔴 An unsigned macOS app can **notify** about an update but **cannot silently install it**. Signing is non-negotiable for auto-update.

### macOS: Sign, then Notarize

**Prerequisites**: Apple Developer Program membership (99 USD/year; notarization is included at no extra cost). Notarization has been mandatory for Developer-ID apps distributed outside the Mac App Store since macOS 10.15 Catalina.

**electron-builder config** (set in `package.json` -> `build.mac`):

```json
"mac": {
  "hardenedRuntime": true,
  "notarize": true,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist"
}
```

**entitlements.mac.plist**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
</dict>
</plist>
```

**Environment variables** (supply at build time - NEVER in the repo):

```bash
# macOS signing certificate (base64-encoded .p12) and its password
export CSC_LINK="$(base64 -i developer-id.p12)"
export CSC_KEY_PASSWORD="••••••"

# Notarization credentials (App Store Connect API or Apple ID app-specific password)
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### Windows: The 2024 SmartScreen Reality

**Key changes every team must know**:

1. **EV certificates no longer bypass SmartScreen** (2024 change). Years ago, EV-signed files got positive SmartScreen reputation by default. That behavior no longer exists. EV and OV certificates now build reputation equally.

2. **Hardware token requirement** (June 2023). Code-signing private keys must be stored on certified hardware (USB token or HSM). This breaks headless CI for traditional OV/EV certificates.

**Decision order for 2026**:

| Priority | Option                                             | Cost           | CI-friendly  | Notes                                                                                 |
| -------- | -------------------------------------------------- | -------------- | ------------ | ------------------------------------------------------------------------------------- |
| 1️⃣       | **Azure Artifact Signing**                         | ~$10/month     | ✅ Native    | USA, Canada, EU, UK (orgs); USA, Canada (individuals)                                 |
| 2️⃣       | **OV certificate** (DigiCert, Sectigo, GlobalSign) | ~$200-300/year | ❌ USB token | Fallback if outside Azure regions                                                     |
| 3️⃣       | **Keep existing EV cert** until expiry             | ~$300-400/year | ❌ USB token | Still valid if already owned - don't buy new                                          |
| 🆓       | **Microsoft Store** (MSIX)                         | Free           | ✅           | Microsoft re-signs automatically -> **no SmartScreen warning, no certificate needed** |

**Azure Artifact Signing env vars**:

```bash
export AZURE_TENANT_ID="..."
export AZURE_CLIENT_ID="..."
export AZURE_CLIENT_SECRET="..."
```

**Traditional certificate env vars**:

```bash
export CSC_LINK="$(base64 -i cert.pfx)"
export CSC_KEY_PASSWORD="••••••"
```

### Signed vs Unsigned - Quick Reference

|                        | Signed + Notarized                          | Unsigned                                                       |
| ---------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| macOS first launch     | Clean, Gatekeeper passes                    | "Unidentified developer" block; right-click -> Open workaround |
| Windows first download | SmartScreen warning until reputation builds | SmartScreen warning, no reputation inheritance                 |
| macOS auto-update      | ✅ Works silently                           | ❌ Can notify only - cannot replace binary                     |
| Mac App Store eligible | ✅ Yes                                      | ❌ No                                                          |

> Unsigned builds are acceptable for a developer audience comfortable with override steps. For non-technical users - and for any app that auto-updates on macOS - signing is non-negotiable.

## Distribution Channels

Choose by audience reach and how much control/revenue you keep.

| Channel              | Cost                           | Signing required           | Auto-update                 | Best for                            |
| -------------------- | ------------------------------ | -------------------------- | --------------------------- | ----------------------------------- |
| **Your own website** | Hosting only                   | Optional (but recommended) | ✅ via GitHub Releases / S3 | Full control, direct distribution   |
| **GitHub Releases**  | Free                           | Optional                   | ✅ Native electron-updater  | Path of least resistance            |
| **Mac App Store**    | 30% commission (15% under $1M) | ✅ Mandatory               | ❌ (Store handles updates)  | Discovery + trust                   |
| **Microsoft Store**  | 15-30% commission              | ❌ (Microsoft re-signs)    | ❌ (Store handles updates)  | **No SmartScreen, no cert needed**  |
| **Homebrew Cask**    | Free                           | Optional                   | ✅ App-hosted               | Developer audience (`brew install`) |

### Mac App Store Notes

- Requires sandboxing and App Review
- Apple's standard 30% commission, reduced to 15% under the App Store Small Business Program (under $1M USD annual proceeds)
- Disables electron-updater (Store manages updates)

### Microsoft Store - The SmartScreen Hack

Publishing an MSIX package through the Microsoft Store means **Microsoft re-signs your package automatically**. Users never see a SmartScreen warning and you never need to purchase or renew a certificate. The trade-off: store submission, review, and packaging as MSIX rather than distributing a standalone NSIS/MSI installer.

### Homebrew Cask

Free, developer-friendly macOS distribution via a pull request to the [homebrew-cask](https://github.com/Homebrew/homebrew-cask) repo. Ideal for reaching technical users with `brew install myapp`.

## CI/CD with GitHub Actions

You cannot cross-build everything locally: DMG notarization needs macOS, signed Windows installers need Windows tooling. The realistic path is a GitHub Actions matrix.

### Complete release.yml

```yaml
name: Release
on:
  push:
    tags: ["v*"]

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - name: Build, sign, and publish
        run: npx electron-builder --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # macOS signing + notarization (read on macos-latest only)
          CSC_LINK: ${{ secrets.MAC_CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          # Windows: Azure Artifact Signing (read on windows-latest)
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
```

### How It Works

- Each runner builds only its own platform's targets
- electron-builder signs using whichever credentials are present in that runner's environment
- `--publish always` uploads every artifact + `latest*.yml` update metadata to a single GitHub Release
- **Store every secret in repository or environment secrets - never in the workflow file**
- Because Azure Artifact Signing works with plain environment variables, the Windows job needs no USB token and no self-hosted runner

### Secrets to Configure in GitHub

| Secret                 | Platform | Purpose                                |
| ---------------------- | -------- | -------------------------------------- |
| `GH_TOKEN`             | All      | GitHub Releases upload (auto-provided) |
| `MAC_CSC_LINK`         | macOS    | Base64-encoded .p12 certificate        |
| `MAC_CSC_KEY_PASSWORD` | macOS    | Certificate password                   |
| `APPLE_ID`             | macOS    | Apple ID for notarization              |
| `APPLE_APP_PASSWORD`   | macOS    | App-specific password for notarization |
| `APPLE_TEAM_ID`        | macOS    | Apple Developer Team ID                |
| `AZURE_TENANT_ID`      | Windows  | Azure Artifact Signing                 |
| `AZURE_CLIENT_ID`      | Windows  | Azure Artifact Signing                 |
| `AZURE_CLIENT_SECRET`  | Windows  | Azure Artifact Signing                 |

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
| Main process | `electron --inspect=5858 .` -> Chrome DevTools -> Node.js icon           |
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

- ✅ `contextIsolation: true` - always
- ✅ `nodeIntegration: false` - always
- ✅ Preload via `contextBridge` only
- ✅ CSP header in HTML
- ✅ Validate file paths with `path.resolve` + prefix check
- ❌ Never expose `ipcRenderer.on` or `require`

### Main Process

- ✅ Keep main.js thin - delegate to modules
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
┌──────────────────────────────────────────────────────────────────────┐
│  rule-platform-desktop - Desktop Application Project Type             │
│                                                                      │
│  Framework:  Electron (primary) / Tauri / Neutralinojs               │
│  UI layer:   Any rule-* framework skill                               │
│  Packaging:  electron-builder (community) / Forge (official)         │
│  Update:     electron-updater / Tauri updater                        │
│  Signing:    macOS notarization + Windows Azure/OV certificate       │
│  CI/CD:      GitHub Actions matrix (macOS + Windows + Linux)         │
│  Crash:      Sentry for main + renderer processes                    │
│                                                                      │
│  electron/                                                           │
│   ├── main.js           ← app lifecycle + createWindow               │
│   ├── preload.js        ← contextBridge only                         │
│   ├── ipc/              ← domain handler modules                     │
│   └── helpers/          ← fs, path, venv utilities                   │
│                                                                      │
│  IPC pattern:                                                        │
│   preload: qt.fn = () => ipcRenderer.invoke('channel')               │
│   main:    ipcMain.handle('channel', handler)                        │
│                                                                      │
│  Security: contextIsolation=true, nodeIntegration=false              │
│  Styling:  data-part attributes, zero classes                        │
│  Build:    electron-builder, asar, multi-platform                    │
│  Signing chain: sign → notarize → silent auto-update (macOS)         │
│  Distribution: Web, GitHub Releases, App Stores, Homebrew            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Performance review resources

This skill ships a performance review kit alongside the guidance above. Load the
piece that matches the task instead of re-deriving it:

| File                                                                                               | Use for                                                                 |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [knowledge/electron-performance-playbook.md](knowledge/electron-performance-playbook.md)           | IPC, window management, main-process responsiveness, startup and memory |
| [checklists/decision-matrix.md](checklists/decision-matrix.md)                                     | Symptom to likely cause to recommended move                             |
| [checklists/electron-performance-pr-checklist.md](checklists/electron-performance-pr-checklist.md) | Reviewing a PR that touches Electron internals                          |
| [prompts/code-review-prompt.md](prompts/code-review-prompt.md)                                     | Driving a performance-focused review pass                               |
| [prompts/refactor-prompt.md](prompts/refactor-prompt.md)                                           | Refactoring existing Electron code                                      |
| [prompts/teaching-prompt.md](prompts/teaching-prompt.md)                                           | Explaining a finding to the team                                        |
| [prompts/portable-system-prompt.md](prompts/portable-system-prompt.md)                             | Running the reviewer outside this MCP server                            |
| [templates/audit-report-template.md](templates/audit-report-template.md)                           | Writing up an audit                                                     |
| [templates/pr-comment-template.md](templates/pr-comment-template.md)                               | Leaving an actionable PR comment                                        |
| [templates/refactor-plan-template.md](templates/refactor-plan-template.md)                         | Planning a staged refactor                                              |

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-platform](../rule-platform/SKILL.md) - Platform skill index
- [rule-platform-web](../rule-platform-web/SKILL.md) - The renderer is a web app; its rules still apply
- [rule-frontend-workers](../rule-frontend-workers/SKILL.md) - Off-main-thread work in the renderer
- [rule-backend-workers](../rule-backend-workers/SKILL.md) - The main process is Node: same event loop, same worker_threads
