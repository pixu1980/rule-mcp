# 012 — Server SSE con autenticazione Bearer

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security

## Context

Il server SSE era esposto senza autenticazione. Chiunque poteva connettersi e inviare messaggi. CORS era aperto a tutte le origini.

## Decision

Il server SSE genera un bearer token all'avvio, richiede Authorization: Bearer su /sse e /message, CORS deny-by-default, body limit 1MB.

## Consequences

Server sicuro per default. Token stampato su stderr per il client. Compatibile con qualsiasi client MCP.

## Alternatives Considered

- API key hardcoded (scartato)
- Nessuna autenticazione (scartato: insicuro)
