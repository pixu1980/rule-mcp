# Astro Performance Playbook

This playbook supports the rule-frontend-astro performance review skill. It covers islands architecture, client directives, rendering strategies, and asset optimization.

## Mental model

Astro's performance philosophy: **zero JS by default**. Every byte of client-side JavaScript must be justified.

Three key levers:

1. **Islands architecture** - interactive components are isolated; only their JS loads
2. **Client directives** - control when and how island JS loads
3. **Rendering strategy** - SSG (build-time) vs SSR (request-time) per page

## Pattern 1 - Client directive strategy

### Directive hierarchy (least to most aggressive)

| Directive        | Load trigger             | Best for                  |
| ---------------- | ------------------------ | ------------------------- |
| `client:visible` | Element enters viewport  | Below-the-fold components |
| `client:idle`    | Browser is idle          | Non-critical enhancements |
| `client:media`   | Media query matches      | Responsive components     |
| `client:load`    | Immediately on page load | Critical interactive UI   |
| `client:only`    | Immediately (no SSR)     | Framework-only components |

### Decision flow

```txt
Is the component needed immediately on load?
  yes → client:load
  no → continue

Is it above or below the fold?
  above → client:idle or client:media
  below → client:visible

Does it need to SSR for SEO/content?
  no → client:only
```

## Pattern 2 - Small islands

An island's JS includes the component AND its framework runtime. Keep islands small.

```astro
<!-- ❌ Large island - includes full framework runtime -->
<InteractiveDashboard client:load />

<!-- ✅ Small island - only the interactive part -->
<DashboardCharts client:visible />
```

### Island extraction tips

- Extract only the interactive element, not its static wrapper
- Use vanilla HTML + CSS for static content around the island
- Pass data as props from the Astro component (server) to the island (client)

## Pattern 3 - Content Collections

Content Collections validate frontmatter, provide TypeScript types, and enable efficient queries.

```astro
---
import { getCollection, getEntry } from 'astro:content';

// Get all posts
const posts = await getCollection('blog');

// Get a single entry
const post = await getEntry('blog', Astro.params.slug);

// Get by type/collection
const reviews = await getCollection('reviews', ({ data }) => !data.draft);
---
```

### Performance notes

- `getCollection()` runs at build time (SSG) - zero runtime cost
- Filter inside the `getCollection` callback to reduce iterations
- Use `getEntry` for single pages (more efficient than filtering a collection)

## Pattern 4 - View Transitions

View Transitions enable SPA-like navigation without a client-side router.

```astro
<!-- src/layouts/_BaseLayout.astro -->
---
import { ViewTransitions } from 'astro:transitions';
---
<!doctype html>
<html lang="en">
  <head>
    <ViewTransitions />
  </head>
  <body>
    <slot />
  </body>
</html>
```

### Prefetch

```astro
<a href="/blog" data-astro-prefetch>Blog</a>
<a href="/about" data-astro-prefetch="hover">About</a>

<!-- Global prefetch all internal links -->
<ViewTransitions /> <!-- enables prefetch globally -->
```

### Named transitions for animation

```astro
<!-- Page A -->
<h1 transition:name="title">My Blog</h1>

<!-- Page B -->
<h1 transition:name="title">My Blog</h1>
<!-- Same name → smooth crossfade between pages -->
```

## Pattern 5 - Image optimization

```astro
---
import { Image, Picture } from 'astro:assets';
import hero from '../images/hero.png';
import logo from '../images/logo.svg';
---

<!-- Local image: automatic optimization, responsive sizes -->
<Image
  src={hero}
  alt="Hero image"
  widths={[400, 800, 1200]}
  sizes="(max-width: 800px) 100vw, 800px"
  loading="lazy"
  decoding="async"
  format="webp"
/>

<!-- Remote image: manual dimensions -->
<img
  src="https://example.com/photo.jpg"
  alt="Photo"
  width="1200"
  height="800"
  loading="lazy"
  decoding="async"
/>
```

### Image checklist

- ✅ Local images → `<Image />` from `astro:assets`
- ✅ Explicit `width` + `height` to prevent CLS
- ✅ `loading="lazy"` for below-the-fold images
- ✅ `decoding="async"` for faster painting
- ✅ Responsive `sizes` attribute
- ✅ WebP format (automatic with `<Image />`)

## Pattern 6 - SSG vs SSR

```astro
---
// ✅ SSG - content page, rendered at build time
// This is the default - no export needed
---

---
// ✅ SSR - needs per-request data
export const prerender = false;

const user = await getUser(Astro.request.headers.get('cookie'));
---
```

### Decision flow

```txt
Does content change per request?
  no → SSG (prerender)
  yes → continue

Is SEO important?
  yes → SSR with caching
  no → CSR (client:only island)
```

## Pattern 7 - Framework island cost

Each framework island loads that framework's runtime. Multiple frameworks = multiple runtimes.

| Framework                  | Runtime cost            |
| -------------------------- | ----------------------- |
| Vanilla JS / Web Component | 0 KB framework overhead |
| Preact                     | ~4 KB                   |
| SolidJS                    | ~8 KB                   |
| Svelte                     | ~2 KB (compiled)        |
| Vue                        | ~33 KB                  |
| React + ReactDOM           | ~45 KB                  |

```astro
<!-- ✅ Simple interactivity → no framework -->
<script>
  document.querySelector('[data-part="menu-toggle"]')
    ?.addEventListener('click', () => { /* ... */ });
</script>
```

## Pattern 8 - Layout composition

```astro
<!-- src/layouts/_BaseLayout.astro - global shell -->
---
import { ViewTransitions } from 'astro:transitions';
---
<!doctype html>
<html lang="en">
  <head><ViewTransitions /></head>
  <body>
    <header data-part="site-header"><slot name="header" /></header>
    <main><slot /></main>
    <footer data-part="site-footer"><slot name="footer" /></footer>
  </body>
</html>
```

```astro
<!-- src/layouts/_BlogLayout.astro - blog specific -->
---
import BaseLayout from './_BaseLayout.astro';
---
<BaseLayout>
  <nav slot="header" data-part="blog-nav">...</nav>
  <article><slot /></article>
</BaseLayout>
```

## Pattern 9 - Critical vs deferred resources

### Critical CSS

Inlined or loaded in `<head>`:

```astro
<style is:global>
  /* Critical above-the-fold styles */
  body { font-family: system-ui, sans-serif; }
  header[data-part="main-nav"] { ... }
</style>
```

### Deferred CSS

```astro
<link rel="preload" href="/styles/fonts.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

### Deferred JS

```astro
<script type="module" src="/scripts/analytics.js" async></script>
```

## Pattern 10 - Component responsibility in Astro

Astro's frontmatter (the `---` block) runs at build or request time. Keep it focused.

```astro
---
// ✅ Good: frontmatter is data fetching + passing
import { getCollection } from 'astro:content';
import BlogCard from '../components/BlogCard.astro';
import Sidebar from '../components/Sidebar.astro';

const posts = await getCollection('blog');
const featured = posts.filter(p => p.data.featured);
---
```

If frontmatter grows beyond ~30 lines, extract logic:

```ts
// lib/posts.ts
export async function getFeaturedPosts() {
  const posts = await getCollection("blog");
  return posts.filter((p) => p.data.featured && !p.data.draft).sort((a, b) => b.data.date - a.data.date);
}
```

```astro
---
import { getFeaturedPosts } from '../lib/posts';
const posts = await getFeaturedPosts();
---
```

## Measurement notes

Use these tools:

- **Lighthouse** / PageSpeed Insights - Core Web Vitals (LCP, CLS, INP)
- **Browser DevTools Network panel** - JS bundle sizes per island
- **Astro's built-in `astro build` output** - page-level bundle analysis
- **Bundle Analyzer** (`rollup-plugin-visualizer`) - visualize island dependencies

## Final principle

Astro's performance comes from **zero JS by default**. For every island, ask: does this need client JS? If yes, what's the minimum JS required? Use `client:visible` over `client:load`, and prefer vanilla JS over frameworks unless you need component state management.
