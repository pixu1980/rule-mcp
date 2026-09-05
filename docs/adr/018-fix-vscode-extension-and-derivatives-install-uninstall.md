# 018: Fix VS Code extension and derivatives install/uninstall

> **Superseded by [ADR 047](047-drop-the-vs-code-extension-and-its-installers.md)** — the extension and its installers were removed on the lean-web decision; kept for attribution.

- **Date**: 2026-07-19
- **Status**: superseded
- **Tags**: vscode, extension, installer, cursor, windsurf
- **Author**: rule-mcp-architect

## Context

The VS Code extension rule-vanilla-reactive (syntax highlighting, autocomplete for HTML templates) was not being installed correctly. The CLI `install.js` only wrote the MCP config in mcp.json but did not install the .vsix. `install.sh` silenced errors with `2>/dev/null`. Missing support for derivative editors (Cursor, Windsurf, VS Code Insiders, Code-OSS, Codium).

## Decision

Add `installVscodeExtension` and `uninstallVscodeExtension` functions in install.js that install/uninstall the .vsix for all derivative editors using their respective CLIs. Fix install.sh Phase 4 to: not silence errors, use the pre-existing .vsix, install for all derivatives, respect dry-run. Fix uninstall.sh Phase 3b for all derivatives. Same logic in PowerShell scripts.

## Consequences

Allows installing and uninstalling the VS Code extension from `rule-mcp install --agent vscode`, from `install.sh`, and from `install.ps1`. Supports all VS Code-based editors (Cursor, Windsurf, VS Code Insiders, Code-OSS, Codium) when their respective CLIs are available.

## Alternatives Considered

1. Use only the pre-built .vsix file without rebuild (chosen implementation)
1. Build the extension every time (rejected because .vsix is already in git)
1. Install only via VS Code marketplace (rejected because we don't control publishing)
