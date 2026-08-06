Review the following Angular code for performance and maintainability issues.

Focus on:

- `ChangeDetectionStrategy.Default` used instead of `OnPush`
- RxJS `BehaviorSubject` used where `signal()` would be simpler
- Missing `track` in `@for` or index-based tracking
- Derived values computed in `effect()` or lifecycle hooks instead of `computed()`
- Missing subscription cleanup (no `takeUntilDestroyed` or `ngOnDestroy`)
- State owned in a global service when it should be local
- Eagerly loaded routes or components
- Missing `@defer` for heavy components
- `ngDoCheck` or `ChangeDetectorRef` used manually
- Components with too many responsibilities

For each issue, return:

````md
### Issue title

- Pattern: [one of the Angular patterns]
- Severity: correctness | performance | maintainability | API design | visual glitch | premature optimization
- Why it matters:
- Suggested fix:

```typescript
// improved snippet
```
````

Rule of thumb:

````

Review this code:

```typescript
PASTE_CODE_HERE
````
