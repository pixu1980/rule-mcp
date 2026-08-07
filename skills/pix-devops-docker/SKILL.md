---
name: rule-devops-docker
description: >-
  Use when creating or maintaining Docker configuration. Covers Dockerfiles, docker-compose.yml, .dockerignore, multi-stage builds, and production readiness.
tags:
  - "devops"
  - "docker"
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# Docker

## Files to generate

For every repository, generate:

1. `Dockerfile` - Multi-stage production Dockerfile at project root
2. `docker-compose.yml` - Development compose file at project root for development
3. `docker-compose.autodeploy.yml` - Production compose file at project root for Gitlab CI/CD pipeline
4. `.dockerignore` - Exclude unnecessary files from build context
5. `nginx.conf` - Only for frontend repositories

## Step 1 - Create the Dockerfile (Backend or AI Agent)

Copy `assets/templates/Dockerfile.backend` to `Dockerfile` at the project root.

Adjust the `EXPOSE` port and `CMD` entry point based on the application:

- Backend: port `3000`, entry `dist/server.js`
- AI Agent: port `3001`, entry `dist/agent.js`

## Step 2 - Create the Dockerfile (Frontend)

Copy `assets/templates/Dockerfile.frontend` to `Dockerfile` at the project root.

Copy `assets/templates/nginx.conf` to `docker/nginx.conf`.

## Step 3 - Create .dockerignore

Copy `assets/templates/.dockerignore` to `.dockerignore` at the repository root.

## Step 4 - Create docker-compose.yml

Copy `assets/templates/docker-compose.yml` to `docker-compose.yml` at the project root.

Adjust ports:

- Backend: `3000:3000`
- Frontend: `5173:5173`
- AI Agent: `3001:3001`

For multi-service setups, add multiple services with `depends_on` and healthcheck conditions.

## Step 5 - Validate

After creating Docker files, verify:

1. `docker build -f Dockerfile -t test-build .` succeeds.
2. `docker images test-build` shows image size within targets (see [Docker Standards](#docker-standards)).
3. `docker run --rm test-build` starts without errors.
4. Healthcheck responds correctly.

## Edge cases

- **Monorepo context**: When the Dockerfile lives inside a monorepo, adjust `COPY` paths and build context to reference the correct package directory.
- **Private npm registries**: Add `.npmrc` with registry configuration in the `deps` stage. Never bake auth tokens into the image - use build-time `--secret` mounts.
- **Frontend environment variables**: Vite injects env vars at build time. Pass them as `ARG` in the build stage, not as runtime `ENV`.

---

## Docker Standards

## Base image policy

- Backend/agent: updated alpine `node` equal to the app node version
- Frontend: build the frontend app and serve it with an up-to-date `nginx` container using docker-compose
- Use pinned major/minor tags (never `latest`)

## Build policy

- Use multi-stage builds (`base`, `deps`, `build`, `production`)
- Keep production images minimal
- Run as non-root in production

## Security policy

- Never bake secrets into images
- Use `.dockerignore` to exclude `node_modules`, `.git`, `coverage`, `.env*`
- Use `COPY --chown` where needed

## Runtime policy

- Configure `HEALTHCHECK` in production containers
- Backend health endpoint: `/health`
- Frontend health endpoint: `/`

## Compose policy

- Provide development compose setup
- Provide a production compose setup for Gitlab pipeline (called docker-compose.autodeploy.yml)
- Use health-based dependencies where applicable
- Expose only required ports

## Implementation reference

Use `docker` skill for concrete templates and file-level generation steps.

## Backend Deployment Targets (from rule-backend)

| Target         | Config                                       |
| -------------- | -------------------------------------------- |
| **Node.js**    | Dockerfile + pm2 / systemd                   |
| **Serverless** | AWS Lambda (Hono), CloudFlare Workers (Hono) |
| **Docker**     | Multi-stage build with distroless            |
| **Electron**   | Bundled as part of the desktop app           |

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-devops](../rule-devops/SKILL.md) - DevOps skill index
- [rule-toolchain-project](../rule-toolchain-project/SKILL.md) - Project configuration baseline
