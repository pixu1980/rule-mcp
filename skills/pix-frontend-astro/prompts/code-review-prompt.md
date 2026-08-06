Review the following Astro code for performance and UX issues.

Focus on:

- Client directive choices (could `client:visible` replace `client:load`?)
- Island scope (whole-page island vs small interactive element)
- Missing `<ViewTransitions />` or prefetch
- Image optimization (missing `loading="lazy"`, no `<Image />`)
- Content not using Content Collections
- SSR used where SSG would work
- Framework island for simple interactivity
- Duplicated layout boilerplate
- Render-blocking resources
- Astro component with too much logic in frontmatter

For each issue, return:

````md
### Issue title

- Pattern: [one of the Astro patterns]
- Severity: performance | UX | maintainability | bundle size
- Why it matters:
- Suggested fix:

```astro
---
// improved snippet
---
```
````

Rule of thumb:

````

Review this code:

```astro
PASTE_CODE_HERE
````
