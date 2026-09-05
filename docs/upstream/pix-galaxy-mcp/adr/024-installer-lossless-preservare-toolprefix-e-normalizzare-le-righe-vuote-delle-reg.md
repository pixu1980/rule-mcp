# 024: Installer lossless: preservare toolPrefix e normalizzare le righe vuote delle regole

- **Date**: 2026-08-01
- **Status**: accepted
- **Tags**: installer, idempotenza, toolPrefix, mcp-config
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Un ciclo uninstall.sh + install.sh (a) rimuoveva la chiave per-server toolPrefix dall'entry "rule-mcp" in ~/.pi/agent/mcp.json perché upsertJsonServer sostituiva l'intera entry, facendo ricomparire i comandi /mcp__pix_galaxy_mcp__*; (b) aggiungeva una riga vuota a CLAUDE.md a ogni ciclo perché RULES_CONTENT iniziava con \n e l'uninstall rimuoveva solo il blocco marker lasciando la riga.

## Decision

upsertJsonServer/upsertVscode fondono (merge) l'entry esistente con la nuova config preservando le chiavi utente (toolPrefix, timeout, env custom); cmdConfig scrive toolPrefix:"none" di default per pi (tool rule-tool-_, prompt /rule-_); install.sh usa append_rules_block che normalizza i newline finali e inserisce esattamente un separatore; uninstall.sh collassa i newline finali dopo la rimozione del blocco.

## Consequences

Il ciclo uninstall+install è idempotente (nessuna riga vuota accumulata, nessuna chiave utente persa). Le installazioni pi fresche hanno nomi puliti senza prefissi mcp__pix_galaxy_mcp__. Effetto collaterale: una sola normalizzazione one-shot delle righe vuote accumulate in passato (da N righe vuote a 1).

## Alternatives Considered

1. Rimuovere solo una riga vuota prima del marker in uninstall (non converge con stati accumulati in passato)
1. Non impostare toolPrefix di default e affidarsi solo al merge (non ripristina la config già persa degli utenti)
