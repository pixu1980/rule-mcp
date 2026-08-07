# 013 - Sandbox timeout with AbortController

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security

## Context

withTimeout() returned an error to the caller but the underlying Promise continued execution. Possible completion after timeout.

## Decision

withTimeout() now uses AbortController to actually cancel the ongoing operation when the timeout fires.

## Consequences

No pending operations after timeout. Resources properly freed.

## Alternatives Considered

- Ignore the problem (rejected)
- Use clearTimeout without abort (insufficient)
