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

| Task | Technique |
|------|-----------|
| Main process | `electron --inspect=5858 .` → Chrome DevTools → Node.js icon |
| Renderer | Open DevTools with `win.webContents.openDevTools()` |
| Preload | `console.log` statements appear in the renderer DevTools console |
| IPC tracing | Add `ipcMain` / `ipcRenderer` event listeners for `'before-input-event'` |
| Performance | `electron --js-flags="--trace-gc"` for garbage collection logging |

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
