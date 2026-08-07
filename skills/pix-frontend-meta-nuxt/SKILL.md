---
name: rule-frontend-meta-nuxt
description: >-
  Use when building Nuxt.js applications. Covers file-based routing, SSR/SSG, server routes, auto-imports, Nitro engine, and modules ecosystem.
tags:
  - "frontend"
  - "meta"
  - "nuxt"
frameworks: [nuxt, vue]
---

# rule-frontend-meta-nuxt - Nuxt.js Applications with rule Principles

Nuxt.js is a Vue meta-framework providing file-based routing, SSR, SSG, server routes, auto-imports, and the Nitro server engine. Use alongside [rule-frontend-vue](../rule-frontend-vue/SKILL.md) for the UI layer.

## When to use rule-frontend-meta-nuxt

- Building a Vue application that needs SSR or SSG
- Using file-based routing with `pages/` directory
- Needing server routes and middleware built-in
- Leveraging the Nuxt modules ecosystem
- Deploying to Node, serverless, or edge via Nitro

## Core Rules

Inherits all rules from [rule-frontend-vue](../rule-frontend-vue/SKILL.md) and [rule-styleguide](../rule-styleguide/SKILL.md):
zero CSS classes, zero inline styles, semantic HTML, barrel file tree.

## File Tree Convention

```
project/
├── pages/                  ← File-based routing
│   ├── index.vue
│   ├── about.vue
│   ├── blog/
│   │   ├── index.vue
│   │   └── [slug].vue      ← Dynamic route: /blog/hello-world
│   └── dashboard/
│       └── settings.vue
├── layouts/                ← Page layouts
│   ├── default.vue
│   └── auth.vue
├── components/             ← Auto-imported components
│   ├── AppHeader.vue
│   └── AppFooter.vue
├── composables/            ← Auto-imported composables
│   └── useAuth.js
├── server/                 ← Nitro server engine
│   ├── api/
│   │   └── hello.ts        ← /api/hello
│   └── middleware/
│       └── auth.ts
├── public/                 ← Static assets
├── nuxt.config.ts
├── app.vue                 ← Root component
└── package.json
```

## Key Patterns

### Routing

```vue
<!-- pages/index.vue → / -->
<!-- pages/blog/[slug].vue → /blog/hello-world -->

<script setup>
// Access route params
const route = useRoute();
const { data: post } = await useFetch(`/api/posts/${route.params.slug}`);
</script>

<template>
  <article>
    <h1>{{ post.title }}</h1>
    <p>{{ post.content }}</p>
  </article>
</template>
```

### SSR / SSG / Hybrid

```js
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: true, // SSR enabled by default
  routeRules: {
    "/": { prerender: true }, // SSG
    "/blog/**": { swr: 3600 }, // ISR-equivalent
    "/dashboard/**": { ssr: false }, // SPA-only
    "/api/**": { cors: true }, // CORS headers
  },
});
```

### Server Routes (Nitro)

```ts
// server/api/posts/[id].ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const post = await db.post.findUnique({ where: { id } });
  if (!post) throw createError({ statusCode: 404 });
  return post;
});
```

### Auto-Imports

```js
// composables/useAuth.js - auto-imported in any .vue file
export const useAuth = () => {
  const user = useState("user", () => null);
  const login = async (email, password) => {
    user.value = await $fetch("/api/login", { method: "POST", body: { email, password } });
  };
  return { user, login };
};
```

### Modules

```bash
pnpx nuxi module add content    # @nuxt/content - file-based CMS
pnpx nuxi module add image      # @nuxt/image - optimized images
pnpx nuxi module add icon       # nuxt-icon - SVG icon system
pnpx nuxi module add color-mode # Dark/light mode toggle
```

### Data Fetching

```js
// useFetch - SSR-friendly, deduplicated, cached
const { data, pending, error, refresh } = await useFetch("/api/posts", {
  query: { page: 1 },
});

// $fetch - raw fetch with base URL
const user = await $fetch("/api/user", {
  method: "POST",
  body: { name: "Alice" },
});
```

## Deployment

| Target          | Command                          | Output             |
| --------------- | -------------------------------- | ------------------ |
| **Node server** | `nuxt build`                     | `.output/server/`  |
| **Static**      | `nuxt generate`                  | `dist/` (full SSG) |
| **Vercel**      | `nuxt build`                     | Auto-detected      |
| **Cloudflare**  | `nuxt build --preset=cloudflare` | Workers-compatible |
| **Netlify**     | `nuxt build --preset=netlify`    | Edge + serverless  |

## Quick Reference

```
┌────────────────────────────────────────────────────────────┐
│  rule-frontend-meta-nuxt - Nuxt.js (Vue Meta-framework)                   │
│                                                           │
│  Routing:   pages/ directory, dynamic [slug]              │
│  SSR/SSG:   nuxt.config routeRules (SWR, prerender, SPA)  │
│  Server:    server/api/ + server/middleware/ (Nitro)       │
│  Auto:      components/ composables/ - no imports needed  │
│  Data:      useFetch (SSR-safe) + $fetch (raw)            │
│  Deploy:    Node, Static, Vercel, Cloudflare, Netlify     │
└────────────────────────────────────────────────────────────┘
```

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-frontend](../rule-frontend/SKILL.md) - Frontend skill index
- [rule-styleguide](../rule-styleguide/SKILL.md) - Shared frontend standards
