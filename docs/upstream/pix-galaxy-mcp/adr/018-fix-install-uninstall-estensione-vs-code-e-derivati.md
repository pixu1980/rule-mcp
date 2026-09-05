# 018: Fix install/uninstall estensione VS Code e derivati

- **Date**: 2026-07-19
- **Status**: superseded
- **Tags**: vscode, extension, installer, cursor, windsurf
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>
- **Superseded by**: [ADR 088](089-the-frontend-surface-is-framework-skills-only-and-there-is-no-no-framework-path.md) - the installers write agent configuration only, so this decision has no subject

## Context

L'estensione VS Code di questo repository (syntax highlighting, autocomplete per template html) non veniva installata correttamente. `install.js` CLI scriveva solo il config MCP in mcp.json ma non installava il .vsix. `install.sh` silenziava gli errori con `2>/dev/null`. Manca il supporto per editor derivati (Cursor, Windsurf, VS Code Insiders, Code-OSS, Codium).

## Decision

Aggiungere funzioni `installVscodeExtension` e `uninstallVscodeExtension` in install.js che installano/disinstallano il .vsix per tutti gli editor derivati usando i rispettivi CLI. Fixare install.sh Phase 4 per: non silenziare errori, usare il .vsix pre-esistente, installare per tutti i derivati, rispettare dry-run. Fixare uninstall.sh Phase 3b per tutti i derivati. Stessa logica nei PowerShell scripts.

## Consequences

Permette di installare e disinstallare l'estensione VS Code da `rule-mcp install --agent vscode`, da `install.sh` e da `install.ps1`. Supporta tutti gli editor basati su VS Code (Cursor, Windsurf, VS Code Insiders, Code-OSS, Codium) quando i rispettivi CLI sono disponibili.

## Alternatives Considered

1. Usare solo il file .vsix pre-buildato senza rebuild (scelta implementata)
1. Buildare l'estensione ogni volta (scartato perché il .vsix è già in git)
1. Installare solo via marketplace VS Code (scartato perché non controlliamo il publishing)
