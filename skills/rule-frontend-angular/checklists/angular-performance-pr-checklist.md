# Angular Performance PR Checklist

## 1. Change detection

- Is `ChangeDetectionStrategy.OnPush` set on every component?
- Are there exceptions to `OnPush` with documented justification?
- Is `ChangeDetectorRef.detectChanges()` or `.markForCheck()` used sparingly?

## 2. Signals vs RxJS

- Is `signal()` / `computed()` used for local component state?
- Is RxJS reserved for complex async streams (debounce, combineLatest, switchMap)?
- Are services exposing readonly signals (`.asReadonly()`) instead of writeable ones?

## 3. List tracking

- Does every `@for` use a `track` expression with a stable identifier?
- Is index-based tracking avoided for lists that can reorder, filter, insert, or delete?

## 4. Derived values

- Are computed values using `computed()` instead of `effect()` or lifecycle hooks?
- Is `effect()` used only for side effects (logging, localStorage, imperative API calls)?

## 5. Subscription cleanup

- Are all RxJS subscriptions cleaned up?
- Is `takeUntilDestroyed()` used (Angular 16+) for component-scoped subscriptions?
- Are `setInterval`, `addEventListener`, and other browser APIs cleaned up?

## 6. State ownership

- Is state owned by the component that needs it, not a global service?
- Are services used only for shared state across multiple components?

## 7. Lazy loading

- Are all routes lazy-loaded (via `loadComponent` / `loadChildren`)?
- Is `@defer` used for heavy, non-critical components?

## 8. Responsibility boundaries

- Does the component have one reason to change?
- Are data fetching, state transitions, formatting, and UI rendering separated?

## 9. Template optimization

- Are expensive function calls avoided in template expressions?
- Is `@defer` used for below-the-fold content?
- Are pure pipes used for expensive transformations in legacy RxJS patterns?

## 10. Final review

- Is the optimization solving a real bottleneck?
- Is the fix simpler than the problem?
- Should profiling with Angular DevTools be done before deeper refactoring?
