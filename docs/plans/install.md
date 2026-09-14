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

- [x] **Step 1 - G-2 (flag `--minimal`)**: esporre la superficie MCP ridotta come flag + passo wizard, in sincrono perfetto; nessun cambio al set di 10 tool (via centrale env-mirror, scelta utente 2026-09-14: nessun installer toccato)
  - [x] **1.1**: `--minimal` / `--no-minimal` tri-state in `src/cli/_register-setup.js` (`--minimal`, help cita `--no-minimal` di commander), passthrough `minimal` in `resolveSetupOptions` (`src/cli/setup/_options.js`), toggle `minimal` in `resolveExtras` per pre-selezionare la riga wizard
  - [x] **1.2**: riga "Minimal tool surface" in `extraItems` (`src/cli/setup/_step-extras.js`); `buildInstallPlan` accetta `minimal` e lo passa ad `agentInstallTask`, il cui `run()` chiama `applyMinimalEnv(minimal)` prima di scrivere; il path stretto `installCommand` (`src/cli/commands/_lifecycle.js`) fa lo stesso; i writer specchiano l'ambient in `resolveEnvironment` (`src/cli/installers/_env.js`: `MINIMAL_ENV_VAR` + `minimalEnvFrom`)
  - [x] **1.3**: gate: config agente installata contiene `RULE_MCP_MINIMAL_TOOLS=1` con `--minimal`, `"0"` con `--no-minimal`, assente senza flag; `tools list` invariato; ratchet 150 righe rispettato (`_register-setup.js`, `_app-install.js` a 150 esatti); census rigenerato (`10-cli.md`, `05-env-variables.md`); foundations + installer verdi
- [x] **Step 2 - G-1 (profilo superficie MCP, domanda separata)**: scelta utente 2026-09-14: domanda wizard DEDICATA (nuovo passo Surface), non riuso di quella dei file; meccanismo: una env grammar `RULE_MCP_SURFACE` + filtro additivo nel loader (ADR 082 emenda ADR 081 in senso stretto)
  - [x] **2.1**: grammatica in `src/core/skills/_surface.js` (`parseSurface`, `areasOfSkills`, `filterSurfaceSkills`, hub-kept rule come i file); `toolNameForSkill` esportato da `src/tools/skill/_skill-tool.js`, `REGISTERED_BY_CODE` da `src/core/skills/_skill-tools.js`
  - [x] **2.2**: enforcement in `src/core/skills/_surface-retain.js` (`retainSurface`: preset minimal = allowlist 10 esistente, altrimenti retain di tutti i tool code-registered + skill tool selezionati, warn su nomi ignoti); hook in `_load.js` dopo il blocco minimal; flag `--surface <spec>` + `surfaceOf`/`surfaceArgs`/`applySurfaceEnv` in `src/cli/install/_surface-flags.js`; passo Surface nel wizard (nuova voce rail + HINTS, 9 step, `surface` in piano/task/env con precedenza: surface answered vince sul toggle minimal)
  - [x] **2.3**: gate: `tools list` dal vivo con SURFACE=minimal/standard/areas:frontend/skills:x dà 10/30/33/20 su 107, spec ignota = full + warning; census corrente; installer suite verde; lint zero errori; ratchet 150 rispettato (split `_surface`/`_surface-retain` per ADR 061). NOTA 2026-09-14: foundations ha 9-10 fallimenti TUTTI ambientali (git OS rotto: ogni test fallito lancia `git init`/`git ls-files`); commit e riverifica verde in attesa di CLT/Xcode. Vedi resoconto sotto.
- [x] **Step 3 - G-3 (Mode guidato per agente)**: discouragement testuale, mai rimozione; `--force` = bypass consapevole
  - [x] **3.1**: `modeItemsFor(agents)` in `src/cli/setup/_step-mode.js`: daemon/docker con suffisso `(not recommended for …)` quando non tutti gli agenti sono in `remoteModeAgents`; stdio sempre pulito; `StepMode` usa gli item calcolati
  - [x] **3.2**: `checkRemoteSupport` puro in `src/cli/install/_agent-ops.js`: errore senza force (stesso messaggio di prima), warning con force e installazione che procede; `surfacedWarnings` calcolato ai return (prima perdeva i warning del loop); warning riportati anche nel summary dei task (`_task-core.js`)
  - [x] **3.3**: gate: wizard con cursor mostra sconsiglio; `install --agent cursor --mode daemon` fallisce loud, con `--force` scrive + warning nel JSON; installer suite verde; lint pulito
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
