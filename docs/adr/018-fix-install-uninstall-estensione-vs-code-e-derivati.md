# 018: Fix install/uninstall estensione VS Code e derivati

- **Date**: 2026-07-19
- **Status**: accepted
- **Tags**: vscode, extension, installer, cursor, windsurf
- **Author**: rule-architect

## Context

L'estensione VS Code rule-vanilla-reactive (syntax highlighting, autocomplete per template html) non veniva installata correttamente. `install.js` CLI scriveva solo il config MCP in mcp.json ma non installava il .vsix. `install.sh` silenziava gli errori con `2>/dev/null`. Manca il supporto per editor derivati (Cursor, Windsurf, VS Code Insiders, Code-OSS, Codium).

## Decision

Aggiungere funzioni `installVscodeExtension` e `uninstallVscodeExtension` in install.js che installano/disinstallano il .vsix per tutti gli editor derivati usando i rispettivi CLI. Fixare install.sh Phase 4 per: non silenziare errori, usare il .vsix pre-esistente, installare per tutti i derivati, rispettare dry-run. Fixare uninstall.sh Phase 3b per tutti i derivati. Stessa logica nei PowerShell scripts.

## Consequences

Permette di installare e disinstallare l'estensione VS Code da `rule-mcp install --agent vscode`, da `install.sh` e da `install.ps1`. Supporta tutti gli editor basati su VS Code (Cursor, Windsurf, VS Code Insiders, Code-OSS, Codium) quando i rispettivi CLI sono disponibili.

## Alternatives Considered

1. Usare solo il file .vsix pre-buildato senza rebuild (scelta implementata)
1. Buildare l'estensione ogni volta (scartato perché il .vsix è già in git)
1. Installare solo via marketplace VS Code (scartato perché non controlliamo il publishing)
