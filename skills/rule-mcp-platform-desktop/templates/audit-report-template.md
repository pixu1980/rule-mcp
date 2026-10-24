# Electron Performance Audit Report

## Summary

## Highest-impact finding

## Findings

### 1. Finding title

- Pattern:
- Severity:
- Location:
- Risk:
- Suggested fix:
- Effort: small | medium | large

## Priority order

1. IPC batching and throttling
2. Window lifecycle
3. Main process responsiveness
4. Native modules and dependencies
5. Startup time
6. Packaging
7. Memory management

## Measurement suggestions

- Electron DevTools Performance tab
- Chrome DevTools in renderer
- `process.getProcessMemoryInfo()`
- `app.getAppMetrics()`
- electron-builder output

## Rules of thumb

- Batch IPC calls
- Throttle with rAF
- Lazy windows with ready-to-show
- Nullify on close
- Workers for CPU work
- Built-ins over native modules
- ASAR enabled, native modules unpacked
