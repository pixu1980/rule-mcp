---
name: rule-backend-security
description: >-
  Use when applying security best practices to backend services. Covers rate limiting, CORS, Helmet headers, input validation, environment variables, and Docker security.
tags:
  - "backend"
  - "security"
frameworks: [node, api]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# Security Basics

## Step 1 - Configure environment variables

### .env files

- Never commit `.env` files to the repository.
- Always provide a `.env.example` with all required variables, using placeholder values.
- Add `.env` and `.env.*` (except `.env.example`) to `.gitignore`.

### .env.example format

```env
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Authentication
JWT_SECRET=replace-with-a-secure-random-string
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# External APIs
API_KEY=replace-with-your-api-key
```

### Environment validation

Validate all environment variables at application startup using zod. Fail fast if any required variable is missing or invalid:

```ts
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

Place this in `src/initEnv.ts`. Import and use `env` throughout the application instead of accessing `process.env` directly.

## Step 2 - Secure Docker images

- Run production containers as non-root user (UID 1001)
- Never copy `.env` files into Docker images
- Use multi-stage builds to exclude dev dependencies and source code from production images
- Set `NODE_ENV=production` in the production stage
- Use `--frozen-lockfile` for reproducible installs

See **docker** skill for full Dockerfile patterns.

## Step 3 - Audit dependencies

- Run `pnpm audit` (or `pnpm audit`) regularly and before releases
- Do not use packages with known critical vulnerabilities
- Pin dependency versions with caret (`^`) ranges, not wildcards
- Review new dependencies before adding them

Validate dependency choices against the project's active ruleset and security policy.

## Step 4 - Set HTTP security headers (backend)

Use `helmet` or `@fastify/helmet` to set security headers:

```ts
import helmet from "helmet";

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
});
```

## Step 5 - Add rate limiting (backend)

Use `express-rate-limit` or `@fastify/rate-limit`:

```ts
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});
```

## Step 6 - Configure CORS (backend)

Use `cors` or `@fastify/cors` with explicit origin configuration:

```ts
import cors from "cors";

await app.register(cors, {
  origin: env.ALLOWED_ORIGINS.split(","),
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
});
```

## Step 7 - Manage secrets in CI

- Store secrets as masked CI/CD variables in GitLab
- Never hardcode secrets in `.gitlab-ci.yml`
- Use variable references: `${DEPLOY_TOKEN}`, `${DATABASE_URL}`
- Mark sensitive variables as "protected" and "masked" in GitLab settings

## Step 8 - Validate all external input

- Validate all external input (request bodies, query params, headers) using zod.
- Never trust client-side validation alone.
- Return structured error responses, never expose internal error details.

```ts
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "user"]),
});

app.post("/users", async (request, reply) => {
  const result = createUserSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Validation failed", details: result.error.flatten() });
  }
  // proceed with result.data
});
```

## Edge cases

- **Frontend repos**: Steps 4–6 (helmet, rate limiting, CORS) do not apply. Focus on env validation and Docker security
- **AI Agent repos**: If the agent calls external APIs, store API keys as validated env vars. Never log request/response payloads containing secrets
- **Rotating secrets**: When rotating CI secrets, update both staging and production variables simultaneously to avoid deploy failures during the transition window

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-architect](../rule-architect/SKILL.md) - Project architecture wizard
