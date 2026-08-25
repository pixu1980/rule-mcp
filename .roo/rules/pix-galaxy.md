# rule-mcp

See ./CLAUDE.md for the full project rules. Non-negotiable for AI coding agents:

- Conventional Commits WITH a scope: `type(scope): subject` - the commit-msg hook rejects scope-less subjects.
- Use the rule-mcp workflow: route via `rule` tools before implementing, run `pix_check`, write failing tests first.
- Two repos: `rule-mcp` (this; MCP server) and `rule-mcp-architect` (standalone web app + SDK - the former architect wizard).
