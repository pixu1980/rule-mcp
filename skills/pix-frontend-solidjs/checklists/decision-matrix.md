# SolidJS Performance Decision Matrix

| Symptom | Check first | Likely cause | Recommended move |
|---|---|---|---|
| UI not updating after prop change | Prop access pattern | Destructured props | Access `props.X` directly |
| List recreates all DOM on change | List rendering method | `.map()` on signal | Use `<For each={items()}>` |
| Conditional mount not cleaning up | Control flow | Ternary instead of `<Show>` | Use `<Show>` / `<Switch>` |
| Too many computations on render | Derived values | Inline expensive calculations | Wrap in `createMemo` |
| Deep nested state not reactive | Store choice | `createSignal` for object | Use `createStore` |
| Effect re-runs on unrelated signals | Dependencies | Missing `untrack()` | Wrap non-dependency reads in `untrack` |
| Memory leak on navigation | Cleanup | No `onCleanup` | Add cleanup to all effects |
| Loading state awkward | Async data | Manual fetch + signal | Use `createResource` |
| Heavy sibling updates on unrelated state | Signal ownership | Signal too high in tree | Move signal down |
| Large component is hard to maintain | Responsibilities | Mixed concerns | Extract hooks + view |
