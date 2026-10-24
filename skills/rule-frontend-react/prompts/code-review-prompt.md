# Code Review Prompt

Review the following React code for performance and maintainability issues.

Focus on:

- Dependent state that should be a reducer
- Confusion between `useTransition` and debounce
- State placed too high in the component tree
- `useEffect` used for derived state
- Index keys in changing lists
- Missing intentional key reset for forms or entity-specific UI
- Unnecessary `useMemo`
- Components with too many reasons to change
- Flicker that may require `useLayoutEffect`
- Prop soup that should become composition or compound components

For each issue, return:

````md
### Issue title

- Pattern:
- Severity: correctness | performance | maintainability | API design | visual glitch | premature optimization
- Why it matters:
- Suggested fix:

```tsx
// improved snippet when useful
```
````

Rule of thumb:

````

Review this code:

```tsx
PASTE_CODE_HERE
````
