---
name: rule-backend-hono
description: >-
  Use when building Hono 4+ edge-compatible APIs. Covers middleware, Zod validation, RPC-style type sharing, and multi-runtime deployment.
tags:
  - "hono"
  - "ultrafast"
  - "edge"
  - "api"
  - "serverless"
  - "workers"
  - "rpc"
  - "lightweight"
  - "multiruntime"
  - "typescript"
  - "cloudflare"
  - "workers"
  - "serverless"
frameworks: [all]
---

# rule-backend-hono — Hono Best Practices

## Hono Architecture

- Lightweight, framework-agnostic — runs on Node.js, Cloudflare Workers, Bun, Deno
- **Router-first** — choose `smartRouter` for broadest runtime compatibility
- Middleware chain is the application — every feature is middleware
- RPC-style type sharing between client and server

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { jwt } from "hono/jwt";

const app = new Hono();

app.use("/api/*", cors({ origin: ALLOWED_ORIGINS }));
app.use("/api/*", jwt({ secret: process.env.JWT_SECRET! }));

app.get("/api/v1/users/:id", async (c) => {
  const id = c.req.param("id");
  const user = await db.getUser(id);
  return c.json(user);
});
```

## Hono Request Validation

- `zod` + `@hono/zod-openapi` for request validation and OpenAPI generation
- Type inference from Zod schemas for end-to-end type safety
- Automatic 400 responses on validation failure

## Hono Performance Characteristics

- **Smallest and fastest** Node.js/edge framework (< 20KB bundle)
- ~45k req/s on Node.js 20 — comparable to Fastify
- Zero-dependency core — add only what you need
- Built-in middleware tree for optimal performance

## Hono Multi-Runtime Deployment

```typescript
// Node.js
serve(app);
// Cloudflare Worker
export default app;
// Bun
export default app;
```

## Hono RPC Client

- `@hono/rpc-client` for type-safe API calls from frontend
- Shared types between `api/` and `web/` packages
- No code generation — types inferred from server code

## Hono Testing

- `app.request()` for integration tests (no HTTP server)
- `@hono/testing` for full request/response cycle
- Works with Vitest out of the box

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
- [rule-backend](../rule-backend/SKILL.md) — Backend umbrella
- [rule-data-postgresql](../rule-data-postgresql/SKILL.md) — PostgreSQL
