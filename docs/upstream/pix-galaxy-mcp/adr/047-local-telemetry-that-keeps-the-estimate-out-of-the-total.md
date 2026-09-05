# 047: Local telemetry that keeps the estimate out of the total

- **Date**: 2026-08-30
- **Status**: accepted (privacy clause superseded in part by [ADR 069](070-the-flight-recorder-measures-what-the-server-costs-and-lives-with-the-project.md))
- **Tags**: telemetry, privacy, tokens, observability, flight-recorder
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

> **Supersession note (2026-09-04)**: ADR 069 reversed the privacy clause of this record - prompts are now recorded verbatim by default (opt-out RULE_MCP_NO_PROMPTS=1). The token-accounting rules below still stand.

## Context

This server exists to save tokens and could not say by how much. The plan's flight-recorder export assumed a telemetry log to export from; there was none. What existed was doctor --telemetry, a one-shot environment snapshot of version, Node and platform, which answers nothing about usage. The design had been settled in an interview on 2026-08-04 and never built, so the decisions were available and only the implementation was missing.

## Decision

Implement the agreed spec. Append-only JSONL in the state directory with per-call detail, rolled into daily aggregates and purged after seven days, with a size cap underneath as a backstop for a machine that never runs the rollup. No database: SQLite means a native dependency this project does not take, and node:sqlite needs Node 22 while engines says 20. Recording is instrumented inside callTool rather than through the wildcard after-hook, because the hook fires only on success and carries neither duration nor cache-hit. Two read surfaces, a CLI stats command and a pix_stats tool, and no local web dashboard: a dashboard is a server to run and secure for a number a sentence can carry. The transport interface is written and REMOTE_ENABLED is a code constant rather than an environment variable, because enabling it is a decision with a legal basis attached and should be a reviewed change. On top of it, telemetry-flight exports a session as a .flight file for the AI Flight Recorder DevTools; that project's event model already has first-class mcp-tool-call and mcp-tool-result events, so the mapping is a projection, and we take the format rather than the SDK, which exists to wrap a model client this server never calls.

## Consequences

Two rules are enforced by tests rather than by intention. Prompt text never reaches disk - only its length and the routed skill - and the routing estimate is a separate field that never merges into the measured total. The estimate is the largest of the three numbers, so merging it would be the most flattering and least defensible thing this server could report; it is rendered with a tilde and a sentence saying it models something that did not happen. One defect was introduced and removed during the work: registering SIGINT and SIGTERM handlers to flush the buffer removes Node's default termination behavior, so the SSE tests hung until the suite timed out. A core module must not hijack signals; only the exit hook remains, and a signal-terminated session loses at most a buffer, which is the correct trade. Surface grows to 99 tools, with pix_stats in the minimal set. Remote aggregation, identity dimensions beyond a random per-installation id, and OTLP export remain unbuilt and are now cheap to add.
