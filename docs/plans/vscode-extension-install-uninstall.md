# Fix VS Code Extension Install/Uninstall Scripts (ported from rule-mcp)

## Problem

The VS Code extension rule-vanilla-reactive is not installed correctly:

- `install.js` (`rule-mcp install --agent vscode`) only writes the MCP config but does NOT install the `.vsix`
- `install.sh` Phase 4 silences errors with `2>/dev/null`
- Missing support for derivatives (Cursor, Windsurf, VS Code Insiders)
- `uninstall.js` doesn't remove the extension via CLI

## Checklist

### Step 1: Fix `install.js` - Add `.vsix` extension install

- [x] Add `installVscodeExtension()` for `vscode`, `cursor`, `windsurf`, `code-insiders`, `code-oss`
- [x] Integrate into `installVscode()` installer

### Step 2: Fix `install.js` - Uninstall extension via CLI

- [x] Add `uninstallVscodeExtension()` using appropriate CLIs
- [x] Integrate into `uninstallVscode()`

### Step 3: Fix `install.sh` Phase 4

- [x] Don't silence build/install errors (`2>/dev/null` → show output)
- [x] Add install for Cursor, Windsurf, VS Code Insiders
- [x] Use pre-existing `.vsix` if available, avoiding rebuild

### Step 4: Fix `uninstall.sh` Phase 3b

- [x] Add uninstall for Cursor, Windsurf, VS Code Insiders, Codium
- [x] Use `--uninstall-extension` via appropriate CLIs

### Step 5: Fix PowerShell scripts

- [x] `install.ps1`: Add Phase 4 to install .vsix
- [x] `uninstall.ps1`: Add code-insiders and codium, global config cleanup
