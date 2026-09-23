# 123: Start the six case-study apps with one port-allocating command

- **Date**: 2026-09-23
- **Status**: accepted
- **Tags**: tooling, case-studies, dev-server, pnpm, electron
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The six case-study apps (3 bookmarks web apps, 3 phonebook Electron apps) each hardcode dev ports (Vite 3000/3001/5173, APIs 4000/3002/8787) and the Electron mains hardcoded their renderer URL. Starting them from six terminals collided on ports, and one app (phonebook-ds4-flash) declared "type": "module" while its electron/main.js used require.

## Decision

Add `pnpm case-studies` (scripts/case-studies/index.mjs) as the single entry point. The script allocates one Vite port and one API port per app from per-app bases, exports them as environment variables (VITE_PORT, PORT, VITE_API_ORIGIN, VITE_API_URL, CORS origins, ELECTRON_RENDERER_URL), starts the six apps in parallel, prefixes every log line with the app label, and kills all process groups on Ctrl-C. The apps read the ports from the environment and keep their old defaults for standalone runs; phonebook-ds4-flash gets electron/package.json with "type": "commonjs" so its CommonJS main loads.

## Consequences

Positive: one command starts all six without port collisions; one Ctrl-C stops everything; the apps stay runnable standalone with their original defaults; missing node_modules install automatically with --ignore-workspace so the nested workspace root is not used. Negative: the case-study configs now carry env-aware ports, and phonebook-ds4-flash carries a nested package.json that only exists to satisfy its CommonJS Electron tree.

## What would end this

Evidence that a case-study app needs a fixed port no environment can move (a tool that only accepts 5173), or that the case studies leave this repository and are launched from their own workspace.

## Alternatives Considered

1. Assign fixed ports per app in each config (rejected: still collides with the user's other processes and needs manual edits when a port is busy)
1. Keep six terminals and document the ports (rejected: the collision and the ds4 ESM bug remain)
1. Use concurrently at the root with hardcoded ports (rejected: does not resolve the Electron renderer URL or the API proxy targets)
