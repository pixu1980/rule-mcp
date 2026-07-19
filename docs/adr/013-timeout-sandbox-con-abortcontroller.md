# 013 — Timeout sandbox con AbortController

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security

## Context

withTimeout() restituiva errore al chiamante ma la Promise sottostante continuava l'esecuzione. Possibile completamento dopo il timeout.

## Decision

withTimeout() ora usa AbortController per cancellare effettivamente l'operazione in corso quando scatta il timeout.

## Consequences

Nessuna operazione pendente dopo il timeout. Risorsa liberata correttamente.

## Alternatives Considered

- Ignorare il problema (scartato)
- Usare clearTimeout senza abort (insufficiente)
