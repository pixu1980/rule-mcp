```md
Observation: [what the code currently does]

Risk: [why this affects performance or UX]

Suggested fix: [smallest practical change]

Example:

```astro
---
// improved snippet
---
```

Rule of thumb: [one reusable sentence]
```

## Example comment

```md
Observation: This component is wrapped in a `client:load` island but is below the fold.

Risk: The island's JS (including framework runtime) loads immediately on page load, delaying LCP and increasing initial JS bundle.

Suggested fix: Change `client:load` to `client:visible` so the JS loads only when the element enters the viewport.

Rule of thumb: Use `client:visible` for below-the-fold components, `client:idle` for non-critical above-the-fold components.
```
