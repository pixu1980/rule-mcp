# 014 - Lossless and idempotent installer

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security

## Context

The security audit revealed that parseJson() transformed malformed JSON into {}, silently wiping user configuration. backupFile() existed but was never called.

## Decision

parseJson() now returns null on error, not {}. JSON file writes use atomicWrite with preventive backup. Installer is lossless and idempotent.

## Consequences

User configuration is no longer lost on malformed JSON. Install/uninstall operations are reproducible.

## Alternatives Considered

- Continue using silent {} (rejected: dangerous)
- Validate JSON before parsing (too complex)
