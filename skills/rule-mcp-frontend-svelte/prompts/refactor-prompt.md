Refactor the following Svelte 5 component using the rule-mcp-frontend-svelte performance patterns.

Goals:

- Preserve behavior
- Replace $effect derivation with $derived
- Move $state to the correct owner
- Add stable keys to {#each}
- Add {#key} where needed
- Add effect cleanup
- Fix async race conditions
- Split responsibilities

Return:

1. A short diagnosis
2. The refactored code
3. A list of changes and why they help
4. Trade-offs or assumptions
5. A rule of thumb for future work
