# 023: Self-update per-invocazione con throttle temporale e fire-and-forget

- **Date**: 2026-08-01
- **Status**: accepted
- **Tags**: self-update, mcp-server, operational, background
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Il self-update del server MCP (src/core/self-update.js) oggi gira una sola volta per processo, al primo tool call della sessione (guard _checked). Un daemon longevo o una sessione stdio prolungata restano giorni senza ricontrollare upstream. L'utente vuole che il controllo avvenga a ogni invocazione di tool. Fetch a ogni call sarebbe antieconomico (latenza di rete per call, martellamento del remote).

## Decision

Il check parte a ogni invocazione di tool ma il git fetch effettivo è throttled: al massimo ogni RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS (default 60, 0 = ogni call, min 1s). Il check è async fire-and-forget: il tool risponde subito, l'update avviene in background e il banner appare sul risultato successivo. Banner solo quando qualcosa è cambiato. Policy restart daemon invariata (no auto-exit multi-client). Fail-open invariato (offline/dirty tree/errori -> skip silenzioso).

## Consequences

Positivi: aggiornamenti ricevuti entro ~1 minuto da qualunque attività, zero latenza aggiuntiva per call (check throttled in background), installazioni git-clone sempre fresche senza intervento manuale. Negativi: possibile ritardo di visibilità del banner di 1 call (async), process.exit differito in stdio può avvenire al più 1 volta/minuto, installazioni non-git (npm/docker) restano su hint manuale.

## Alternatives Considered

1. Fetch sincrono a ogni tool call (latenza di rete su ogni invocazione, respinto)
1. Check once-per-process come oggi (gap di staleness su sessioni lunghe, respinto)
1. Timer periodico indipendente dalle invocazioni (mode=periodic, opzionale in futuro)
