# Electron Performance Decision Matrix

| Symptom | Check first | Likely cause | Recommended move |
|---|---|---|---|
| Slow IPC responses | Round-trip count | Sequential IPC waterfall | Batch related calls into one channel |
| UI jank during IPC | IPC frequency | High-frequency unthrottled calls | Throttle with `requestAnimationFrame` |
| Slow startup (white window) | Window show timing | `show: true` before ready | Use `ready-to-show` event |
| App unresponsive during task | Main thread blocking | CPU task in main process | Offload to `worker_threads` |
| Memory grows on window close | Reference cleanup | Window reference not nullified | Nullify in `closed` event |
| Package too large | Dependencies | Unnecessary or heavy deps | Audit and remove unused deps |
| ASAR fails with native module | Packaging config | Native module inside ASAR | Add to `asarUnpack` |
| Too many windows open | Window management | All windows created eagerly | Lazy-create on demand |
| Slow initial data load | IPC architecture | Unbatched data requests | Batch all initial data in one call |
| main.js hard to read | Architecture | All logic in main entry | Split into domain modules |
