# pix-galaxy-mcp — Docker image
# Source is the app. Skills are embedded from the repository.

FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY bin/ bin/
COPY src/ src/
COPY skills/ skills/
COPY scripts/ scripts/
COPY prompts/ prompts/
COPY package.json server.json README.md LICENSE ./

EXPOSE 37999
ENV NODE_ENV=production

# Default: stdio transport (for MCP agents)
# Override with: --transport sse for IDE integration
CMD ["node", "src/index.js", "serve"]
