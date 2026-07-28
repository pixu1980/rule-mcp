---
name: rule-platform
description: >-
  Use when building platform-specific projects to route to the correct platform skill. Covers desktop, mobile (Expo), library authoring, and web conventions.
tags:
  - "platform"
  - "desktop"
  - "electron"
  - "mobile"
  - "expo"
  - "library"
  - "web"
  - "index"
frameworks: [all]
---

# rule-platform — Platform Skills Index

## Available Skills

| Skill | Platform | Best For |
|-------|----------|----------|
| [rule-platform-desktop](../rule-platform-desktop/SKILL.md) | Desktop (Electron) | Cross-platform desktop apps, IPC, native APIs |
| [rule-platform-expo](../rule-platform-expo/SKILL.md) | Mobile (Expo/RN) | Cross-platform mobile apps, EAS Build |
| [rule-platform-library](../rule-platform-library/SKILL.md) | npm package | Library authoring, dual CJS/ESM, public API |
| [rule-platform-web](../rule-platform-web/SKILL.md) | Web platform | PWA, service workers, offline, performance budgets |

## Quick Selection Guide

```
Need desktop app (Electron)?            → rule-platform-desktop
Need mobile app (Expo)?                 → rule-platform-expo
Need to publish an npm package?         → rule-platform-library
Need PWA / offline web app?             → rule-platform-web
Need full app (web+desktop+backend)?    → Multi-target structure below
```

## Multi-target Project Structure

When a single project combines **web frontend**, **desktop shell**, and **API backend**, use layer-based naming under `src/`:

```
project/
├── src/
│   ├── web/              ← Frontend (Vanilla JS, React, Vue, etc.)
│   │   ├── index.html
│   │   ├── index.js
│   │   ├── components/
│   │   ├── lib/
│   │   ├── tests/        ← Frontend-specific tests
│   │   └── ...
│   │
│   ├── api/              ← Backend API (FastAPI, Express, Hono, etc.)
│   │   ├── server.py / server.js
│   │   ├── routes/
│   │   ├── models/
│   │   ├── tests/        ← Backend-specific tests
│   │   └── ...
│   │
│   └── desktop/          ← Desktop shell (Electron, Tauri, etc.)
│       ├── main.js
│       ├── preload.js
│       ├── ipc/
│       ├── tests/        ← Desktop-specific tests
│       └── ...
│
├── docs/                  ← Documentation (ADR, PRD, analysis)
├── scripts/               ← Build/dev/utility scripts
├── package.json
└── ...
```

### Convention

| Component | `src/` dir | Purpose | Technology lock |
|---|---|---|---|
| Frontend | `src/web/` | Browser UI (HTML, JS, CSS) | None — Vanilla, React, Vue, etc. |
| Backend | `src/api/` | HTTP API server | FastAPI, Express, Hono, etc. |
| Desktop | `src/desktop/` | Native desktop wrapper | Electron, Tauri, etc. |

### Naming rationale

| Name | Why not `app/` | Why not `electron/` |
|---|---|---|
| `web/` | `app/` è troppo generico (cosa non è app?). `web/` dice esattamente cosa contiene | — |
| `api/` | Già specifico, resta | — |
| `desktop/` | — | `electron/` lega il nome alla tecnologia. Se passi a Tauri, `desktop/` non cambia |

### Test co-location

Tests appartengono al componente che testano, non a un `tests/` centralizzato:

```
src/
├── web/tests/           ← Frontend tests (Playwright, Vitest)
├── api/tests/           ← Backend tests (pytest, node:test)
└── desktop/tests/       ← Desktop tests (Playwright Electron)
```

Eccezioni (restano a livello progetto):
- Test che attraversano più layer (es. integration test web+api)
- Playwright config condivisa

### Wiring

| File | Old path | New path |
|---|---|---|
| `desktop/main.js` → build | `../frontend/build/` | `../web/build/` |
| `desktop/server.js` → BUILD_DIR | `../frontend/build/` | `../web/build/` |
| `desktop/tests/spec.js` → electron | `../electron/node_modules/` | `../node_modules/` (co-located) |
| `scripts/build-sprite.js` → icons | `../frontend/public/assets/icons/` | `../src/web/public/assets/icons/` |
| `.gitignore` → electron binary | `electron/node_modules/electron/` | `src/desktop/node_modules/electron/` |

### Principles

1. **Discoverability**: A new developer knows where each layer lives by looking at `src/`
2. **Uniformity**: All source code belongs under `src/`, regardless of runtime or language
3. **Layer independence**: `src/web/` can have its own build tooling (Vite, CRA), `src/api/` its own runtime (Python, Node), `src/desktop/` its own framework (Electron, Tauri)
4. **Test proximity**: Tests stay near the code they test, making it obvious which layer a test belongs to
5. **Technology agnosticism**: `desktop/` non lega a Electron, `web/` non lega a React

### See also

- [rule-platform-web](../rule-platform-web/SKILL.md) — Web file tree convention (for content inside `src/web/`)
- [rule-platform-desktop](../rule-platform-desktop/SKILL.md) — Desktop Electron convention (for content inside `src/desktop/`)
- [rule-backend](../rule-backend/SKILL.md) — Backend conventions (for content inside `src/api/`)
- [rule-styleguide-naming](../rule-styleguide-naming/SKILL.md) — Naming conventions
- [rule-architect](../rule-architect/SKILL.md) — Scaffolding and architecture decisions
- [rule-toolchain-project](../rule-toolchain-project/SKILL.md) — Base project config files

## See also

- [rule-frontend-react](../rule-frontend-react/SKILL.md) — React UI for desktop/web
- [rule-devops-docker](../rule-devops-docker/SKILL.md) — Docker deployment
- [rule](../rule/SKILL.md) — Central skill index
