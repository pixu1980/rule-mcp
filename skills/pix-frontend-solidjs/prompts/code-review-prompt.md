Review the following SolidJS code for performance and maintainability issues.

Focus on:

- Destructured props (breaks reactivity)
- `.map()` used on reactive arrays instead of `<For>`
- Ternary conditionals instead of `<Show>` / `<Switch>`
- Missing `createMemo` for expensive or referentially unstable derived values
- `createSignal` used where `createStore` would be better
- Manual async fetch instead of `createResource`
- Signals owned too high in the component tree
- Missing `onCleanup` in effects with resources
- Use of `untrack()` where needed or misuse of it
- Components with too many responsibilities

For each issue, return:

```md
### Issue title

- Pattern: [one of the SolidJS patterns]
- Severity: correctness | performance | maintainability | API design | premature optimization
- Why it matters:
- Suggested fix:

```jsx
// improved snippet
```

Rule of thumb:
```

Review this code:

```jsx
PASTE_CODE_HERE
```
