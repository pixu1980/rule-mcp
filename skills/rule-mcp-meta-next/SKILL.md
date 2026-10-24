---
name: rule-mcp-meta-next
description: >-
  Use when building Next.js applications. Covers App Router, Server Components, SSR/SSG/ISR, API routes, middleware, and Vercel deployment.
tags:
  - "frontend"
  - "meta"
  - "next"
frameworks: [next, react]
---

# rule-mcp-meta-next - Next.js Applications with rule-mcp Principles

Next.js is a React meta-framework providing file-based routing, SSR, SSG, ISR, API routes, and middleware. Use alongside [rule-mcp-frontend-react](../rule-mcp-frontend-react/SKILL.md) for the UI layer.

## When to use rule-mcp-meta-next

- Building a React application that needs SSR, SSG, or ISR
- Using the App Router with React Server Components
- Needing file-based routing and API routes built-in
- Deploying to Vercel or self-hosting a Node.js server

## Core Rules

Inherits all rules from [rule-mcp-frontend-react](../rule-mcp-frontend-react/SKILL.md) and [rule-mcp-styleguide](../rule-mcp-styleguide/SKILL.md):
zero CSS classes, zero inline styles, semantic HTML, barrel file tree.

## File Tree Convention (App Router)

```
project/
├── src/
│   ├── app/
│   │   ├── layout.js          ← Root layout (required)
│   │   ├── page.js            ← Home page
│   │   ├── loading.js         ← Loading UI (Suspense boundary)
│   │   ├── error.js           ← Error UI (Error boundary)
│   │   ├── not-found.js       ← 404 UI
│   │   ├── about/
│   │   │   └── page.js
│   │   ├── blog/
│   │   │   ├── layout.js      ← Blog section layout
│   │   │   ├── page.js        ← Blog list
│   │   │   └── [slug]/
│   │   │       └── page.js    ← Dynamic route: /blog/hello-world
│   │   └── api/
│   │       └── hello/
│   │           └── route.js   ← API route: /api/hello
│   ├── components/            ← Shared UI components
│   ├── lib/                   ← Pure business logic, data fetching
│   └── __tests__/
├── public/
│   ├── favicon.ico
│   └── images/
├── next.config.js
├── package.json
└── jsconfig.json
```

## Key Patterns

### App Router

- **`layout.js`**: Persistent UI that doesn't re-render on navigation (header, sidebar, footer)
- **`page.js`**: Route-specific content
- **`loading.js`**: Instant loading state via Suspense
- **`error.js`**: Error boundary per route segment
- **`not-found.js`**: Custom 404
- **Parallel routes**: `@modal`, `@sidebar` for multi-slot layouts
- **Intercepting routes**: `(.)photo` for modal-based navigation with URL preservation

### Server Components vs Client Components

```jsx
// app/page.js - Server Component (default)
// Can use async/await directly, access DB, read files
export default async function Page() {
  const data = await db.query("SELECT * FROM posts");
  return <PostList posts={data} />;
}
```

```jsx
"use client"; // Client Component - for interactivity, state, effects

export function LikeButton({ postId }) {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(true)}>{liked ? "❤️" : "🤍"}</button>;
}
```

### Data Fetching

```js
// Server Component - fetch with cache control
async function getPosts() {
  // SSG (default): fetch is cached and deduplicated
  const res = await fetch("https://api.example.com/posts");
  return res.json();
}

// SSR: opt out of cache
const res = await fetch("https://api.example.com/posts", { cache: "no-store" });

// ISR: revalidate every 60 seconds
const res = await fetch("https://api.example.com/posts", { next: { revalidate: 60 } });
```

### API Routes

```js
// app/api/contact/route.js
export async function POST(request) {
  const body = await request.json();
  await sendEmail(body);
  return Response.json({ ok: true });
}
```

### Middleware

```js
// middleware.js (at project root)
export function middleware(request) {
  const token = request.cookies.get("session");
  if (!token) {
    return Response.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

### Image Optimization

```jsx
import Image from "next/image";

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // LCP image - preload
  placeholder="blur" // Show blur-up while loading
  blurDataURL="data:image/webp;base64,..."
/>;
```

### Static Export

```js
// next.config.js
module.exports = {
  output: "export", // Generates static HTML/CSS/JS in out/
};
```

## Environment Variables

```
NEXT_PUBLIC_API_URL=https://api.example.com    ← Available in browser
DATABASE_URL=postgres://...                     ← Server only
```

## Deployment

| Target            | Config                                |
| ----------------- | ------------------------------------- |
| **Vercel**        | Zero config - automatic               |
| **Docker (Node)** | `next start` on port 3000             |
| **Static**        | `output: 'export'` -> any static host |

## Quick Reference

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  rule-mcp-meta-next - Next.js (React Meta-framework)                              │
│                                                                                   │
│  Routing:   app/ directory, layout/page/loading/error                             │
│  Data:      fetch with cache/no-store/revalidate                                  │
│  API:       app/api/route.js                                                      │
│  Midlleware: middleware.js at root                                                │
│  Images:    next/image with priority + blur placeholder                           │
│  Deploy:    Vercel (auto), Docker, Static export                                  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## See also

- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index and dispatcher
- [rule-mcp-frontend](../rule-mcp-frontend/SKILL.md) - Frontend skill index
- [rule-mcp-styleguide](../rule-mcp-styleguide/SKILL.md) - Shared frontend standards
