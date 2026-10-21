---
name: pix-platform
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

# pix-platform - Platform Skills Index

## Available Skills

| Skill                                                    | Platform           | Best For                                                    |
| -------------------------------------------------------- | ------------------ | ----------------------------------------------------------- |
| [pix-platform-desktop](../pix-platform-desktop/SKILL.md) | Desktop (Electron) | Cross-platform desktop apps, IPC, native APIs               |
| [pix-platform-library](../pix-platform-library/SKILL.md) | npm package        | Library authoring, dual CJS/ESM, public API                 |
| [pix-platform-web](../pix-platform-web/SKILL.md)         | Web platform       | PWA, service workers, offline, performance budgets          |

## Quick Selection Guide

```
Need desktop app (Electron)?            → pix-platform-desktop
Need to publish an npm package?         → pix-platform-library
Need PWA / offline web app?             → pix-platform-web
```

## See also

- [pix-frontend-react](../pix-frontend-react/SKILL.md) - React UI for desktop/web
- [pix-devops-docker](../pix-devops-docker/SKILL.md) - Docker deployment
- [pix](../pix/SKILL.md) - Central skill index
