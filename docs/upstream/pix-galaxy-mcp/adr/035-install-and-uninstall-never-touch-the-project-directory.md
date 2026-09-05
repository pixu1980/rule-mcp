# 035: Install and uninstall never touch the project directory

- **Date**: 2026-08-04
- **Status**: accepted
- **Tags**: architecture, installer, uninstaller, safety, scripts
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

`scripts/install.sh`, `scripts/uninstall.sh` and `scripts/uninstall.ps1` mixed two unrelated jobs: integrating this MCP server with the **user's system** (agent configs, IDE configs, daemon service, shell profiles) and writing into **whatever directory the script was invoked from**.

The cwd-scoped behavior was not incidental - five distinct paths did it:

1. `install.sh` appended the instruction-rules block to a relative `./CLAUDE.md`, and `uninstall.sh` `sed -i`-deleted that block from `"CLAUDE.md"` _and_ `"../CLAUDE.md"`. This repository's own `CLAUDE.md` carries the `rule-mcp-rules` markers as committed content, so running the uninstaller from the repo root rewrote a tracked, versioned file and dirtied the tree. The `../CLAUDE.md` entry reached outside the project entirely.
2. `install.sh` wrote an auto-sync `post-commit` block to a relative `.git/hooks/post-commit`, so the installer modified a repository it does not own. It was also inert wherever `core.hooksPath` is configured (as it is on the development machine), and every install/uninstall cycle left one blank line behind - the audited checkout had accumulated seven, plus an orphan `post-commit.bak`. Recorded as finding 20 of `docs/reports/security-performance-audit-2026-08-04.md`.
3. `uninstall.sh` edited and `rm`'d `$(pwd)/.vscode/mcp.json` and `$(pwd)/.idea/mcp.json`; `uninstall.ps1` did the same plus `Remove-RulesBlock` on `$ProjectDir\CLAUDE.md`.
4. Phase 9 of `uninstall.sh` swept `find "$HOME_DIR" -maxdepth 4 -name "*.bak" -empty | xargs rm -f`, deleting unrelated user files - including files inside shallowly-cloned repositories.
5. The uninstall summary printed `Note: The project files in $(pwd) were NOT deleted. / To remove them manually: rm -rf $(pwd)`. Since `$(pwd)` is the invocation directory and not the repo root, `curl -fsSL .../uninstall.sh | bash` run from `$HOME` printed a copy-pasteable `rm -rf ~`.

Separately, `uninstall.sh` hardcoded `$(pwd)/.vscode/mcp.json` as the VS Code entry in its detection matrix while `install.sh` wrote the OS-global path on macOS/Linux - so uninstall looked in a place install never wrote.

## Decision

**Deleting the user's source tree is not in this repository's scope, and neither is editing it.** Both scripts are system-integration only.

- `install.sh` writes exclusively under `$HOME` (or `$APPDATA` on Windows). The project-level `./CLAUDE.md` append and the `.git/hooks/post-commit` installation are removed outright. Post-commit sync remains available on demand via `rule-mcp doctor`; a user who wants it automated adds the hook to their own repo deliberately.
- `uninstall.sh` / `uninstall.ps1` touch nothing under the current directory by default. The in-project cleanups older releases require are gated behind an explicit, off-by-default `--clean-project` / `-CleanProject` flag, which warns with the absolute path before each edit. Without the flag nothing in the current directory is read, written or deleted; `../CLAUDE.md` is gone in both modes.
- Hook backups go to `${RULE_MCP_STATE_DIR:-~/.local/state/rule-mcp}/backups`, never next to the hook - a `.bak` inside `.git/hooks` is one more file left behind in the user's repo.
- The empty-`.bak` sweep is scoped to the specific directories these scripts write backups into, at `-maxdepth 1`.
- The `rm -rf $(pwd)` note is deleted, along with the `cd $(pwd) && ./scripts/install.sh` reinstall hint that shared the same wrong-directory bug.
- A `vscode_global_mcp_path()` helper is the single source of the VS Code user-level `mcp.json` location, mirroring `install.sh` and `install.ps1`, so uninstall looks where install actually wrote.

Read-only references to the checkout stay: `UNINSTALL_REPO_ROOT` executes `node <repo>/bin/rule-mcp.js` as the fallback when the global shim is absent (`pnpm link --global` is allowed to fail), and `install.sh`'s `LOCAL_BIN` / `install.ps1`'s `$ProjectRoot` resolve the local binary. Reading or executing the checkout is not mutating it, and removing that fallback would drop the registry-driven command cleanup of ADR 034 back to a hardcoded, drift-prone list.

`test/install-rules-idempotent.test.mjs` gains a guard asserting `install.sh` never calls `append_rules_block` on a project-relative instruction file.

## Consequences

**Positive**

- Running either script from any repository cannot dirty its working tree or delete its files.
- No output ever suggests `rm -rf` on a path derived from the invocation directory.
- Audit finding 20 is closed by the stronger of its two prescribed options.
- Uninstall stops missing the real VS Code config on macOS and Linux.
- The `.bak` sweep can no longer delete user files it never created.

**Negative**

- Automatic post-commit sync is gone; users who relied on it must add the hook themselves.
- Project-level `./CLAUDE.md` is no longer provisioned by the installer, so per-project rules become a deliberate user action.
- Anyone who installed an older release keeps the in-project leftovers until they run `--clean-project` once.
