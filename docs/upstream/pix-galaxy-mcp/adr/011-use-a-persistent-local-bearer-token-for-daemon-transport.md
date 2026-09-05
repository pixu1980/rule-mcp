# 011 - Use a persistent local bearer token for daemon transport

- **Date**: 2026-07-16
- **Status**: accepted
- **Tags**: architecture, security, mcp, daemon
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The daemon's old per-start random SSE token made client configuration stale after service restarts. Pi and VS Code need a stable authenticated localhost URL.

## Decision

Store one 256-bit token at ~/.local/state/rule-mcp/sse-token with owner-only permissions. Daemon/SSE and Pi/VS Code daemon or Docker configs use that token. Remote mode is limited to verified Pi and VS Code schemas.

## Consequences

Daemon clients remain connected across LaunchAgent/systemd restarts; secrets are no longer emitted in logs. Docker must receive RULE_MCP_SSE_TOKEN when Compose starts.

## Alternatives Considered

1. Regenerate a token at every daemon start and require manual client edits
1. Disable authentication for loopback SSE
1. Use an environment-only token without persistent local state
