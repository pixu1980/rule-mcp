Refactor the following Electron code using the rule-mcp-electron performance patterns.

Goals:

- Preserve behavior
- Batch IPC calls
- Throttle high-frequency IPC
- Lazy-create windows
- Add ready-to-show pattern
- Offload CPU work to workers
- Replace native modules with built-ins
- Clean up window references
- Optimize packaging config

Return:

1. A short diagnosis
2. The refactored code
3. A list of changes and why they help
4. Trade-offs or assumptions
5. A rule of thumb for future work
