# Vue 3 Performance PR Checklist

## 1. Reactivity

- Are reactive containers chosen correctly (`ref` vs `reactive` vs `shallowRef`)?
- Is there any destructuring or spreading of reactive objects that breaks tracking?
- Are `reactive` objects replaced instead of mutated where appropriate?
- Could `shallowRef` replace `ref` for large immutable data?

## 2. Watcher hygiene

- Are `watch` / `watchEffect` dependencies explicit and minimal?
- Is any state being mutated inside a watcher that could cause loops?
- Could a `computed` replace a watcher that derives state?
- Is `watchEffect` used for auto-tracked side effects?
- Are watchers properly cleaned up (`onUnmounted` or `{ flush: 'post' }`)?

## 3. Computed values

- Are all reactive dependencies accessed inside the computed getter?
- Do computed values avoid side effects (mutations, API calls)?
- Are expensive computations memoized with `computed` instead of called in the template?

## 4. State ownership

- Is state owned by the smallest component that needs it?
- Does a parent re-render heavy children because state is too high?
- Is state lifted only because it is actually shared?
- Is `provide/inject` used instead of deep prop drilling?

## 5. List keys

- Does every `v-for` use a stable `:key`?
- Is `:key="index"` avoided for lists that can reorder, filter, insert, or delete?
- Are stateful children inside lists protected from identity bugs?

## 6. Component identity

- Is `:key` used to fully reset a component when the entity changes?
- Are forms resetting cleanly when the selected entity changes?

## 7. Responsibility boundaries

- Does the component have one reason to change?
- Are data fetching, state transitions, formatting, and UI rendering mixed together?
- Would a composable cleanly isolate data logic?
- Would smaller components make the file easier to maintain?

## 8. Template optimization

- Is `<Teleport to="body">` used for modals, tooltips, and overlays?
- Are template refs accessed only after mount (in `onMounted` / `nextTick`)?
- Are unnecessary watchers avoided in favor of inline event handlers?
- Is `v-once` or `v-memo` used only after profiling shows a bottleneck?

## 9. Composables

- Do composables return readonly refs for exposed state?
- Do composables clean up watchers and event listeners on unmount?
- Are composables pure — no global side effects?

## 10. Final review

- Is the fix simpler than the problem?
- Is the optimization solving a real bottleneck or a hypothetical one?
- Should measurement with Vue DevTools be done before deeper refactoring?
