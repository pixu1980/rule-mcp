# Piano di esecuzione — Porting rule-mcp → rule-mcp

- **Fonte:** `~/Projects/work/rule/ai/rule-mcp` — branch `feat/architect-context-pack` (8 commit, non pushati, tree clean)
- **Target:** `~/Projects/pixu1980/rule-mcp` — branch `main`
- **Data:** 2026-08-04
- **Stato:** in attesa di approvazione

## Decisioni approvate dall'intervista

| Decisione | Scelta |
|---|---|
| Scope | **Parità totale** — security + architettura + docs + test + unicorn autofix |
| Branding | **Rinomina rule→rule durante il porting** (env `RULE_MCP_*`→`RULE_MCP_*`, `pix_*`→`pix_*`, `rule-*`→`rule-*`) |
| Conflitti | **Merge selettivo 3-way** — preservare i cambi rule già nel target (es. `46b5af9` unify rule-* commands) |
| Registry agent commands | Sì, completo (registry + CLI install/sync/diagnose + prompt suppression) |
| Tool surface | Sì — solo `./skills`, niente shadowing da `~/.agents/skills` |
| Self-update hardening | Sì, tutto (remote pinning, signature verification, fix phantom update) |
| Container hardening | Sì (USER node, `--ignore-scripts`, bind 127.0.0.1) |
| apply.js + gateway.js | Sì, entrambi (finding 01 e 02) |
| Architect interview servers | Sì, tutto (http-guard + lifecycle registry, finding 03 e 04) |
| Cache NON_CACHEABLE + phantom update | Sì, entrambi (finding 05) |
| Test | Sì, portare i 11 nuovi + agganciare a `test:all` / `ci` / `test:installer` |
| Docs & ADR | Sì, ADR 029-034 + handoff 13 + report audit + CHANGELOG |
| Open items handoff | Sì, risolverli durante il porting |
| Commit | **Atomic conventional commits con scope** (`type(scope): subject`), rispettando l'hook `commit-msg` del target |

## Convenzioni trasversali

- **Rename automatico rule→rule:** env vars (`RULE_MCP_*`→`RULE_MCP_*`, `RULE_MCP_*`→`RULE_MCP_*`), tool prefix (`pix_`→`pix_`), comandi (`/rule-*`→`/rule-*`), cartelle skill (`rule-architect`→`rule-architect`), bin, messaggi e test.
- **Merge 3-way:** per ogni file divergente → diff fonte vs target, applicare la logica nuova della fonte **sopra** la logica rule del target, mai sovrascrivere ciecamente.
- **Self-update remote pinning:** la fonte verifica il remote contro la dichiarazione in `server.json`; nel target il remote dichiarato è `https://github.com/rule/rule-mcp` (github, non gitlab) → adattare.
- **Verifica per fase:** dopo ogni fase `pnpm lint` + test mirati della fase; `pnpm run ci` completo solo a fine lavoro (nota: `pnpm ci` è builtin pnpm, non lo script — usare sempre `pnpm run ci`).
- **Prima di toccare:** baseline verde del target (lanciare `pnpm run ci` attuale e registrare il risultato) e branch di lavoro dedicato.

---

## Fase 0 — Baseline e setup

- [ ] Verificare che il target abbia un albero di lavoro pulito (`git status`)
- [ ] Registrare la baseline: `pnpm run ci` e `pnpm lint` sul target **prima** di qualsiasi modifica (parità onesta per i file non toccati)
- [ ] Creare branch di lavoro: `feat/port-security-audit`
- [ ] Snapshot dei file divergenti fonte↔target (`diff -rq src`) come riferimento

## Fase 1 — Core security: write containment + receipts (finding 01, 02)

- [ ] `src/tools/apply.js` — portare `resolveProjectRoot()` (rifiuta root FS, home, system dirs) e `resolveWriteTarget()` (rifiuta path assoluti, `..`, NUL, destinazioni protette `.git/.ssh/.gnupg/.claude/.agents/node_modules`, symlink escape via `realpath`) — merge 3-way sulla versione rule esistente
- [ ] `src/tools/gateway.js` — portare le receipt path-bound su `canonicalFilesDigest()` (path+content length-prefixed, order/count-sensitive)
- [ ] Test: `test/apply-containment.test.mjs`, `test/gateway-receipt-paths.test.mjs` (rename rule)
- [ ] Verifica: `node --test test/apply-containment.test.mjs test/gateway-receipt-paths.test.mjs`
- [ ] Commit: `fix(security): bind writes to destinations and receipts to paths`

## Fase 2 — Architect interview servers (finding 03, 04, 05)

- [ ] `skills/rule-architect/http-guard.mjs` — nuovo file: guard `Sec-Fetch-Site` + `Origin` + `Host` su ogni `/api/*` di **entrambi** i server interview
- [ ] `skills/rule-architect-web/server.mjs` e `skills/rule-architect/assets/context-server.mjs` — import + applicazione del guard
- [ ] `src/tools/architect.js` — child registry keyed by target dir (reuse, listener detached, output cap 64 KB, kill dopo 30 min e su exit/SIGINT/SIGTERM, `process.execPath`)
- [ ] `src/core/tool-cache.js` — aggiungere `pix_architect` a `NON_CACHEABLE`
- [ ] Test: `test/architect-server-csrf.test.mjs`, `test/architect-interview-lifecycle.test.mjs`
- [ ] Verifica: `node --test test/architect-server-csrf.test.mjs test/architect-interview-lifecycle.test.mjs`
- [ ] Commit: `fix(security): enforce same-origin on interview servers and own their lifecycle`

## Fase 3 — Self-update hardening (finding 06 + phantom update)

- [ ] `src/core/self-update.js` — `normalizeRemoteUrl()` (host+path compare; remote scp-style vs dichiarazione `server.json`), `resolveAllowedRemotes()`, env `RULE_MCP_UPDATE_REMOTE`, `RULE_MCP_UPDATE_REQUIRE_SIGNATURE` (`git verify-commit`)
- [ ] Fix phantom update: `git merge --ff-only` con HEAD immobile non è un update; audit log solo quando HEAD si muove davvero
- [ ] `src/tools/update.js` — modifica correlata (3 righe dalla fonte)
- [ ] Test: `test/self-update-remote-pin.test.mjs` (+ ritocchi a `test/self-update.test.mjs`, `test/self-update-throttle.test.mjs`)
- [ ] Verifica: `node test/self-update.test.mjs && node test/self-update-throttle.test.mjs && node --test test/self-update-remote-pin.test.mjs`
- [ ] Commit: `fix(security): pin the self-update remote and stop reporting phantom updates`

## Fase 4 — Tool surface: solo `./skills` (extra audit)

- [ ] `src/core/skills.js` — `getSkillNames()` scansiona solo `./skills`, accetta solo nomi `rule-*`; `readSkill()` non legge più la home (no shadowing)
- [ ] `src/tools/router.js` — rimozione import `plugin.js` da `~/.agents/skills`
- [ ] `src/resources/index.js` — adeguamento (5 righe)
- [ ] Test: `test/skill-surface-embedded-only.test.mjs`, ritocco `test/minimal-tools.test.mjs`
- [ ] Verifica: `node --test test/skill-surface-embedded-only.test.mjs test/minimal-tools.test.mjs`
- [ ] Commit: `fix(skills): the tool surface is ./skills and nothing else`

## Fase 5 — Agent commands registry (ADR 034)

- [ ] `src/core/agent-command-targets.js` — **nuovo file** (309 righe): registry dei target `/rule-*`
- [ ] `src/core/agent-commands.js` — evoluzione: registry-driven, prompt suppression, handoff persistito e committato sotto `chore(handoff)`
- [ ] `src/cli/commands.js` (+67 righe), `src/cli/doctor.js` (+46), `src/cli/install.js` (refactor 72), `src/index.js` (+4) — comandi `install/sync/diagnose` dal registry
- [ ] `scripts/install-agent-commands.sh` (refactor registry-driven), `scripts/uninstall.sh` (+46)
- [ ] Merge 3-way con il lavoro rule già esistente nel target (`46b5af9` unify rule-* commands, `agent-integrations.js`)
- [ ] Test: `test/agent-command-targets.test.mjs`, `test/agent-commands-generator.test.mjs`, `test/prompt-suppression.test.mjs`, `test/vscode-clean-commands.test.mjs`, `test/agent-commands-install.test.mjs`, `test/install-agent-commands.test.mjs`
- [ ] Verifica: `node --test test/agent-command-targets.test.mjs test/agent-commands-generator.test.mjs test/prompt-suppression.test.mjs test/vscode-clean-commands.test.mjs` + test installer
- [ ] Commit: `feat(commands): registry-driven clean /rule-* command targets` + `chore(scripts): drive command install/removal off the registry`

## Fase 6 — Container hardening (finding 07)

- [ ] `Dockerfile` — `USER node` prima di `CMD`, install con `--ignore-scripts`, env `RULE_MCP_DOCKER=1` (rename dalla fonte)
- [ ] `docker-compose.yml` — pubblicare `127.0.0.1:37999:37999` (merge con il compose rule esistente)
- [ ] Test: `test/docker-hardening.test.mjs`
- [ ] Verifica: `node --test test/docker-hardening.test.mjs`
- [ ] Commit: `fix(security): drop root in the container and bind to loopback`

## Fase 7 — ESLint unicorn autofix repo-wide (parità totale)

- [ ] Verificare che la config eslint del target (`eslint.config.mjs`, già ESLint 10 flat + unicorn) sia allineata a quella della fonte
- [ ] Applicare il fix unicorn (equivalenti del commit `92ff942`) su src/test/scripts — diff puliti, senza toccare la logica
- [ ] Verifica: `pnpm lint` (0 errori, warning ≤ limite)
- [ ] Commit: `chore(repo): apply ESLint unicorn autofix`

## Fase 8 — Test wiring

- [ ] `package.json` — aggiornare `test:installer`, `test:all`, `ci` con i nuovi test (merge con gli script rule esistenti, mantenendo i nomi rule dei bin)
- [ ] Verifica: `pnpm run ci` completo
- [ ] Commit: `chore(scripts): wire security regression tests into ci`

## Fase 9 — Docs & ADR

- [ ] ADR **029** clean commands / **030** write authorization / **031** interview servers / **032** self-update remote / **033** tool surface / **034** registry-driven commands — portare con numerazione coerente all'indice del target (verificare che il target non abbia già un 029 diverso)
- [ ] `docs/reports/security-performance-audit-2026-08-04.md` (283 righe, rename rule)
- [ ] `docs/handoff/13-security-audit-remediation.md` (adattato al target)
- [ ] `docs/02-tools-operations.md`, `docs/05-agent-instructions.md`, `docs/06-env-variables.md` (rename + nuove env)
- [ ] `CHANGELOG.md` — entry per le fix portate
- [ ] Commit: `docs(adr): record decisions 029-034 and the security audit` + `docs(project): update tooling and command docs` + `docs(handoff): add handoff 13`

## Fase 10 — Open items del handoff

- [ ] **docs-architect cap:** `test/docs-architect.test.mjs` permette ≤6 `.md` in `docs/` ma il repo ne ha 8 → alzare il cap (o rimuovere `docs/agent-instructions.md` se ancora duplicato)
- [ ] **`pnpm skills:install` no-op:** lo script copia in `~/.agents/skills` che il server ora ignora → rimuovere o riorientare, aggiornare i test collegati
- [ ] **Indice ADR con numeri duplicati:** il generatore non controlla le collisioni → deduplicare l'indice del target
- [ ] Verifica: `pnpm run ci` verde completo
- [ ] Commit: `fix(docs): raise docs cap and dedupe the ADR index` + `chore(scripts): drop no-op skills:install`

## Fase 11 — Verifica finale e delivery

- [ ] `pnpm lint` pulito
- [ ] `pnpm run ci` verde (parità con baseline sui file non toccati)
- [ ] Diff finale fonte↔target per confermare che non restino fix non portati
- [ ] Restart/verifica dev server (`pnpm dev` su prima porta libera 3000-6000)
- [ ] CHANGELOG riepilogativo del porting

---

## Rischi e note

- **Divergenza reale:** il target ha commit propri (es. `46b5af9`, `021c0f6`, `2153697`) — il merge 3-way è obbligatorio, mai copia cieca.
- **Remote self-update:** la fonte dichiara gitlab (scp-style), il target github → la logica di `normalizeRemoteUrl` deve essere testata con il remote reale del target.
- **`pnpm run ci` baseline:** il handoff segnala che la `ci` della fonte è RED su un test preesistente; verificare la baseline del target all'inizio (Fase 0) per non attribuire al porting fallimenti preesistenti.
- **Git sandbox nei test:** nei test che creano repo git, fare `git add` di path espliciti, mai `git add -A` (il db `.tokensave` sporca l'albero).
- **Hook commit-msg:** ogni commit DEVE avere scope (`type(scope): subject`); i messaggi generati da merge sono esenti.
