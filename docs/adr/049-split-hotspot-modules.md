# 049: Split the hotspot modules (guardrails + installer)

- **Date**: 2026-08-25
- **Status**: accepted
- **Tags**: refactor, maintainability, guardrails, installer
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Two modules had grown beyond comfortable review size with no domain structure:
`src/core/guardrail-defs.js` (1771 lines, six guardrail families in one file)
and `src/cli/install.js` (1273 lines mixing orchestrators, file helpers and 23
per-agent installer/uninstaller definitions).

## Decision

1. **Guardrails**: each family moves to `src/core/guardrails/` —
   `shared.js`, `file-tree.js`, `framework.js`, `scaffold.js`, `backend.js`,
   `database.js`, `devops.js`, `util.js` — with `guardrail-defs.js` kept as a
   one-line re-export (`export * from "./guardrails/index.js"`) so historical
   import paths and the public export names never change.
2. **Installer**: the per-agent domain (file helpers, command builders,
   installers/uninstallers, env/command config) moves to a self-contained
   `src/cli/agent-installers.js`; `install.js` keeps the orchestrators
   (`installAgent`, `uninstallAgent`, `detectInstalledAgents`,
   `getAllAgents`) and re-exports the agent module so `new
URL(../src/cli/install.js)` imports in tests keep working.

## Consequences

**Positive**: each guardrail domain is a standalone reviewable file; the
installer's agent surface is decoupled from its orchestration; no public
import path or export name changed (full installer suite + guardrail coverage
stay green, 212 checks).
**Negative**: two new indirection layers to navigate when tracing (mitigated by
the re-export entry points).
