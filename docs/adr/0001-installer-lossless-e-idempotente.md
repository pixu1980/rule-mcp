# Installer lossless e idempotente

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security

## Context

L'audit di sicurezza ha rivelato che parseJson() trasformava JSON malformato in {}, cancellando la configurazione utente. backupFile() esisteva ma non veniva mai chiamato.

## Decision

parseJson() ora restituisce null su errore, non {}. Le scritture su file JSON usano atomicWrite con backup preventivo. Installer lossless e idempotente.

## Consequences

Configurazione utente non viene più persa su JSON malformato. Le operazioni di install/disinstall sono riproducibili.

## Alternatives Considered

- Continuare a usare {} silenzioso (scartato: pericoloso)
- Validare JSON prima del parse (troppo complesso)
