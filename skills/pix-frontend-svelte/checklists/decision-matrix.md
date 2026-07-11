# Svelte 5 Performance Decision Matrix

| Symptom | Check first | Likely cause | Recommended move |
|---|---|---|---|
| Derived value stale | Computation method | `$effect` for derivation | Use `$derived` |
| Effect runs extra times | Dependency tracking | Unstable reactive dep | Stabilize or isolate dep |
| List loses focus on reorder | Key | No key or index key in `{#each}` | Use stable key expression |
| Form keeps old data | Component identity | Missing reset | Use `{#key entityId}` |
| Sibling re-renders on unrelated input | State owner | `$state` too high | Move state to child |
| Memory leak | Effect cleanup | No cleanup return | Add cleanup to `$effect` |
| Race condition in fetch | Async handling | No cancellation | Add `AbortController` or flag |
| Redundant state tracked | State choice | `$state` for derived value | Replace with `$derived` |
| Large component unmaintainable | Responsibilities | Mixed concerns | Extract store + view |
| Shared state inconsistent | Store design | State in unrelated components | Use `.svelte.js` module |
