---
name: rule-mcp-backend-fastify
description: >-
  Use when building Fastify 5+ applications. Covers plugins, hooks, schema validation, serialization, and high-throughput API optimization.
tags:
  - "fastify"
  - "nodejs"
  - "backend"
  - "api"
  - "performance"
  - "http"
frameworks: [all]
inherits: [rule-mcp-backend]
---

# rule-mcp-backend-fastify - Fastify Best Practices

## fastify Architecture

- **Plugin-based** - everything is a plugin. Encapsulation by design
- `fastify-plugin` for shared context (DB, auth)
- Auto-load plugins with `@fastify/autoload`
- Register order: configuration -> database -> auth -> routes -> error handler

```typescript
const app = fastify({ logger: true });

// Plugin registration
app.register(require("@fastify/cors"), { origin: ALLOWED_ORIGINS });
app.register(require("@fastify/helmet"));
app.register(require("./plugins/auth"));
app.register(require("./routes/users"), { prefix: "/api/v1/users" });
```

## Fastify Schema Validation & Serialization

- JSON Schema for request validation and response serialization
- Faster serialization than manual JSON.stringify
- `@fastify/swagger` for auto-generated OpenAPI docs
- `@fastify/type-provider-typebox` for TypeScript type-safe schemas

```typescript
const createUserSchema = {
  body: Type.Object({
    email: Type.String({ format: "email" }),
    name: Type.String({ minLength: 2 }),
  }),
  response: {
    201: Type.Object({
      id: Type.String(),
      email: Type.String(),
    }),
  },
};
```

## Fastify Hooks Lifecycle

- `onRequest` -> `preParsing` -> `preValidation` -> `preHandler` -> handler -> `preSerialization` -> `onSend` -> `onResponse`
- Auth in `preHandler`, logging in `onResponse`, response transformation in `preSerialization`
- Use `onError` for centralized error handling

## Fastify Performance Tuning

- **Fastest Node.js HTTP framework** - 2-3x faster than Express
- Built-in schema-based serialization (JSON.stringify bypass)
- Limited middleware - prefer hooks + plugins for encapsulation
- `@fastify/compress` for response compression
- Keep-alive connections for higher throughput

## NestJS Testing

- `app.inject()` for integration tests (no HTTP server needed)
- `@fastify/swagger` for contract testing
- Mock plugins in unit tests via `fastify-plugin` wrapping

## See also

- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index and dispatcher
- [rule-mcp-backend](../rule-mcp-backend/SKILL.md) - Backend umbrella
- [rule-mcp-data-postgresql](../rule-mcp-data-postgresql/SKILL.md) - PostgreSQL
