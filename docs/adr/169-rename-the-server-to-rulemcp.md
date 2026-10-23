# 169: Rename the server to RuleMCP

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: architecture, naming, release, migration
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The project has shipped as `pix-galaxy-mcp`. The GitHub repository is now `pixu1980/rule-mcp` and the product name is RuleMCP. The npm name `pix-mcp` belongs to an unrelated third-party package, while `rule-mcp` is free. The `PIX_GALAXY_MCP_*` environment prefix, the `pix-*` skill names and the `pix-galaxy-architect` sibling are a separate compatibility contract.

## Decision

Rename the project identity to RuleMCP: the package and binary are `rule-mcp`, the GitHub repository is `pixu1980/rule-mcp`, and the npm package is `rule-mcp`. Keep the `PIX_GALAXY_MCP_*` environment prefix, the `pix-*` skills and the `pix-galaxy-architect` sibling under their current names. Historical ADRs, handoffs, reviews, audits and the changelog keep their old references; a migration note maps the old name to the new one.

## Consequences

The old GitHub URL redirects to the new repository. Users must reinstall the binary and update MCP client configs from `pix-galaxy-mcp` to `rule-mcp`; the old shim is removed. The npm name `pix-mcp` is a different project and must not be used. The rename is a breaking CLI change, mitigated by the migration note and the unchanged environment prefix.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Use `pix-mcp` (the npm name is owned by an unrelated third party)
1. Use `@pixu1980/pix-mcp` (scoped, but the GitHub repository is already `rule-mcp`)
1. Use `rule-mcp-server` (the npm name is owned by an unrelated third party)
1. Keep `pix-galaxy-mcp` (does not match the renamed repository or the RuleMCP product name)
