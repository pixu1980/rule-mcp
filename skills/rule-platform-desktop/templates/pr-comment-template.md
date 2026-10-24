````md
Observation: [what the code currently does]

Risk: [why this affects performance, UX, or maintainability]

Suggested fix: [smallest practical change]

Example:

```js
// code sample
```
````

Rule of thumb: [one reusable sentence]

````

## Example comment

```md
Observation: Three sequential IPC calls (`loadUser`, `loadPreferences`, `loadRecentFiles`) are made one after another.

Risk: Each IPC round-trip adds latency. The total time is the sum of three round-trips plus serialization overhead.

Suggested fix: Create a single `loadInitialData` channel that returns all data in one response, or use `Promise.all` to parallelize independent calls.

Rule of thumb: Batch related IPC calls into one channel. One round-trip is faster than three.
````
