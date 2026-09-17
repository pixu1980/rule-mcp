# 105: opencode gets a dedicated installer writing its own config shape

- **Date**: 2026-09-17
- **Status**: accepted
- **Tags**: installer, cli, opencode, mcp
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

opencode was handled by the generic installer, which wrote `~/.config/opencode/mcp.json` in the `mcpServers` shape. opencode never reads that file: its global config is `~/.config/opencode/opencode.json` (and `opencode.jsonc`; the two are merged), servers live under `mcp`, a local server is `{ type: "local", command: [bin, ...args], enabled, environment }`, and a remote one is `{ type: "remote", url, headers }`. A hand-edit that moved the `mcpServers` shape into `opencode.json` - `command` as a string with `args` beside it - is not schema-valid and stopped the client from loading its config at all. The visible symptom was `/mcps` never listing the server.

## Decision

opencode gets a dedicated installer, like Pi: `upsertOpencode`/`removeOpencode` in the JSON writers translate the shared config into opencode's dialect (`command` array, `environment`, `type: remote` when a url is present), `installOpencode` is registered in the installer registry, `uninstallOpencode` reverses it, and `detectInstalledAgents` reads `opencode.json`. The instruction file is registered in the config's `instructions` array, because opencode only reads files that array names. A legacy sweep removes our entry from the `mcp.json` the generic installer used to write, deleting the file when it empties.

## Consequences

One writer owns opencode's dialect next to the VS Code one, and both the wizard and `install --agent opencode` write a config opencode actually loads. The uninstall drops the entry and the instruction registration together, so an install and an uninstall are symmetric. Cost: the writers file now knows a third local-server dialect, and the legacy sweep keeps a path the old installer owned in the code for a while longer.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the generic installer and accept `mcp.json`: opencode reads nothing there, which is the defect this record replaces.
1. Write the `mcp` entry only and leave `instructions.md` unregistered: the file would be written and never read, a dead copy of the rules.
1. Force daemon/remote for opencode: opencode speaks remote servers, but only Pi and VS Code are interop-verified (`remoteModeAgents` in the catalog), so stdio stays the default.
