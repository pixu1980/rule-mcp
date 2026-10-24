Review the following Svelte 5 code for performance and maintainability issues.

Focus on:

- `$effect` used for deriving state instead of `$derived`
- `$state` owned too high in the component tree
- Missing key or index key in `{#each}`
- Missing `{#key}` for component reset
- Missing cleanup return in `$effect`
- Async race conditions in `$effect`
- Storing state that could be derived
- Components with too many responsibilities
- Shared state in wrong scope

For each issue, return:

````md
### Issue title

- Pattern: [one of the Svelte patterns]
- Severity: correctness | performance | maintainability | API design | premature optimization
- Why it matters:
- Suggested fix:

```svelte
<!-- improved snippet -->
```
````

Rule of thumb:

````

Review this code:

```svelte
PASTE_CODE_HERE
````
