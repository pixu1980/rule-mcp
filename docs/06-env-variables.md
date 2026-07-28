# Environment Variables Reference

| Variable | Description | Default | Values |
|----------|-------------|---------|--------|
| `RULE_MCP_MINIMAL_TOOLS` | Expose only the 10 dispatcher/action tools (fits client tool caps, cheaper context). Safe for untrusted code. | unset | `1` = enable |
| `RULE_MCP_AUTO_ADR` | Automatically log architecture decisions via `pix_process_adr` on each tool call. | unset | `1` = enable auto-ADR |
| `RULE_MCP_DISABLE_AUTO_ADR` | Disable automatic ADR logging (used internally during testing). | unset | `1` = disable |
| `RULE_MCP_DAEMON` | Run as daemon process (used by LaunchAgent/systemd units). | unset | `1` = daemon mode |
| `RULE_MCP_SSE_TOKEN` | Bearer token for SSE transport authentication. Auto-generated if unset. | auto-generated | any string |

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
`rule`, `pix_update`, `pix_gateway`, `pix_apply`, `pix_search`, `pix_check`, `pix_scaffold`, `pix_detect`, `pix_process_handoff`, `pix_component`.
