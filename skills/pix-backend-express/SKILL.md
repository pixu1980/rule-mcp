---
name: rule-backend-express
description: >-
  Use when building Express.js 5+ applications. Covers middleware patterns, error handling, routing, security headers, and production deployment.
tags:
  - "express"
  - "expressjs"
  - "nodejs"
  - "backend"
  - "api"
  - "rest"
  - "middleware"
  - "http"
frameworks: [all]
---

# rule-backend-express — Express.js Best Practices

## Express Application Structure

- **Feature-based folder structure** over file-type structure
- Single `app.ts` for middleware registration, `server.ts` for HTTP listener
- Route modules as `Router` instances, exported and mounted in app

```text
src/
├── app.ts                    # Middleware, routes, error handler
├── server.ts                 # HTTP listener, graceful shutdown
├── modules/
│   ├── users/
│   │   ├── users.router.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.test.ts
│   └── health/
│       └── health.router.ts
└── common/
    ├── middleware/
    ├── errors/
    └── types/
```

## Express Middleware Pipeline

- Order matters: logging → security → body parser → auth → routes → error handler
- `helmet` for security headers (first middleware)
- `cors` with explicit origin whitelist
- `pino-http` for structured request logging
- Rate limiting via `express-rate-limit`

```typescript
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);
app.use("/api/v1", apiRouter);
app.use(errorHandler);
```

## Express Error Handling

- Centralized error handler middleware (4 arguments)
- Custom `AppError` class with status code, message, and optional details
- Operational errors (400/404/409) vs programmer errors (500)
- Async handler wrapper to catch promise rejections

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
```

## Express Performance Tuning

- Compress responses with `compression` middleware
- Use `express.static` with `maxAge` for assets
- Enable `trust proxy` behind reverse proxy (Nginx, Cloudflare)
- Connection pooling for database (`pg-pool`, `mysql2/pool`)
- Keep async middleware — blocking the event loop kills throughput

## Express Request Validation

- Request validation at the router level via `zod` schemas
- Never trust `req.body`, `req.query`, or `req.params` without validation
- Structured error responses for validation failures

## Express Graceful Shutdown

```typescript
server.close(() => {
  logger.info("HTTP server closed");
  dbPool.end(() => process.exit(0));
});
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

## Express File Tree Convention (from rule-backend)

```
project/
├── src/
│   ├── index.js             ← Entry point (server bootstrap)
│   ├── app.js               ← App factory (middleware, routes)
│   ├── routes/              ← Route definitions
│   │   ├── index.js         ← Barrel
│   │   ├── auth.routes.js
│   │   └── users.routes.js
│   ├── handlers/            ← Request handlers
│   ├── services/            ← Business logic
│   ├── repositories/        ← Data access
│   ├── middleware/           ← Express/Fastify middleware
│   ├── validators/          ← Input validation schemas
│   └── __tests__/
├── db/
│   ├── migrations/
│   └── seeds/
├── api/
│   └── openapi.yaml
├── Dockerfile
└── package.json
```

## Layered Architecture

```
routes → handlers → services → repositories
```

- **Routes**: define endpoints, wire middleware
- **Handlers**: extract/validate input, call services, format response
- **Services**: business logic, pure functions
- **Repositories**: data access abstraction

---

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
- [rule-backend](../rule-backend/SKILL.md) — Backend skill index
- [rule-backend-api-design](../rule-backend-api-design/SKILL.md) — API design
