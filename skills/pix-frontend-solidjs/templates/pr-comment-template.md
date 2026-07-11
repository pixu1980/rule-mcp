```md
Observation: [what the code currently does]

Risk: [why this can cause a bug, performance issue, or maintenance problem]

Suggested fix: [smallest practical change]

Example:

```jsx
// code sample
```

Rule of thumb: [one reusable sentence]
```

## Example comment

```md
Observation: This component destructures props: `function Item({ name, value })`.

Risk: Destructuring reads props once and severs Solid's reactive tracking. The component will not update when `name` or `value` change.

Suggested fix: Access `props.name` and `props.value` directly, or use `mergeProps()` if you need defaults.

Rule of thumb: Never destructure SolidJS props — they are reactive proxies.
```
