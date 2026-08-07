# 015 - Architect wizard migration to rule-architect-cli/web

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security

## Context

The architect wizard was implemented in a single file context-server.mjs. The new architecture separates CLI and web into two distinct skills.

## Decision

Migration to rule-architect-cli (terminal) and rule-architect-web (browser). rule_tool_architect tool hooked into the new system.

## Consequences

Clear separation between CLI and web interface. Improved maintainability.

## Alternatives Considered

- Keep the old context-server.mjs (rejected: obsolete)
