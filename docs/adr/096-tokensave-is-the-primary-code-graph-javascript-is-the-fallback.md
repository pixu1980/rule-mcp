# 096: TokenSave is the primary code graph, JavaScript is the fallback

- **Date**: 2026-09-15
- **Status**: accepted
- **Tags**: tokensave, architecture, adapter, fallback, code-graph
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

TokenSave indexes this project into a local code graph and already ships 89 MCP tools for symbols, relationships, impact, health, tests, git history and edits. The server used it only as a suppression signal: it detected .tokensave/ and trimmed its own context dumps. Everything else was reimplemented in JavaScript. The analysis in docs/audit/tokensave-integration.md maps 18 replacement opportunities and stages them in milestones; M0 is the foundation every later milestone depends on.

## Decision

Add src/core/tokensave/ with three modules and a barrel. probe.js detects .tokensave/tokensave.db, reads config and branch metadata, and exposes { available, version, branch, parentBranch, staleSeconds }; the status reader is injected so the probe has no client dependency. client.js is the only place that calls the tokensave CLI, mapping every call to `tokensave tool <name> --json --args <json> --project <path>` and normalizing a missing binary, a non-zero exit and a malformed envelope into one { ok: false, unavailable: true, error } result. fallback.js exports withFallback(name, tokensaveFn, jsFn), which returns { value, path } and selects the JavaScript path only for a TokensaveUnavailableError; every other error propagates. TokenSave is the primary code graph; the JavaScript already in the server stays as the tested fallback and the only code path used when the graph is absent.

## Consequences

The server gains an optional runtime dependency on a local TokenSave installation; when the graph or the binary is missing, the JavaScript path answers and the server behaves exactly as before. The adapter is the only module that knows TokenSave exists, so the integration can be disabled in one place. The probe is injected and the client is injected, so both are testable without a live graph. The plan in docs/audit/tokensave-integration.md now has its foundation.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Call TokenSave only through the agent's MCP gateway, never from the server
1. Shell out to the tokensave CLI for every call with no fallback layer
1. Skip the adapter and keep the existing suppression-only integration
