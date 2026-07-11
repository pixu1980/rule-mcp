# pix-galaxy-mcp — Docker image
# No build step needed: source is the app.
# Skills are embedded at container build time.

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
COPY scripts/embed-skills.mjs ./
COPY skills/ skills/
RUN node embed-skills.mjs

FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY --from=builder /app/node_modules ./node_modules
COPY bin/ bin/
COPY src/ src/
COPY skills/ skills/
COPY scripts/ scripts/
COPY package.json server.json README.md LICENSE ./

EXPOSE 37999
ENV NODE_ENV=production

# Default: stdio transport (for MCP agents)
# Override with: --transport sse for IDE integration
CMD ["node", "src/index.js", "serve"]
