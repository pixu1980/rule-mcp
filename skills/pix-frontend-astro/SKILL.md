---
name: rule-frontend-astro
description: >-
  Use when building Astro islands-architecture sites. Supports zero CSS classes, semantic HTML, partial hydration, and integration with UI frameworks.
tags:
  - "frontend"
  - "astro"
frameworks: [astro]
---

# rule-frontend-astro - Astro with rule Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) and
[rule-frontend-vanilla-reactive](../rule-frontend-vanilla-reactive/SKILL.md) to **Astro** (islands architecture).

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** - only element selectors + `[data-part="..."]` + `[data-*]`
2. **Zero inline styles** - external `.css` files via `adoptedStyleSheets` or `<style>` in `.astro`
3. **Semantic HTML is mandatory** - never `<div>` where a semantic element exists
4. **Barrel pattern** - every component folder has `index.js`
5. **Minimal client JS** - Astro islands with `client:load` / `client:idle` only where needed

## File Tree Convention

```
src/
├── pages/
│   ├── index.astro
│   └── settings.astro
├── components/
│   ├── TodoList/
│   │   ├── index.js                 ← Barrel
│   │   ├── _TodoList.astro          ← Astro component (.astro)
│   │   ├── _TodoList.css            ← External CSS
│   │   └── _TodoList.client.js      ← Client-side JS (island)
│   └── TodoItem/
│       ├── index.js
│       ├── _TodoItem.astro
│       ├── _TodoItem.css
│       └── _TodoItem.client.js      ← Client island
├── layouts/
│   ├── _BaseLayout.astro
│   └── _BaseLayout.css
└── styles/
    ├── index.css
    ├── _base.css
    └── _tokens.css
```

## Component Pattern (.astro)

```astro
---
// components/TodoList/_TodoList.astro
import { TodoItem } from "../TodoItem/index.js";
import "./_TodoList.css";

export interface Props {
  todos: Array<{ id: string; title: string; completed: boolean }>;
}

const { todos } = Astro.props;
---
<section data-part="list">
  <header data-part="header">
    <h2 data-part="title">Todos</h2>
  </header>
  {todos.length > 0 ? (
    <ul data-part="items">
      {todos.map((todo) => (
        <li data-part="item">
          <TodoItem todo={todo} />
        </li>
      ))}
    </ul>
  ) : (
    <p data-part="empty">No todos yet.</p>
  )}
</section>
```

```css
/* components/TodoList/_TodoList.css */
section[data-part="list"] {
  padding: 1rem;
}
header[data-part="header"] {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
```

## Client Island Pattern

For interactive components, extract client JS into a separate file
and load it via `client:load`:

```astro
---
// _InteractiveTodoItem.astro
import "./_InteractiveTodoItem.css";
---
<li data-part="item" class="todo-item-wrapper">
  <span data-part="title">{todo.title}</span>
  <button data-part="delete">Delete</button>
</li>

<script src="./_InteractiveTodoItem.client.js"></script>
```

```js
// _InteractiveTodoItem.client.js
// Vanilla JS - no React/Vue needed for simple interactions
document.querySelectorAll("[data-part='delete']").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest("[data-part='item']");
    item?.remove();
  });
});
```

## Astro ↔ rule-frontend-vanilla-reactive Mapping

| rule-frontend-vanilla-reactive | Astro Equivalent                                                 |
| ----------------------------- | ---------------------------------------------------------------- |
| `html\`\`` tagged templates   | `.astro` template (JSX-like)                                     |
| `{{ expr }}`                  | `{expression}`                                                   |
| `@click=${fn}`                | Client island JS or framework island                             |
| `adoptedStyleSheets`          | `<style>` in `.astro` (scoped by default) or external CSS import |
| `data-part="..."`             | `data-part="..."` (same)                                         |
| Component folder              | `components/PascalCase/`                                         |
| Barrel                        | `index.js` in component folder                                   |

## CSS in Astro

Astro `<style>` tags are **scoped by default** - this is acceptable.
For shared styles, use `adoptedStyleSheets` or `@import` in a global stylesheet.

```astro
---
// Load external CSS (runs once at build time)
import "./_Component.css";
---
<!-- component markup -->

<!-- Also acceptable: scoped <style> for component-specific rules -->
<style>
  [data-part="item"] {
    border-bottom: 1px solid var(--color-border);
  }
</style>
```

## Barrel Pattern

```js
// components/TodoItem/index.js
export { default as TodoItem } from "./_TodoItem.astro";
```

---

## Guardrails

Run `pix_frontend_astro` mode=check or `pix_check` to validate code against these rules.

Key rules enforced: **no-css-classes**, **no-inline-styles**, **semantic-html**,
**external-css** (Astro `<style>` scoped blocks or external CSS imports),
**barrel-file**, **data-part**,
**jsdoc-required** (every JS/TS file MUST have complete JSDoc - see rule-styleguide → javascript.md),
**css-comments-required** (every CSS file MUST have file-level + section comments - see rule-styleguide → css.md),
**a11y-test-required** (every project MUST have Playwright + @axe-core/playwright a11y tests in `tests/a11y/` - see rule-styleguide → a11y.md → Automated Testing).

## Project Scaffolding

All rule projects include standard config files. See [`rule-styleguide`](../rule-styleguide/SKILL.md) → Project Scaffolding.
Use `pix_styleguide mode=scaffold` or `pix_scaffold` to generate: `.prettierrc`, `.nvmrc`, `.editorconfig`,
`.gitignore`, `.eslintrc.json`, `tsconfig.json`, `jsconfig.json`.

Iterate: `generate → pix_check → fix → pix_check → all pass`.

---

## Astro Performance & Best Practices

This section extends rule-frontend-astro with a structured performance review methodology for Astro's islands architecture.

### When to activate

- Review Astro site performance
- Optimize client JS footprint (islands strategy)
- Decide between client directives (`client:load`, `client:idle`, `client:visible`, `client:media`, `client:only`)
- Choose between SSG, SSR, or hybrid rendering
- Optimize images, fonts, and assets
- Set up View Transitions for smooth navigation
- Write PR feedback about Astro code quality

### Operating principles

1. **Zero JS by default** is Astro's superpower. Every byte of client JS must be justified.

2. **Islands architecture** - interactive components are isolated. A client island loads only its own JS, not the entire page.

3. **Choose the right client directive.** `client:load` is the heaviest - use it sparingly.

4. **Prefetch is free.** `data-astro-prefetch` gives SPA-like navigation without a framework.

5. **Classify each issue** as: performance risk, UX risk, maintainability risk, bundle size concern.

### Review workflow

1. Identify the symptom (slow page load, too much client JS, slow navigation, large images, poor Core Web Vitals)
2. Find the owner (island boundary, client directive, image/asset, route configuration)
3. Match to one of the 10 patterns below
4. Explain the risk
5. Propose smallest fix
6. End with a rule of thumb

### The 10 patterns

#### 1. Choose the least aggressive client directive

| Directive        | When                                              | Cost                    |
| ---------------- | ------------------------------------------------- | ----------------------- |
| `client:load`    | Immediately needed on page load                   | Highest - loads eagerly |
| `client:idle`    | Not urgent, load when browser is idle             | Medium                  |
| `client:visible` | Below the fold, load when scrolled into view      | Low                     |
| `client:media`   | Responsive component only on certain screen sizes | Low                     |
| `client:only`    | Framework component that can't be server-rendered | Varies                  |

```astro
---
import HeavyChart from "./HeavyChart.jsx";
---

<!-- Scroll down to see it → load it then -->
<HeavyChart client:visible />
```

Rule: _Start with the least aggressive directive. Upgrade only when needed._

#### 2. Islands should be small and focused

An island is the unit of client JS. Make islands small - extract only the interactive part.

```astro
<!-- ❌ Whole page as an island -->
<InteractivePage client:load />

<!-- ✅ Only the interactive parts -->
<header data-part="header">
  <SearchBar client:visible />
  <nav>Static navigation...</nav>
</header>
<main>Static content...</main>
```

Rule: _Islands should be the smallest possible interactive elements, not entire pages._

#### 3. Use Content Collections for type-safe, performant content

Content Collections validate frontmatter at build time and enable efficient querying.

```astro
---
import { getCollection } from "astro:content";

// ✅ Efficient collection query
const posts = await getCollection("blog");

// ✅ Filter at build time
const publishedPosts = posts.filter(p => !p.data.draft);
---
```

Rule: _Content Collections for structured content. Avoid manual glob imports for content._

#### 4. Use View Transitions for smooth, SPA-like navigation

View Transitions give SPA-like navigation without a client framework.

```astro
---
import { ViewTransitions } from "astro:transitions";
---
<!doctype html>
<html>
  <head>
    <ViewTransitions />
  </head>
  <body>
    <slot />
  </body>
</html>
```

Add `data-astro-prefetch` to links for instant navigation:

```astro
<a href="/blog" data-astro-prefetch>Blog</a>
```

Rule: _Always enable ViewTransitions for multi-page sites. Always add prefetch to navigation links._

#### 5. Optimize images with Astro's built-in components

Use `<Image />` and `<Picture />` from `astro:assets` for automatic optimization.

```astro
---
import { Image } from "astro:assets";
import heroImage from "../images/hero.png";
---

<Image
  src={heroImage}
  alt="Hero"
  widths={[400, 800, 1200]}
  sizes="(max-width: 800px) 100vw, 800px"
  loading="lazy"
  decoding="async"
/>
```

Rule: _Use `<Image />` for local images, `loading="lazy"` for below-the-fold images._

#### 6. Prefer SSG over SSR when possible

Static Generation (SSG) produces zero server runtime. Server-Side Rendering (SSR) adds server cost and complexity.

```astro
---
// ✅ SSG: content doesn't change per request
export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map(p => ({ params: { slug: p.slug } }));
}
---

<!-- ✅ SSR when needed: user-specific, real-time data -->
export const prerender = false;
```

Rule: _SSG by default. SSR only when you need per-request dynamic data._

#### 7. Minimize framework islands - prefer vanilla JS or web components

Each framework island (React, Vue, Svelte, SolidJS) loads that framework's runtime.

```astro
<!-- ❌ React island for a simple counter (loads React runtime) -->
<Counter client:load />

<!-- ✅ Vanilla JS or web component - no framework overhead -->
<script>
  class Counter extends HTMLElement {
    // ...
  }
  customElements.define("my-counter", Counter);
</script>
```

Rule: _Use vanilla JS or web components for simple interactivity. Use framework islands only when you need component state management._

#### 8. Structure layouts for maximum reuse

Nested layouts avoid repeating HTML structure and enable efficient CSS sharing.

```astro
---
// src/layouts/_BaseLayout.astro - global shell
import { ViewTransitions } from "astro:transitions";
---
<!doctype html>
<html lang="en">
  <head><ViewTransitions /></head>
  <body>
    <slot />
  </body>
</html>
```

```astro
---
// src/layouts/_BlogLayout.astro - blog-specific
import BaseLayout from "./_BaseLayout.astro";
---
<BaseLayout>
  <nav>Blog nav...</nav>
  <article><slot /></article>
</BaseLayout>
```

Rule: _Compose layouts like components. A base layout → page type layout → page._

#### 9. Lazy-load non-critical CSS and JS

Use `is:inline` and dynamic imports for non-critical resources.

```astro
<!-- Load critical CSS in <head>, defer non-critical -->
<link rel="stylesheet" href="/styles/critical.css" />
<link rel="preload" href="/styles/non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
```

For JS, use dynamic `import()` inside islands or `<script>` tags.

Rule: _Critical CSS inline or in `<head>`. Non-critical CSS lazy-loaded. JS loaded on demand via directives._

#### 10. One Astro component = one concern

Keep `.astro` components focused. Extract logic into separate TypeScript modules.

```astro
---
// ✅ Import data logic from a module
import { getLatestPosts } from "../lib/posts";
import BlogCard from "../components/BlogCard.astro";

const posts = await getLatestPosts();
---

<section data-part="blog-list">
  {posts.map(p => <BlogCard post={p} />)}
</section>
```

Rule: _Separate data fetching, formatting, and presentation into distinct modules._

### Decision matrix

| Symptom                             | Check first        | Likely pattern                      | Fix                                   |
| ----------------------------------- | ------------------ | ----------------------------------- | ------------------------------------- |
| Slow page load                      | Client JS size     | Too many or wrong client directives | Use less aggressive directives        |
| Heavy page despite static content   | Island boundaries  | Whole-page framework islands        | Reduce island scope                   |
| Slow navigation between pages       | Navigation         | Missing ViewTransitions             | Add `<ViewTransitions />`             |
| Large images slowing LCP            | Image loading      | Missing optimization                | Use `<Image />` with `loading="lazy"` |
| First load too heavy                | Framework choice   | Framework island for simple UI      | Replace with vanilla JS               |
| Content hard to query               | Content approach   | Manual frontmatter reading          | Use Content Collections               |
| Server costs too high               | Rendering strategy | SSR for static content              | Switch to SSG                         |
| Layout duplicated across pages      | Layout structure   | Repeated HTML in each page          | Use nested layouts                    |
| Non-critical resources block render | Resource loading   | Render-blocking CSS/JS              | Defer non-critical resources          |
| Astro component too complex         | Component design   | Mixed data + view                   | Split into data module + view         |

### Supporting resources

| Resource               | Path                                           |
| ---------------------- | ---------------------------------------------- |
| 10 detailed examples   | `examples/performance/01-*.md` … `10-*.md`     |
| PR review checklist    | `checklists/astro-performance-pr-checklist.md` |
| Decision matrix        | `checklists/decision-matrix.md`                |
| System prompt          | `prompts/portable-system-prompt.md`            |
| Code review prompt     | `prompts/code-review-prompt.md`                |
| Refactor prompt        | `prompts/refactor-prompt.md`                   |
| Teaching prompt        | `prompts/teaching-prompt.md`                   |
| Audit report template  | `templates/audit-report-template.md`           |
| PR comment template    | `templates/pr-comment-template.md`             |
| Refactor plan template | `templates/refactor-plan-template.md`          |
| Performance playbook   | `knowledge/astro-performance-playbook.md`      |

---

## Forms (Astro)

### Prerequisites

- Use **client islands** for interactive forms (`client:load`)
- Server actions in Astro 5+ for form submission
- `zod` for validation (shared between client and server)

### Server action handler

```typescript
// src/actions/contact.ts
import { defineAction } from "astro:actions";
import { z } from "zod";

export const server = {
  contact: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
      message: z.string().min(10).max(1000),
    }),
    handler: async (input) => {
      return { success: true };
    },
  }),
};
```

```astro
---
// src/pages/contact.astro
import { actions } from "astro:actions";
---

<form data-part="form" method="POST" action={actions.contact}>
  <label data-part="field">
    <span data-part="label">Email</span>
    <input data-part="input" type="email" name="email" required />
  </label>
  <button data-part="submit" type="submit">Send</button>
</form>
```

### Checklist

- [ ] Client island for interactive forms
- [ ] Server actions for submission (Astro 5+)
- [ ] Shared validation schema (zod)
- [ ] Progressive enhancement works without JS

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-frontend](../rule-frontend/SKILL.md) - Frontend skill index
- [rule-styleguide](../rule-styleguide/SKILL.md) - Shared frontend standards
