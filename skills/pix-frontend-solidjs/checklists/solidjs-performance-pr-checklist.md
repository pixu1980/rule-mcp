# SolidJS Performance PR Checklist

## 1. Prop access

- Are props accessed directly (never destructured)?
- Is `mergeProps` used when splitting or merging props is needed?

## 2. Control flow

- Is `<For>` used instead of `.map()` for reactive arrays?
- Is `<Show>` used instead of ternary for conditional display?
- Is `<Switch>` / `<Match>` used instead of chained ternaries?
- Are all control flow components given stable `each` and `key` props?

## 3. Derived values

- Are expensive computations wrapped in `createMemo`?
- Are simple values left un-memoized?
- Are `createMemo` dependencies correct (no missing or extra signals)?

## 4. State management

- Is `createSignal` used for flat values and primitives?
- Is `createStore` used for deeply nested state?
- Are store paths updated with the correct setter syntax?
- Are signals owned by the component that reads them?

## 5. Async data

- Is `createResource` used for async data fetching?
- Is `Suspense` used to handle loading states?
- Are resources properly keyed by source signal?

## 6. Side effects

- Does every `createEffect` have appropriate cleanup via `onCleanup`?
- Are effects limited to true side effects (not derived values)?
- Is `untrack()` used intentionally to exclude signals from effect dependencies?

## 7. Component boundaries

- Are signals kept as close as possible to where they are read?
- Are heavy components isolated from unrelated signal updates?

## 8. Responsibility split

- Does the component have one reason to change?
- Are data fetching, formatting, and rendering separated?

## 9. Memory management

- Are intervals, event listeners, and subscriptions cleaned up?
- Are resources properly tracked?

## 10. Final review

- Is the optimization solving a real bottleneck?
- Is the fix simpler than the problem?
