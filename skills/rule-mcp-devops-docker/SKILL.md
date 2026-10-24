---
name: rule-mcp-devops-docker
description: >-
  Use when creating or maintaining Docker configuration. Covers Dockerfiles, docker-compose.yml, .dockerignore, multi-stage builds, and production readiness.
tags:
  - "devops"
  - "docker"
  - "container"
  - "compose"
  - "multi-stage"
  - "base-image"
frameworks: [all]
metadata:
  author: rule-mcp-engineering
  version: "3.0"
inherits: [rule-mcp-devops]
guardrails: [docker-healthcheck, docker-non-root]
---

# Docker

## What this skill produces

For each repository, the container setup ships four artifacts plus one more
when the stack is frontend-only:

- `Dockerfile` at the repository root, a multi-stage image for production.
- `docker-compose.yml` at the root, the development experience, wired to the
  app's own port.
- `docker-compose.autodeploy.yml` at the root, the deploy-time composition the
  pipeline launches.
- `.dockerignore` at the root, keeps the build context free of everything the
  image must not see.
- `nginx.conf`, only for frontend repositories, placed under `docker/`.

## Building the production image

The Dockerfile follows one shape for every stack: **a dependency stage, a build
stage, a runtime stage**. Only the runtime stage ships.

Dependency install uses pnpm's lockfile semantics:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
```

The build stage compiles, type-checks and prunes before copying app code:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build
```

The runtime stage is the only part that reaches production. It runs as an
unprivileged user, exposes the app's port, and keeps the working directory
minimal:

```dockerfile
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
RUN addgroup -S app && adduser -S app -G app
USER app
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Two non-negotiables:

- The runtime user is never root. Create a low-privilege user in the image and
  switch to it before the entry point.
- `.env` files never enter the image. Secrets and configuration arrive at
  runtime through the orchestrator, not through a baked-in layer.

## Per-stack entry points

The `EXPOSE` and `CMD` pair depends on the application:

| Stack        | Port | Entry            |
| ------------ | ---- | ---------------- |
| Backend      | 3000 | `dist/server.js` |
| AI agent     | 3001 | `dist/agent.js`  |
| Frontend dev | 5173 | Vite dev server  |

Frontend images deviate deliberately: the Vite build happens in the build
stage, the runtime stage serves the static output behind nginx, and the
`nginx.conf` under `docker/` provides the server block. Environment values that
Vite injects at build time arrive as `ARG`s in the build stage, never as
runtime `ENV`, which would either be empty or baked.

## The ignore file

`.dockerignore` excludes the usual suspects so the build context stays small
and clean: `node_modules`, `dist`, coverage output, editor state, CI caches,
and any `.env*` file other than the example.

```text
node_modules/
dist/
coverage/
.git/
.env*
!.env.example
*.log
.DS_Store
```

## Compose: development and deploy

The development compose file maps the app port directly and enables live-file
work where the stack supports it. For services the app depends on, mount them
beside the app container with `depends_on` and rely on healthchecks to order the
startup, not on arbitrary sleeps.

The autodeploy compose file is the production composition: no volume-mounted
source, images pulled by tag, restart policy set, and the same healthcheck that
orchestration uses to decide readiness.

Keep the two compositions distinct. A compose file that tries to serve both
roles ends up neither reproducible for a release nor convenient for a day of
development.

## Base image policy

Every image derives from the current `alpine` variant of the Node major of the
application (for backend and agent stacks) or the matching static-server image
for frontend work. Pin by major and patch: `node:22-alpine`, not `node:latest`.
The generated image should stay lean, multi-stage pruning plus alpine bases
keep it in the tens of megabytes for backend work; a build that bloats past the
framework's baseline is a signal to recheck what made it into the runtime stage.

## Validation

Before calling the container work done:

1. `docker build -f Dockerfile -t ci-smoke .` completes.
2. `docker images ci-smoke` shows the image within the size targets above.
3. `docker run --rm ci-smoke` boots without error.
4. The healthcheck answers when the container is queried.

## Edge cases

- **Monorepo**: when the Dockerfile lives inside a sub-package, the build
  context and every `COPY` path must be relative to that package, and the
  dependency stage copies the workspace's lockfiles, not just the package's.
- **Private registries**: add an `.npmrc` with the registry configuration to
  the dependency stage. Auth tokens are never baked into the image: use
  build-time `--secret` mounts so the layer history stays clean.
- **Frontend configuration**: Vite environment variables are compile-time.
  Pass them as `ARG` in the build stage; the running container reads static
  files and needs no runtime environment of its own.
- **Non-Node runtimes**: when the stack is not Node, keep the shape, a
  dependency stage, a build stage, a minimal runtime stage, a non-root user,
  and swap the toolchain-specific steps.

## See also

- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index and dispatcher
- [rule-mcp-backend-node](../rule-mcp-backend-node/SKILL.md) - Backend scaffold and runtime
- [rule-mcp-devops-observability](../rule-mcp-devops-observability/SKILL.md) - Healthchecks and runtime signals
- [rule-mcp-devops-testing](../rule-mcp-devops-testing/SKILL.md) - CI verification and coverage
