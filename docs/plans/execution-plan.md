# Execution Plan — Self-update per-invocazione (throttled, async)

Obiettivo: il server MCP controlla aggiornamenti ad **ogni invocazione di tool** (non solo al primo call della sessione), con `git fetch` effettivo **al massimo ogni N secondi** (default 60, configurabile), in **background fire-and-forget** (il tool risponde subito, banner sul risultato successivo), banner **solo quando qualcosa è cambiato**, policy daemon invariata, fail-open invariato.

Decisioni prese in intervista (2025-08-01):
1. Fetch throttled ad ogni invocazione (non ad ogni singola call) — ✅ concordato
2. Check asincrono fire-and-forget — ✅ concordato
3. Latenza 1 fetch/minuto accettabile — ✅ concordato
4. Banner solo a update avvenuto — ✅ confermato
5. Policy restart daemon invariata (no auto-exit multi-client) — ✅ mantenuta
6. Dirty tree: resta fail-open, ri-fetch ad ogni intervallo — ✅ mantenuta
7. Intervallo configurabile via env — ✅ da fare
8. Test deterministici (repo git sandbox, no rete) — ✅

Stato attuale: `src/core/self-update.js` ha già pipeline completa (fetch → ff-only merge → hot-reload skills → banner → restart). Gap: guard `_checked` once-per-process → serve throttle temporale + async.

ADR: `docs/adr/023-self-update-per-invocazione-con-throttle-temporale-e-fire-and-forget.md`

---

## Phase 1 — Test fallenti (TDD) — ✅ completata

- [x] 1. Nuovo `test/self-update-throttle.test.mjs` con harness deterministico: repo git sandbox + stub git su PATH che logga le chiamate (`fetch`). Test **fallenti** sull'implementazione attuale:
  - a) **re-check dopo intervallo**: 2 invocazioni distanziate > intervallo → 2 fetch (oggi: 1 solo, guard once-per-process) — era RED, ora GREEN
  - b) **non-blocking**: `maybeSelfUpdate()` ritorna subito (git stub con `sleep` → il call ritorna <1.5s, oggi aspettava il fetch completo) — RED → GREEN
  - c) **interval env parsing**: default 60s; `0` = check ad ogni call (2 fetch); invalidi/negativi → default — GREEN
- [x] 2. `maybeSelfUpdate()` espone il promise in-flight (router può ignorarlo; i test lo awaitano per determinismo)

## Phase 2 — Throttle engine (`src/core/self-update.js`) — ✅ completata

- [x] 3. Sostituito `_checked` con `_lastCheckAt` (timestamp) + single-flight `_inflight` mantenuto
- [x] 4. `maybeSelfUpdate()` → fire-and-forget: ritorna il promise senza bloccare; kick del check in background solo se intervallo scaduto; banner via `_pendingBanner`; `scheduleRestartIfNeeded` in background
- [x] 5. Nuova env `RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS` (default 60, `0` = ogni call, positivo = secondi anche frazionari). **Deviazione**: nessun clamp minimo a 1s (per testabilità deterministica; `0` copre già il caso "ogni call")
- [x] 6. Fail-open preservato: fetch fallito/offline/dirty tree → nessun crash, nessuna unhandled rejection, prossimo check all'intervallo
- [x] **Bonus architetturale (conseguenza decisione 2)**: `git()` convertito da `execFileSync` (bloccante) a `execFile` promisificato — senza questo il fire-and-forget sarebbe stato finto (il fetch sincrono avrebbe comunque bloccato il tool call). Tutti i caller (`update.js`, `commands.js`, test) già `await`ano → contratto invariato

## Phase 3 — Router wiring (`src/tools/router.js`) — ✅ completata

- [x] 7. `callTool`: `maybeSelfUpdate()` **senza await**; esclusione `pix_update` invariata; `consumeUpdateBanner()` resta dopo (il banner arriva sul risultato successivo al check completato)
- [x] 8. L'ordine pre-cache resta: il check parte comunque prima del lookup cache (un cache hit non può saltarlo)

## Phase 4 — Docs + ADR — ✅ completata

- [x] 9. `README.md` (sezione "Forced self-update") + `docs/06-env-variables.md`: documentato `RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS`
- [x] 10. ADR `023` creato in `docs/adr/`
- [x] 11. Voce in `CHANGELOG.md` (Unreleased → Changed)

## Phase 5 — Validazione — ✅ completata

- [x] 12. `node test/self-update.test.mjs` (T1–T6 verdi) + `node test/self-update-throttle.test.mjs` (5/5 verdi)
- [x] 13. **`pnpm test:all` — EXIT 0 (suite completa, ~40 file)**; aggiunto `self-update-throttle.test.mjs` agli script `test:all` e `ci`
- [x] 14. `pix_check` (rule-backend-node): **6 guardrail falliscono anche sulla baseline (file originale)** — stile frontend-oriented in conflitto con lo stile consolidato del modulo; nessuna classe di violazione nuova introdotta. Deviazione documentata. Nota: anche `pnpm lint` (eslint) è rotto repo-wide pre-esistente (ESLint v9 + `.eslintrc.json` legacy, serve flat config)
- [x] 15. Smoke manuale: server SSE avviato su `http://127.0.0.1:3001/sse` (porta 3000 occupata) — handshake MCP `event: endpoint` funzionante, boot pulito coi moduli modificati

---

## File modificati

| File | Cosa |
|------|------|
| `src/core/self-update.js` | Throttle engine: `_lastCheckAt` + `intervalMs()` + `maybeSelfUpdate` fire-and-forget + `git()` async |
| `src/tools/router.js` | `callTool` non-awaits più il check (fire-and-forget) |
| `src/tools/update.js` | Docblock + description `pix_update` allineati al nuovo comportamento |
| `test/self-update-throttle.test.mjs` | **Nuovo** — 5 scenari throttle/async deterministici |
| `package.json` | `self-update-throttle.test.mjs` aggiunto a `test:all` e `ci` |
| `README.md`, `docs/06-env-variables.md`, `CHANGELOG.md` | Documentazione env var + changelog |
| `docs/adr/023-…`, `docs/adr/README.md` | ADR decisione |
| `docs/plans/execution-plan.md` | Questo piano |

## Prossimi passi possibili (non inclusi)

- `RULE_MCP_AUTO_UPDATE_MODE=on-call|periodic|off` (timer periodico indipendente dalle invocazioni)
- Fix pre-esistente lint eslint (migrazione a flat config)
- Commit del lavoro (scope obbligatorio: es. `feat(self-update): ...`)
