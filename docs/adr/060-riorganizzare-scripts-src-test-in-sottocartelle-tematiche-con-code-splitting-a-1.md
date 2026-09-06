# 060: Riorganizzare scripts/src/test in sottocartelle tematiche con code splitting a 150 righe

- **Date**: 2026-09-06
- **Status**: accepted
- **Tags**: architecture, refactor, testing, structure
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

src/ ha 108 file e 32.993 righe; 24 file superano 150 righe (fino a 1089) violando la regola di soglia 100 linee +50 tolleranza. test/ ha 147 file piatti senza raggruppamento per dominio. La copertura misurata con node --experimental-test-coverage è 71.57% line e 80.91% branch (batch unit), sotto il target 95% anche sui branch; i test CLI/installer girano via subprocess e non sono visibili alla strumentazione in-process. Nessuna skill rule impone un limite di righe per JS server.

## Decision

Riorganizzare scripts/, src/ e test/ (rinominate in tests/) in sottocartelle tematiche per funzionalità; applicare code splitting con soglia 150 righe (100 + 50 tolleranza) ai file JS/MJS, esentando gli installer shell; adottare il pattern module-per-concern di rule-frontend-custom-element come modello di split; rendere la copertura ≥95% branch misurabile (baseline npm script + c8 per i subprocess) e chiudere i buchi con test mirati prima di ogni split.

## Consequences

Positivi: navigabilità, isolamento, coverage misurabile e gate CI. Negativi: grande blast radius meccanico (147 path test, elenchi package.json/workflow/docs), rischio regressioni implicite negli split (mitigato da re-export e test di superficie), lavoro distribuito su più sessioni.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Rinominare solo test/ senza sottocartelle: nessun guadagno di navigabilità
1. Splittare tutto subito senza baseline coverage: variazioni non misurabili
1. Adottare una soglia rigida (100) senza tolleranza: friction alta su file legittimi
