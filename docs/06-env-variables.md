# Environment Variables Reference

| Variable | Description | Default | Values |
|----------|-------------|---------|--------|
| `PIX_GALAXY_MCP_MINIMAL_TOOLS` | Expose only the 10 dispatcher/action tools (fits client tool caps, cheaper context). Safe for untrusted code. | unset | `1` = enable |
| `PIX_AUTO_ADR` | Automatically log architecture decisions via `pix_tool_process_adr` on each tool call. | unset | `1` = enable auto-ADR |
| `PIX_DISABLE_AUTO_ADR` | Disable automatic ADR logging (used internally during testing). | unset | `1` = disable |
| `PIX_GALAXY_MCP_DAEMON` | Run as daemon process (used by LaunchAgent/systemd units). | unset | `1` = daemon mode |
| `PIX_GALAXY_MCP_SSE_TOKEN` | Bearer token for SSE transport authentication. Auto-generated if unset. | auto-generated | any string |
| `PIX_GALAXY_MCP_AUTO_UPDATE_INTERVAL_SECONDS` | Throttle between self-update checks (git fetch at most once per interval, on tool invocations). | `60` | seconds; `0` = check on every tool call |

## Configuration

Set these variables via:

```bash
# CLI (persisted to ~/.config/pix-galaxy-mcp/env.json)
pix config env --set PIX_GALAXY_MCP_MINIMAL_TOOLS=1

# Interactive mode
pix config env

# Environment (overrides persisted config)
export PIX_GALAXY_MCP_MINIMAL_TOOLS=1
```

## Persistence

Variables set via `pix config env` are saved to `~/.config/pix-galaxy-mcp/env.json`
and automatically injected into the MCP stdio configuration on install/update.

Environment variables set in your shell profile override the persisted config.

## Minimal tool surface

Set `PIX_GALAXY_MCP_MINIMAL_TOOLS=1` (off by default) to expose only the 10 dispatcher/action tools:
`pix_tool`, `pix_tool_update`, `pix_tool_gateway`, `pix_tool_apply`, `pix_tool_search`, `pix_tool_check`, `pix_tool_scaffold`, `pix_tool_detect`, `pix_tool_process_handoff`, `pix_tool_component`.
