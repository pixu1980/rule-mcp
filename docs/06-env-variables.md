# Environment Variables Reference

| Variable | Description | Default | Values |
|----------|-------------|---------|--------|
| `RULE_MCP_MINIMAL_TOOLS` | Expose only the 10 dispatcher/action tools (fits client tool caps, cheaper context). Safe for untrusted code. | unset | `1` = enable |
| `RULE_MCP_AUTO_ADR` | Automatically log architecture decisions via `rule_tool_process_adr` on each tool call. | unset | `1` = enable auto-ADR |
| `RULE_MCP_DISABLE_AUTO_ADR` | Disable automatic ADR logging (used internally during testing). | unset | `1` = disable |
| `RULE_MCP_DAEMON` | Run as daemon process (used by LaunchAgent/systemd units). | unset | `1` = daemon mode |
| `RULE_MCP_SSE_TOKEN` | Bearer token for SSE transport authentication. Auto-generated if unset. | auto-generated | any string |
| `RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS` | Throttle between self-update checks (git fetch at most once per interval, on tool invocations). | `60` | seconds; `0` = check on every tool call |

## Configuration

Set these variables via:

```bash
# CLI (persisted to ~/.config/rule-mcp/env.json)
rule config env --set RULE_MCP_MINIMAL_TOOLS=1

# Interactive mode
rule config env

# Environment (overrides persisted config)
export RULE_MCP_MINIMAL_TOOLS=1
```

## Persistence

Variables set via `rule config env` are saved to `~/.config/rule-mcp/env.json`
and automatically injected into the MCP stdio configuration on install/update.

Environment variables set in your shell profile override the persisted config.

## Minimal tool surface

Set `RULE_MCP_MINIMAL_TOOLS=1` (off by default) to expose only the 10 dispatcher/action tools:
`pix_tool`, `rule_tool_update`, `rule_tool_gateway`, `rule_tool_apply`, `rule_tool_search`, `rule_tool_check`, `rule_tool_scaffold`, `rule_tool_detect`, `rule_tool_process_handoff`, `rule_tool_component`.
