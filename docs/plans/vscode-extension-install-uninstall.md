# Fix VS Code Extension Install/Uninstall Scripts (portato da rule-mcp)

## Problema
L'estensione VS Code rule-vanilla-reactive non viene installata correttamente:
- `install.js` (`rule-mcp install --agent vscode`) scrive solo il MCP config ma NON installa il `.vsix`
- `install.sh` Phase 4 silenzia gli errori con `2>/dev/null`
- Manca supporto per derivati (Cursor, Windsurf, VS Code Insiders)
- `uninstall.js` non rimuove l'estensione tramite CLI

## Checklist

### Step 1: Fix `install.js` — Aggiungere installazione estensione `.vsix`
- [x] Aggiungere `installVscodeExtension()` per `vscode`, `cursor`, `windsurf`, `code-insiders`, `code-oss`
- [x] Integrare nell'installer `installVscode()`

### Step 2: Fix `install.js` — Uninstall estensione via CLI
- [x] Aggiungere `uninstallVscodeExtension()` che usa i CLI appropriati
- [x] Integrare in `uninstallVscode()`

### Step 3: Fix `install.sh` Phase 4
- [x] Non silenziare errori build/install (`2>/dev/null` → mostrare output)
- [x] Aggiungere install per Cursor, Windsurf, VS Code Insiders
- [x] Usare `.vsix` pre-esistente se disponibile, evitando rebuild

### Step 4: Fix `uninstall.sh` Phase 3b
- [x] Aggiungere disinstallazione per Cursor, Windsurf, VS Code Insiders, Codium
- [x] Usare `--uninstall-extension` via CLI appropriati

### Step 5: Fix PowerShell scripts
- [x] `install.ps1`: Aggiungere Phase 4 per installare .vsix
- [x] `uninstall.ps1`: Aggiungere code-insiders e codium, global config cleanup
