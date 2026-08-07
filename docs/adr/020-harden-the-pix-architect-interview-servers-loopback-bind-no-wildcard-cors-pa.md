# 020: Harden the rule-architect interview servers: loopback bind, no wildcard CORS, path containment

- **Date**: 2026-07-30
- **Status**: accepted
- **Tags**: architect, security, mcp, server
- **Author**: rule-architect

## Context

rule-architect ships two zero-dependency Node HTTP servers spawned locally to run the interview UI in the user's browser: skills/rule-architect-web/server.mjs and the MCP-spawned skills/rule-architect/assets/context-server.mjs. Both had three exposures. (1) They called server.listen(PORT) with no host argument, so Node bound all interfaces (0.0.0.0 / ::) - the wizard was reachable from the whole LAN. (2) They sent Access-Control-Allow-Origin: * on every response, so any website the user visited could read the API while the server ran. (3) The static-file handler built a filesystem path from the request pathname with no containment check. Combined, the wildcard CORS plus the all-interfaces bind made a local, single-user tool reachable and readable well beyond the browser it is meant to serve.

## Decision

Bind the interview servers to 127.0.0.1 via an exported BIND_HOST constant, matching the main MCP server's existing loopback default (RULE_MCP_HOST). Remove the wildcard CORS header entirely - the UI is served same-origin and needs no CORS. Add a shared containWithin(filePath, roots) primitive (skills/rule-architect/static-file.mjs) that resolves the candidate path and returns 404 for anything outside the served root(s); new URL() already normalizes ../ over HTTP, so this is the fail-closed backstop for the file-resolution step and any future refactor or non-URL input (the unit test covers the sibling-prefix trick, assets vs assetsX). Main-guard the auto-listen and export createServer/BIND_HOST so importing the modules in tests never starts a listener. Cap POST bodies at 2 MiB via a shared collectBody() reader that returns 413 on overflow, so a request cannot buffer unbounded memory. Verified end to end by spawning the real server: it serves on loopback, is unreachable on the LAN IP, sends no ACAO header, never leaks a file outside the root, and 413s an oversized body.

## Consequences

Positive: the interview servers are reachable only from the local user's browser; no cross-origin read is possible; path traversal fails closed; request bodies are bounded; and the servers became unit-testable in-process (createServer/BIND_HOST exported, listen main-guarded). Negative: the wizard is no longer reachable from another device on the LAN - acceptable, as that was never an intended use; a user who needs it must forward the port explicitly. The containment guard is defense-in-depth rather than a fix for a currently-reachable HTTP exploit (new URL normalization already neutralizes the classic ../ vector), so its value is regression protection and future-proofing.

## Alternatives Considered

1. Leave the servers as-is - rejected: LAN-reachable plus any-website-readable is a real exposure even for a local dev tool, and it contradicts the loopback default the main MCP server already uses.
1. Add only the path-traversal guard - rejected: traversal is the least reachable of the three given new URL() normalization; the all-interfaces bind and wildcard CORS are the actual amplifiers that make anything reachable at all.
1. Authenticate the interview servers with a bearer token like the SSE daemon - rejected as overkill for a short-lived, single-user, loopback-only wizard; loopback bind plus same-origin is sufficient without adding a token-handshake to the browser UI.
