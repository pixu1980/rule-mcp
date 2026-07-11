# Vue 3 Performance Decision Matrix

| Symptom | Check first | Likely cause | Recommended move |
|---|---|---|---|
| Reactive value doesn't update in template | Reactive container choice | `reactive()` with primitive or destructured ref | Use `ref()` for primitives, keep reactive access chain |
| Watcher runs infinitely | Mutation inside watcher | Loop through state mutation | Move mutation outside or use `computed` |
| Computed value stale | Dependency tracking | Missing reactive dependency | Ensure all deps are accessed in getter |
| Sibling re-renders on input | State owner | State too high in tree | Move `ref()` / `reactive()` to child |
| v-for loses focus on reorder | List key | Index key identity bug | Use stable item IDs |
| Form keeps previous entity data | Component identity | No key reset | Add `:key="entityId"` |
| Deep prop chain is fragile | Prop drilling | Component API design | Use `provide/inject` |
| Typing feels slow | Reactive trigger scope | Overly broad reactive dependency | Narrow reactivity or split component |
| Large component is hard to modify | Reasons to change | Mixed responsibilities | Extract composable + view |
| Modal clipped by parent overflow | Portal | No Teleport | Use `<Teleport to="body">` |
| Template ref is null | Access timing | Ref accessed before mount | Use `onMounted` or `nextTick` |

## Fast diagnosis questions

1. Is the reactive container appropriate for the data shape?
2. Is the watcher necessary, or could a computed replace it?
3. Is state located where the change actually happens?
4. Are list keys stable?
5. Are we computing something we could just read?
6. Is the component doing too many things?
