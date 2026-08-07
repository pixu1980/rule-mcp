# 012 - SSE server with Bearer auth

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security

## Context

The SSE server was exposed without authentication. Anyone could connect and send messages. CORS was open to all origins.

## Decision

The SSE server generates a bearer token at startup, requires Authorization: Bearer on /sse and /message, CORS deny-by-default, body limit 1MB.

## Consequences

Server secure by default. Token printed to stderr for the client. Compatible with any MCP client.

## Alternatives Considered

- Hardcoded API key (rejected)
- No authentication (rejected: insecure)
