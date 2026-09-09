---
name: rule-meta-remix
description: >-
  Use when building Remix or React Router applications. Covers nested routing, loaders/actions, SSR, progressive enhancement, and sessions.
tags:
  - "frontend"
  - "meta"
  - "remix"
frameworks: [remix, react]
---

# rule-meta-remix - Remix / React Router Apps with rule Principles

Remix (now React Router v7) is a React meta-framework with nested routing, loaders, actions, and progressive enhancement. Use alongside [rule-frontend-react](../rule-frontend-react/SKILL.md) for the UI layer.

## When to use rule-meta-remix

- Building a React application with nested routing
- Using server-side loaders/actions for data mutations
- Building forms with progressive enhancement (works without JS)
- Needing sessions, cookies, and middleware built-in
- Deploying to any Node.js or Edge runtime

## Core Rules

Inherits all rules from [rule-frontend-react](../rule-frontend-react/SKILL.md) and [rule-styleguide](../rule-styleguide/SKILL.md):
zero CSS classes, zero inline styles, semantic HTML, barrel file tree.

## File Tree Convention

```
project/
├── app/
│   ├── root.jsx               ← Root layout (html, head, body)
│   ├── routes/
│   │   ├── _index.jsx          ← Home page
│   │   ├── _layout.jsx         ← Layout with outlet for children
│   │   ├── about.jsx
│   │   ├── blog.jsx
│   │   ├── blog.$slug.jsx      ← Dynamic route: /blog/hello-world
│   │   ├── dashboard._layout.jsx
│   │   └── dashboard.settings.jsx
│   └── styles/
│       └── app.css
├── public/
├── remix.config.js
├── package.json
└── tsconfig.json
```

## Key Patterns

### Loaders (Server-side data)

```jsx
// app/routes/blog.$slug.jsx
export async function loader({ params, request }) {
  const post = await db.post.findUnique({ where: { slug: params.slug } });
  if (!post) throw new Response("Not Found", { status: 404 });
  return post; // Serialized to JSON automatically
}

export default function Post() {
  const post = useLoaderData();
  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
```

### Actions (Mutations)

```jsx
// app/routes/contact.jsx
export async function action({ request }) {
  const formData = await request.formData();
  const email = formData.get("email");

  if (!email || !email.includes("@")) {
    return { error: "Invalid email" };
  }

  await sendEmail(email);
  return redirect("/thank-you");
}

export default function Contact() {
  const actionData = useActionData();
  return (
    <Form method="post">
      <label>
        Email
        <input type="email" name="email" aria-describedby="email-error" />
      </label>
      {actionData?.error && <p id="email-error">{actionData.error}</p>}
      <button type="submit">Send</button>
    </Form>
  );
}
```

### Progressive Enhancement

Forms work without JavaScript (native `method="post"`). JavaScript adds client-side validation, optimistic UI, and pending states:

```jsx
import { useNavigation } from "react-router";

function SubmitButton() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <button type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Sending..." : "Send"}
    </button>
  );
}
```

### Nested Routes with Layouts

```jsx
// app/routes/_layout.jsx - wraps all child routes
export default function DashboardLayout() {
  return (
    <section data-part="dashboard">
      <nav data-part="dashboard-nav">
        <Link to="settings">Settings</Link>
        <Link to="billing">Billing</Link>
      </nav>
      <main data-part="dashboard-content">
        <Outlet /> {/* Child route content renders here */}
      </main>
    </section>
  );
}
```

### Sessions & Cookies

```js
// app/sessions.js
import { createCookieSessionStorage } from "react-router";

export const storage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    secrets: [process.env.SESSION_SECRET],
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  },
});

// In a loader or action:
export async function loader({ request }) {
  const session = await storage.getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  return json({ user: await db.user.findUnique({ where: { id: userId } }) });
}
```

### Resource Routes (API-only, no UI)

```js
// app/routes/api.healthcheck.js
export async function loader() {
  return json({ status: "ok" }, { status: 200 });
}
```

### Middleware (headers, redirects)

```js
// app/root.jsx
export async function loader({ request }) {
  const url = new URL(request.url);
  if (url.hostname === "old-domain.com") {
    throw redirect("https://new-domain.com" + url.pathname, 301);
  }
  return null;
}
```

## Deployment

| Target                 | Adapter                    | Config           |
| ---------------------- | -------------------------- | ---------------- |
| **Node.js**            | `@remix-run/node`          | `pnpm run start` |
| **Cloudflare Workers** | `@remix-run/cloudflare`    | `wrangler.toml`  |
| **Vercel**             | `@vercel/remix`            | Auto-detect      |
| **Netlify**            | `@netlify/remix-adapter`   | `netlify.toml`   |
| **Fly.io**             | `@remix-run/node` + Docker | Dockerfile       |

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  rule-meta-remix - Remix / React Router (React Meta-framework)               │
│                                                                             │
│  Routing:   app/routes/, nested with _layout.jsx                            │
│  Data:      loader() → useLoaderData()                                      │
│  Mutations: action() → useActionData()                                      │
│  Forms:     <Form method="post"> - works without JS                         │
│  Sessions:  createCookieSessionStorage + cookie                             │
│  Deploy:    Node, Cloudflare Workers, Vercel, Netlify                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-frontend](../rule-frontend/SKILL.md) - Frontend skill index
- [rule-styleguide](../rule-styleguide/SKILL.md) - Shared frontend standards
