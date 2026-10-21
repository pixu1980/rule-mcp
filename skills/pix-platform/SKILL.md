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

# rule-platform - Platform Skills Index

## Available Skills

| Skill                                                    | Platform           | Best For                                                    |
| -------------------------------------------------------- | ------------------ | ----------------------------------------------------------- |
| [rule-platform-desktop](../rule-platform-desktop/SKILL.md) | Desktop (Electron) | Cross-platform desktop apps, IPC, native APIs               |
| [rule-platform-library](../rule-platform-library/SKILL.md) | npm package        | Library authoring, dual CJS/ESM, public API                 |
| [rule-platform-web](../rule-platform-web/SKILL.md)         | Web platform       | PWA, service workers, offline, performance budgets          |

## Quick Selection Guide

```
Need desktop app (Electron)?            → rule-platform-desktop
Need to publish an npm package?         → rule-platform-library
Need PWA / offline web app?             → rule-platform-web
```

## See also

- [rule-frontend-react](../rule-frontend-react/SKILL.md) - React UI for desktop/web
- [rule-devops-docker](../rule-devops-docker/SKILL.md) - Docker deployment
- [rule](../rule/SKILL.md) - Central skill index
