````md
Observation: [what the code currently does]

Risk: [why this can cause a bug, performance issue, or maintenance problem]

Suggested fix: [smallest practical change]

Example:

```vue
<!-- code sample -->
```
````

Rule of thumb: [one reusable sentence]

````

## Example comment

```md
Observation: `loading`, `error`, and `user` are managed through separate `ref()` calls and updated independently through multiple watchers.

Risk: these values can drift into invalid combinations, such as showing an error while also rendering user data.

Suggested fix: model the fetch lifecycle as one reactive state object or a composable that returns a single discriminated state shape.

Rule of thumb: when state values depend on each other, group them in one reactive object or one composable return.
````
