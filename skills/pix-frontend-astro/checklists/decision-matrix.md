# Astro Performance Decision Matrix

| Symptom                            | Check first        | Likely cause                        | Recommended move                     |
| ---------------------------------- | ------------------ | ----------------------------------- | ------------------------------------ |
| Slow initial page load             | Client JS size     | Too many or wrong client directives | Use `client:visible` / `client:idle` |
| Heavy page despite static content  | Island boundaries  | Whole-page framework island         | Narrow island scope                  |
| Slow navigation                    | Navigation         | Missing View Transitions            | Add `<ViewTransitions />` + prefetch |
| Large LCP                          | Image loading      | Unoptimized images                  | Use `<Image />` with lazy loading    |
| First load ships framework runtime | Framework need     | Framework for simple interaction    | Replace with vanilla JS              |
| Content querying is slow           | Content approach   | Manual frontmatter parsing          | Use Content Collections              |
| SSR server costs high              | Rendering strategy | SSR for static content              | Switch to SSG                        |
| Layout HTML duplicated             | Layout structure   | No layout nesting                   | Use nested layouts                   |
| Render-blocking resources          | Resource loading   | CSS/JS in `<head>`                  | Defer non-critical                   |
| Astro component too complex        | Component design   | Mixed data + view logic             | Extract data module                  |
