Review the following Electron code for performance and UX issues.

Focus on:

- Sequential IPC calls that could be batched
- High-frequency IPC calls without throttling
- All windows created eagerly at startup
- Missing `show: false` + `ready-to-show` pattern
- CPU-heavy work in main process without worker threads
- Native modules where built-in alternatives exist
- Unnecessary dependencies
- Missing window reference cleanup in `closed` event
- ASAR configuration issues
- Bloated main.js entry point

For each issue, return:

````md
### Issue title

- Pattern: [one of the Electron patterns]
- Severity: performance | UX | maintainability | security | bundle size
- Why it matters:
- Suggested fix:

```js
// improved snippet
```
````

Rule of thumb:

````

Review this code:

```js
PASTE_CODE_HERE
````
