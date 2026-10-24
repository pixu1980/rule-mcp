# Angular Performance Decision Matrix

| Symptom                           | Check first               | Likely cause                       | Recommended move                |
| --------------------------------- | ------------------------- | ---------------------------------- | ------------------------------- |
| Slow typing / UI freezes          | Change detection strategy | `Default` strategy                 | Use `OnPush` on every component |
| Too many CD cycles                | State origin              | Global service state used as local | Move to component `signal()`    |
| List recreates all DOM            | Track identity            | Missing `track` in `@for`          | Add `track item.id`             |
| Stale displayed value             | Derivation method         | Computed in lifecycle hook         | Use `computed()`                |
| Memory leak on navigation         | Subscription cleanup      | Missing unsubscribe                | Add `takeUntilDestroyed()`      |
| Slow initial bundle size          | Route loading             | Eager component imports            | Use `loadComponent`             |
| Large component is hard to change | Reasons to change         | Mixed responsibilities             | Extract service + view          |
| Heavy chart blocks initial render | Defer strategy            | Eager heavy component              | Use `@defer (on viewport)`      |
| Manual diff logic in component    | Lifecycle misuse          | `ngDoCheck` usage                  | Replace with `computed()`       |
| Component updates too often       | Input stability           | Mutable input objects              | Use immutable inputs or signals |
