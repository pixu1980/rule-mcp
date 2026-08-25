# Project context

See ./CLAUDE.md for the full project rules. Non-negotiable for AI coding agents:

- Conventional Commits WITH a scope: `type(scope): subject` - the commit-msg hook rejects scope-less subjects.
- Use the pix-galaxy-mcp workflow: route via `pix` tools before implementing, run `pix_check`, write failing tests first.
- Two repos: `pix-galaxy-mcp` (this; MCP server) and `pix-galaxy-architect` (standalone web app + SDK - the former architect wizard).
