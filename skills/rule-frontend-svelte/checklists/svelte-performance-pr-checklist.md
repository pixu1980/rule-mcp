# Svelte 5 Performance PR Checklist

## 1. Computed values

- Is `$derived` used for all derived values?
- Is `$effect` reserved for true side effects?
- Is there any `$state` + `$effect` pair that should be `$derived`?

## 2. State ownership

- Is `$state` in the smallest component that needs it?
- Could any `$state` be moved to a child component?
- Is shared state properly extracted to a `.svelte.js` module?

## 3. List keys

- Does every `{#each}` have a stable key expression `(item.id)`?
- Is index key avoided for lists that can reorder, filter, insert, or delete?

## 4. Component identity

- Is `{#key}` used for intentional component reset (forms, entity-specific UI)?
- Are forms resetting cleanly when the selected entity changes?

## 5. Effect cleanup

- Does every `$effect` with persistent resources return a cleanup function?
- Are intervals, event listeners, observers, and subscriptions cleaned up?
- Are async operations using cancellation flags or `AbortController`?

## 6. Snippets

- Are `{#snippet}` used for reusable template fragments?
- Are snippets preferred over repeated `<slot>` patterns?

## 7. Responsibility boundaries

- Does the component have one reason to change?
- Are data fetching, state transitions, formatting, and UI rendering separated?
- Is shared logic extracted to `.svelte.js` modules?

## 8. Reactive declarations

- Are all `$derived` dependencies reactive (not plain values)?
- Are `$derived` simple and side-effect-free?

## 9. Template optimization

- Are expensive operations avoided in template expressions?
- Is `{#each}` used with keys for efficient list updates?

## 10. Final review

- Is the fix simpler than the problem?
- Is the optimization solving a real bottleneck?
