# 041: Per-invocation self-update with temporal throttle and fire-and-forget

- **Date**: 2026-08-01
- **Status**: accepted
- **Tags**: self-update, mcp-server, operational, background
- **Author**: rule-mcp-architect

## Context

The MCP server self-update (src/core/self-update.js) currently runs once per process, on the first tool call of the session (_checked guard). A long-lived daemon or extended stdio session goes days without rechecking upstream. The user wants the check to happen on every tool invocation. Fetching on every call would be wasteful (network latency per call, hammering the remote).

## Decision

The check fires on every tool invocation but the actual git fetch is throttled: at most every RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS (default 60, 0 = every call, min 1s). The check is async fire-and-forget: the tool responds immediately, the update happens in the background, and the banner appears on the next result. Banner only when something has changed. Daemon restart policy unchanged (no auto-exit for multi-client). Fail-open unchanged (offline/dirty tree/errors → silent skip).

## Consequences

Positives: updates received within ~1 minute of any activity, zero added latency per call (throttled background check), git-clone installs always fresh without manual intervention. Negatives: possible 1-call banner visibility delay (async), deferred process.exit in stdio can happen at most 1 time/minute, non-git installs (npm/docker) remain on manual hint.

## Alternatives Considered

1. Synchronous fetch on every tool call (network latency on every invocation, rejected)
1. Check once-per-process as today (staleness gap on long sessions, rejected)
1. Periodic timer independent of invocations (mode=periodic, optional in future)
