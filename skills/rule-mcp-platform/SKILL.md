---
name: rule-mcp-platform
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

# rule-mcp-platform - Platform Skills Index

## Available Skills

| Skill                                                              | Platform           | Best For                                           |
| ------------------------------------------------------------------ | ------------------ | -------------------------------------------------- |
| [rule-mcp-platform-desktop](../rule-mcp-platform-desktop/SKILL.md) | Desktop (Electron) | Cross-platform desktop apps, IPC, native APIs      |
| [rule-mcp-platform-library](../rule-mcp-platform-library/SKILL.md) | npm package        | Library authoring, dual CJS/ESM, public API        |
| [rule-mcp-platform-web](../rule-mcp-platform-web/SKILL.md)         | Web platform       | PWA, service workers, offline, performance budgets |

## Quick Selection Guide

```
Need desktop app (Electron)?            → rule-mcp-platform-desktop
Need to publish an npm package?         → rule-mcp-platform-library
Need PWA / offline web app?             → rule-mcp-platform-web
```

## See also

- [rule-mcp-frontend-react](../rule-mcp-frontend-react/SKILL.md) - React UI for desktop/web
- [rule-mcp-devops-docker](../rule-mcp-devops-docker/SKILL.md) - Docker deployment
- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index
