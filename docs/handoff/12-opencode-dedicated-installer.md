# Handoff: opencode gets a dedicated installer

**Branch:** main
**Commits covered:** `743155e8..6e667dd5` (2 commits)
**Date:** 2026-09-17

## Session Summary

opencode was served by the generic installer, which wrote the `mcpServers`
shape to `~/.config/opencode/mcp.json` - a file opencode never reads. The
symptom was `/mcps` never listing the server; a hand-edit that moved the same
shape into `opencode.json` broke the client's config load entirely, because
opencode's schema is `additionalProperties: false`. opencode now gets a
dedicated installer, like Pi: writers that translate the shared config into
opencode's dialect, an agent module with install/uninstall and a legacy sweep,
and detection from `opencode.json`.

## Work Completed

### 1. The writers (`src/cli/installers/_writers-opencode.js`, new)

- `opencodeServerConfig` builds opencode's dialect: local servers become
  `{ type: "local", command: [bin, ...args], enabled, environment }`, remote
  ones `{ type: "remote", url, headers }`.
- `upsertOpencode` rebuilds the `mcp` entry instead of merging key by key, so
  the migration from the `mcpServers` shape cannot leave an invalid key behind.
  It also registers `~/.config/opencode/instructions.md` in `instructions`,
  because opencode only reads the files that array names.
- `removeOpencode` drops the entry and the instruction registration, pruning
  emptied blocks, so uninstall mirrors install.

### 2. The agent module (`src/cli/installers/_agents-opencode.js`, new)

- `installOpencode`/`uninstallOpencode` write `opencode.json` and the
  instructions file, and `sweepJsonServer` removes our entry from the legacy
  `mcp.json`, deleting that file when it empties. A file that does not exist is
  never created.

### 3. Registry wiring

- `_registry.js` and `_uninstall.js`: opencode leaves the generic installer list
  for `installOpencode`/`uninstallOpencode`.
- `_detect.js`: detection reads `~/.config/opencode/opencode.json` instead of
  the generic `mcp.json` path.
- `index.js`: exports the new writers module.
- Tests: `_opencode-install.test.mjs`, `_writers-opencode.test.mjs`.

### 4. ADR 105 and docs

- ADR 105 records the decision; the ADR.md index is regenerated.
- `docs/01-getting-started.md` gains the opencode config-path row;
  `docs/02-product-architecture.md` moves the ADR count to 105.

## Verification

- `pnpm test:installer`: 466 tests, 464 pass, 0 fail, 2 skipped.
- `pnpx eslint` on the touched source and test files: clean.
- `pnpx prettier --check` on the touched docs and modules: clean.

## Open Items

- Nothing open from this thread. The backlog queue (`docs/plans/backlog.md`) is
  empty; open plan boxes remain in `docs/plans/architect.md`, `docs/plans/oss.md`,
  `docs/plans/security.md` and the GitHub admin checklist `docs/plans/github.md`.

## ADR Reference

- ADR 105: opencode gets a dedicated installer writing its own config shape.

## References

- `src/cli/installers/_writers-opencode.js`, `_agents-opencode.js`
- `src/cli/installers/_registry.js`, `_uninstall.js`, `index.js`
- `src/cli/install/_detect.js`
- `docs/adr/105-opencode-gets-a-dedicated-installer-writing-its-own-config-shape.md`

### Resume Prompt

The next session opens with this block. Add the path of this document and the first step of the next session before saving it.

```prompt
Resume work on rule-mcp. Run `rule_tool_process_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The ADR log and the context snapshot capture what has been decided; do not re-ask answered questions.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.
This handoff is `docs/handoff/12-opencode-dedicated-installer.md`.
First step: confirm the opencode installer against a live client (install, restart opencode, `/mcps` lists the server), then pick the next workstream from the open plan boxes in `docs/plans/`.
```
