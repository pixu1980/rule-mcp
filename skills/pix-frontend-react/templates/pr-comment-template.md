# PR Comment Template

````md
Observation: [what the code currently does]

Risk: [why this can cause a bug, performance issue, visual glitch, or maintenance problem]

Suggested fix: [smallest practical change]

Example:

```tsx
// code sample
```
````

Rule of thumb: [one reusable sentence]

````

## Example comment

```md
Observation: `loading`, `error`, and `user` are managed through separate `useState` calls and updated independently.

Risk: this can create invalid UI states, such as rendering user data while an old error is still present.

Suggested fix: model the fetch lifecycle as one state transition with `useReducer` or a discriminated union.

Rule of thumb: when state values must stay in sync, update them through one action.
````
