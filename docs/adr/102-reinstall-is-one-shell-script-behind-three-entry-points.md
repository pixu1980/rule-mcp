# 102: Reinstall is one shell script behind three entry points

- **Date**: 2026-09-17
- **Status**: accepted
- **Tags**: cli, installer, devx
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

A from-scratch reinstall on a dev machine needs three steps: purge node_modules and pnpm-lock.yaml, pnpm install, then refresh the global rule-mcp bin. Three surfaces already exist (pnpm scripts, scripts/*.sh bootstraps, the rule-mcp CLI), and the global bin actually in place is `pnpm install -g .` from the existing postinstall, not `pnpm link --global` (ADR 046 warns that pnpm 10/11 rewrites pnpm-workspace.yaml and the lockfile). A CLI handler doing the purge itself is fragile: it would delete the node_modules of the running process.

## Decision

`scripts/reinstall.sh` owns the sequence and runs from the checkout it lives in; it refuses a directory without package.json. `package.json` exposes it as `pnpm reinstall`, and `rule-mcp reinstall` (registrar plus a handler with injectable spawn) delegates to the same script with inherited stdio, so the CLI is a third door to one implementation rather than a second purge.

## Consequences

One implementation, three entry points, so the purge cannot drift. The CLI survives its own purge because the handler imports only Node built-ins and delegates to a child process. The reinstall is POSIX-only (bash), like mcp:install; on Windows it needs Git Bash. Tests execute the script inside a scratch copy with a fake pnpm on PATH, so the real node_modules are never touched.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. The CLI handler performing the purge itself: it would delete the node_modules of the process it is running in.
1. An inline package.json one-liner (rm -rf ...): not Windows-safe and not testable without running it.
1. pnpm link --global for the bin: ADR 046 records that pnpm 10/11 then rewrites pnpm-workspace.yaml and the lockfile.
