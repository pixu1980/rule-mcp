# Piano di rilavorazione install/uninstall

- **Data**: 2026-09-14
- **Perimetro**: tutto il sistema di installazione (script shell + CLI setup/wizard + installer per agenti) e uninstall
- **Utenza**: singolo dev sulla propria macchina
- **Decisioni di intervista**: semplicita + controllo + robustezza; wizard e flag perfettamente in sincrono; scelta per famiglie di skill e per trasporti; mancanze da audit (fatto)

## Vincolo congelato (ADR 081)

La tecnologia resta **assolutamente la stessa**: stesse dipendenze (Ink 7, toolchain),
stesso sistema di rendering (wizard fullscreen + plain runner con identici default),
stessi floor node 20/22, stessa architettura `src/cli/setup/` + `src/cli/installers/`.
La rilavorazione tocca **solo step e contenuti del wizard**: ordine, testi, scelte
offerte, validazione guidata. Niente cambi di dipendenze, niente nuovo renderer.

## Baseline misurata (2026-09-14)

| Cosa | Come | Risultato |
| --- | --- | --- |
| Superficie MCP | `tools list --json` | 107 tool in 22 famiglie (styleguide 18, frontend 14, toolchain 12, process 11, backend 9, data 8, platform 6, ai 5, devops 5, resto singoli) |
| Drift conteggi | grep nei commenti | codice dice 105 / 95 / ~85, reale 107 |
| Mode supportati | `_catalog.js` | stdio, daemon, docker (+ skills-only ADR 079); remote solo per `pi`, `vscode` |
| Wizard | `_steps.data.js` | install 8 step, uninstall 5 step |
| Minimal MCP | `_minimal.js` | solo env var `RULE_MCP_MINIMAL_TOOLS=1`, 10 tool, enforcement post-registrazione |

## Step

- [ ] **Step 1 - G-2 (flag `--minimal`)**: esporre la superficie MCP ridotta come flag + passo wizard, in sincrono perfetto; nessun cambio al set di 10 tool
  - [ ] **1.1**: aggiungere `--minimal` / `--no-minimal` tri-state in `src/cli/setup/_options.js` (`resolveSetupOptions`), con default assente = comportamento attuale (env var ancora letta)
  - [ ] **1.2**: aggiungere il toggle nel passo Extras del wizard (`src/cli/setup/_step-extras.js` + `_views-install.js`) con stesso default del flag; ogni risposta del wizard deve produrre gli stessi argv del flag (pattern `selectionArgs`)
  - [ ] **1.3**: gate: `tools list` con `--minimal` = 10 tool dell'allowlist; `rule_tool_fix` lint pulito su `src/cli/setup/`; suite foundations verde
- [ ] **Step 2 - G-1 (profilo superficie MCP per famiglie)**: riusare la grammatica preset/famiglie anche per i tool MCP, non solo per gli agent-command file
  - [ ] **2.1**: estendere `selectionOf`/`selectionFrom` in `src/cli/install/_selection-flags.js` e `_selection.js` con preset `minimal|standard|full` mappati sulle 22 famiglie censite; scelta ignota = warning su stderr senza bloccare (comportamento attuale)
  - [ ] **2.2**: aggiungere il passo di scelta nel wizard (estendere il passo Commands: `src/cli/setup/_step-commands.js` + `_commands-items.js`) con preset offerti nello stesso ordine di `PRESETS`; aggiungere l'inversa in `selectionArgs` cosi wizard e flag restano in sincrono
  - [ ] **2.3**: gate: install `--preset minimal` espone solo dispatcher + action tool; `--families styleguide,frontend` espone solo quelle; census pinna i conteggi; foundations verde
- [ ] **Step 3 - G-3 (Mode guidato per agente)**: il passo Mode sconsiglia daemon/docker per gli agenti senza supporto remote invece di limitarsi all'avviso
  - [ ] **3.1**: in `src/cli/setup/_step-mode.js`, quando gli agenti selezionati non sono in `remoteModeAgents`, preselezionare `stdio` e marcare daemon/docker come sconsigliati (testo, non rimozione: la scelta resta possibile con `--force`)
  - [ ] **3.2**: aggiungere la stessa regola nel plain runner (`src/cli/setup/_plain.js` / `_options.js`) cosi flag e wizard restano in sincrono
  - [ ] **3.3**: gate: wizard con agente `cursor` + mode daemon mostra sconsiglio; install non interattivo equivalente stampa lo stesso warning; test del passo aggiornati
- [ ] **Step 4 - G-4 (validazione fail-fast in `install.sh`)**: lo script valida le opzioni note prima di scaricare/eseguire, invece di inoltrarle verbatim
  - [ ] **4.1**: aggiungere in `scripts/install.sh` (e specchio in `scripts/install.ps1`) il controllo delle opzioni note con errore immediato e rimando a `--help` per quelle ignote; solo testi e controlli, nessuna nuova dipendenza
  - [ ] **4.2**: gate: `./scripts/install.sh --opzione-inesistente` fallisce prima di qualsiasi download con messaggio che cita `--help`; installer test verdi
- [ ] **Step 5 - G-5 (census pinnato + fix drift)**: fissare il numero reale di tool e correggere i conteggi driftati
  - [ ] **5.1**: aggiungere test che pinna i 107 nomi (`tools list --json` vs snapshot) e aggiorna i commenti driftati (`_minimal.js`, skill, census) al numero reale
  - [ ] **5.2**: gate: census verde; nessun commento nel repo cita piu 105/95/~85

## Dipendenze

- Step 1 prima di Step 2: il flag `--minimal` e il toggle Extras sono il meccanismo che il profilo per famiglie riusa.
- Step 3 indipendente da 1-2 (tocca solo il passo Mode); puo andare in parallelo dopo lo Step 1.
- Step 4 e 5 indipendenti da tutto; in parallelo in qualsiasi momento.
- Ordine di esecuzione: 1, poi 2 e 3 in parallelo, 4 e 5 quando si vuole.

## Deliberatamente fuori perimetro (vincolo ADR 081)

- Enforcement minimal a registration-time, porte di storage, interfacce Transport: restano al run architect (ARCH-3, ARCH-5, ARCH-10).
- Nuovi renderer, nuove dipendenze, cambi di floor node: mai in questo piano.
- Collassare i 107 tool in pochi dispatcher: vietato dal contratto pubblico (stesso vincolo del piano architect).
