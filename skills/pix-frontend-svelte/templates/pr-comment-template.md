````md
Observation: [what the code currently does]

Risk: [why this causes a bug, performance issue, or maintenance problem]

Suggested fix: [smallest practical change]

Example:

```svelte
<!-- code sample -->
```
````

Rule of thumb: [one reusable sentence]

````

## Example comment

```md
Observation: This component uses `$effect` to compute a doubled value from `count`.

Risk: `$effect` runs after DOM update and can cause extra work. It is also harder to reason about than a declarative derived value.

Suggested fix: Replace `$effect` with `$derived`.

Rule of thumb: Use `$derived` for computed values, `$effect` for side effects only.
````
