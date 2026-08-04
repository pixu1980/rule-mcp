# rule-mcp — Docker image
# Source is the app. Skills are embedded from the repository.

FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
COPY bin/ bin/
COPY src/ src/
COPY skills/ skills/
COPY scripts/ scripts/
COPY prompts/ prompts/
COPY package.json server.json README.md LICENSE ./

EXPOSE 37999
ENV NODE_ENV=production
# Bind all interfaces so a mapped SSE port is reachable from the host when
# the container is started with `serve --transport sse`.
ENV RULE_MCP_HOST=0.0.0.0
ENV RULE_MCP_PORT=37999
# Marks this install as a container so detectInstallType() refuses git
# self-update: an image is replaced, not fast-forwarded in place.
ENV RULE_MCP_DOCKER=1
# Feature opt-out switches shipped at 0 (feature ON) for discoverability;
# set any to 1 to disable that feature.
ENV RULE_MCP_NO_AUTOUPDATE=0
ENV RULE_MCP_NO_AUTORESTART=0
ENV RULE_MCP_NO_CACHE=0
ENV RULE_MCP_NO_CAVEMAN=0
ENV RULE_MCP_NO_TOKENSAVE=0
ENV RULE_MCP_NO_REMINDER=0

# Drop root: the server only needs to read /app and write its state dir under
# the node user's home. Must precede CMD or the drop never applies.
USER node

# Default: stdio transport (for MCP agents)
# Override with: --transport sse for IDE integration
CMD ["node", "src/index.js", "serve"]
