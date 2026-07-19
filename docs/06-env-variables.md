# Environment Variables Reference

| Variable | Description | Default | Values |
|----------|-------------|---------|--------|
| `RULE_MCP_STRICT_MODE` | Expose only gateway + read-only tools. Safe for untrusted code. | unset | `1` = strict mode |
| `RULE_MCP_AUTO_ADR` | Automatically log architecture decisions via `pix_process_adr` on each tool call. | unset | `1` = enable auto-ADR |
| `RULE_MCP_DISABLE_AUTO_ADR` | Disable automatic ADR logging (used internally during testing). | unset | `1` = disable |
| `RULE_MCP_DAEMON` | Run as daemon process (used by LaunchAgent/systemd units). | unset | `1` = daemon mode |
| `RULE_MCP_SSE_TOKEN` | Bearer token for SSE transport authentication. Auto-generated if unset. | auto-generated | any string |

## Configuration

Set these variables via:

```bash
# CLI (persisted to ~/.config/rule-mcp/env.json)
rule config env --set RULE_MCP_STRICT_MODE=1

# Interactive mode
rule config env

# Environment (overrides persisted config)
export RULE_MCP_STRICT_MODE=1
```

## Persistence

Variables set via `rule config env` are saved to `~/.config/rule-mcp/env.json`
and automatically injected into the MCP stdio configuration on install/update.

Environment variables set in your shell profile override the persisted config.

## Strict mode

Set `RULE_MCP_STRICT_MODE=1` to expose only 9 read-only + gateway tools:
`pix_gateway`, `pix_apply`, `rule`, `pix_search`, `pix_check`, `pix_detect`, `pix_scaffold`, `pix_component`, `pix_process_handoff`.
