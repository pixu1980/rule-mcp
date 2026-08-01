# Mega-review — `openai-codex/gpt-5.6-sol`, router `pix_tool`, skill e tool

- **Data audit:** 2026-07-15
- **Repository:** `rule-mcp@1.0.0`
- **Commit di riferimento:** `4d9764b`
- **SDK MCP:** `@modelcontextprotocol/sdk@1.29.0`
- **Host/model verificato:** Pi `0.80.6`, provider `openai-codex`, modello `gpt-5.6-sol`

> **Verdetto sintetico:** `gpt-5.6-sol` è interoperabile con i tool MCP di `rule-mcp` nell'host Pi, ma il prodotto nello stato corrente **non è production/release compliant**. Il router `pix_tool` non è un gate: senza il prompt esplicito `/rule-mcp`, il modello ha usato il router solo in 1 richiesta di dominio su 5 e ha spesso chiamato direttamente tool specializzati. Inoltre i guardrail sono aggirabili, `rule_tool_fix` può scrivere fuori dalla root, i prompt MCP non rispettano lo schema ufficiale e build/release possono distruggere il corpus `skills/`.

## 1. Ambito, snapshot e limiti

Il repository era già fortemente modificato prima dell'audit. Questo documento valuta il **working tree osservato**, separandolo dalla baseline Git quando necessario. Non sono state ripristinate né corrette le modifiche dell'autore. Le prove distruttive sono state eseguite in directory temporanee; gli ADR creati automaticamente durante le prime chiamate sono stati rimossi a fine audit.

### Copertura

Esclusi `.git/`, `node_modules/`, `.tokensave/`, `.context/`, `dist/`, `coverage/` e `test-results/`:

| Area | File | Righe |
|---|---:|---:|
| Totale snapshot prima di questo report | 474 | 61.546 |
| `src/` | 32 | 9.313 |
| `src/` + `bin/` + `scripts/` | 42 | 12.221 |
| `test/` | 22 | 1.712 |
| `skills/` (tutti gli asset inclusi) | 377 | 39.924 |
| `SKILL.md` | 70 | 17.581 |
| `docs/` | 22 | 4.958 |

Sono stati eseguiti:

- parse sintattico di 138 file `.js`/`.mjs` con `node --check`;
- parse di 5 shell script con `bash -n`;
- parse di 9 JSON con `JSON.parse`;
- parse di 15 YAML con Ruby/Psych;
- inventario AST/import/export, complessità, link Markdown, metadati e frontmatter;
- matrice runtime di 67 skill-tool × 6 modalità = **402 chiamate**;
- test MCP in-memory con client/server ufficiali SDK;
- test avversariali su guardrail, file-system, installer, router, risorse, prompt e packaging;
- 8 conversazioni reali separate con `openai-codex/gpt-5.6-sol`.

PowerShell e ShellCheck non erano installati: i 2 `.ps1` non hanno quindi una validazione parser nativa e i `.sh` non hanno una verifica ShellCheck. Docker non era disponibile: il Dockerfile è stato auditato staticamente, non costruito.

“Ogni riga” significa che ogni file testuale nel perimetro è entrato negli scan e che ogni sottosistema eseguibile è stato letto/revisionato. Non significa una certificazione formale della veridicità di ogni affermazione contenuta nelle 17.581 righe di documentazione skill né l'esecuzione di ogni snippet SQL/framework su tutte le piattaforme.

## 2. Scorecard finale

| Area | Verdetto | Evidenza principale |
|---|---|---|
| Avvio MCP stdio | **Pass** | Client/server SDK in-memory con handshake riuscito |
| `tools/list` e `tools/call` | **Pass tecnico** | 76 tool isolati, chiamate schema-valide |
| Uso reale da `gpt-5.6-sol` | **Pass tecnico** | Pi registra provider/modello corretti e tool call riuscite |
| Router `pix_tool` automatico | **Fail** | 1/5 richieste di dominio senza comando esplicito |
| Router con `/rule-mcp` | **Pass parziale** | 1/1 invocato per primo, ma route primaria errata per path bias |
| Qualità routing | **Parziale** | 52/60 top-1; 58/60 top-6; multilingual e prompt generici deboli |
| Skill trigger Pi nativo | **Parziale** | In un caso il modello ha letto 8 `SKILL.md`, ma non via router MCP |
| `rule_tool_check` come gate | **Fail** | `previousPassed` aggirabile e risultato non legato all'hash del codice |
| `rule_tool_fix` safety | **Fail bloccante** | `dryRun` ignorato in `generate`; path traversal confermato |
| MCP resources | **Parziale** | Risorse standard leggibili; plugin elencati ma non risolvibili |
| MCP prompts | **Fail bloccante** | Shape e ruolo non conformi allo schema SDK |
| MCP completion | **Fail funzionale** | Usa un tipo ref inesistente per completare argomenti tool |
| Template/componenti | **Fail** | Output non framework-specific o non conforme ai guardrail |
| Test suite | **Fail** | `test:all` strutturalmente errato; suite rosse e copertura incompleta |
| CI/release/build | **Fail bloccante** | file test/build/LICENSE mancanti; gate mascherati; embed distruttivo |
| Installer/uninstaller | **Fail** | config malformate sovrascritte; `skills install --all` crasha non-TTY |
| Sicurezza SSE | **Fail** | HTTP locale senza auth, CORS `*`, tool mutanti raggiungibili |
| Documentazione/manifest | **Fail drift** | conteggi/tool/versioni/source e claim “zero dependencies” incoerenti |
| Production readiness complessiva | **Non approvata** | P0 e P1 aperti |

## 3. Risposta diretta: il router e i trigger entrano davvero in chat?

### 3.1 Esperimento reale su `gpt-5.6-sol`

Le sessioni sono state eseguite con `--no-session`, output JSONL separato e auto-ADR disabilitato dove possibile. Il record finale del caso A riporta realmente:

```json
{
  "provider": "openai-codex",
  "model": "gpt-5.6-sol",
  "stopReason": "stop"
}
```

| Caso | Richiesta | Chiamate osservate | `pix_tool` prima? | Esito |
|---|---|---|---|---|
| A | Pulsante accessibile React | `pix_tool` → `rule_tool_search` → `rule_tool_frontend_react` → 2× `rule_tool_check` | Sì | Flusso quasi completo, ma risposta finale diversa dall'artefatto controllato |
| B | Rate limiting/abusi | `rule_tool_backend_security` → `rule_tool_search` | **No** | Tool specializzato scelto direttamente |
| C | API PostgreSQL, paginazione/filtri | `rule_tool_backend_api_design` → `rule_tool_data_postgresql` → `rule_tool_search` | **No** | Due skill-tool diretti |
| D | Hook React con AbortController | `rule_tool_frontend_react` → `rule_tool_search` | **No** | Tool framework diretto |
| E | “Quale workflow rule?” | 8 chiamate native `read` su `SKILL.md` | No MCP | Il trigger skill dell'host funziona quando richiesto esplicitamente |
| F | `2 + 2` | Nessun tool | n/a | Comportamento corretto |
| G | Ripetizione rate limiting | `rule_tool_backend_security` → `rule_tool_search` | **No** | Conferma del caso B |
| H | Stessa richiesta preceduta dal template `/rule-mcp` | `pix_tool` → `rule_tool_search` → `rule_tool_backend_security` → … | **Sì** | Il template forza il primo passo, ma `pix_tool` routea inizialmente al frontend |

Risultato empirico, senza sovrainterpretare il campione:

- richieste di dominio senza comando esplicito (A–D, G): router usato **1/5 = 20%**;
- richieste con comando esplicito (H): router usato per primo **1/1**;
- chiamata diretta a skill/tool appropriati: frequente e operativa;
- nessun meccanismo server-side blocca una risposta che non chiama `pix_tool`.

### 3.2 Perché accade

`src/tools/ai.js` registra `pix_tool` come un normale tool. `src/tools/router.js` registra tutti gli altri tool nello stesso registry e `src/server.js` li espone simultaneamente. `pix_tool` restituisce JSON con `route` e `next_tools`, ma **non invoca né orchestra** quei tool: il modello decide se proseguire. L'enforcement si attiva solo dopo una tool call già scelta dal client.

Il template `prompts/rule-mcp.md` è quindi utile, ma resta un'istruzione in linguaggio naturale. In MCP non esiste una capability con cui il server possa imporre “chiama questo tool prima di rispondere”. Per una garanzia reale serve enforcement nell'host/agent harness oppure una sola API orchestratrice che nasconda i tool secondari.

### 3.3 La check finale non è legata alla risposta finale

Nel caso A il modello ha controllato una funzione con props, `disabled`, JSDoc e nome file `_AccessibleButton.tsx`; la risposta finale ha invece mostrato una funzione senza props/JSDoc che usa `console.log`. Il server non conosce la risposta finale del modello e non emette una ricevuta legata all'hash del codice. “Ho chiamato `rule_tool_check`” non prova quindi che l'artefatto consegnato sia quello validato.

## 4. Router: qualità, bias e determinismo

### 4.1 Risultati quantitativi

- corpus isolato: 70 skill, 69 route candidate, 76 tool;
- definizioni tool: 90.873 byte, circa **22.719 token** usando la stima byte/4;
- 60 prompt curati: **52/60 top-1**, **58/60 top-6**;
- 69 prompt derivati dalle descrizioni delle skill: **68/69 exact top-1**;
- la descrizione di `rule-ui` viene routeata a `rule-ui-design-system`;
- `loadAllSkills(true)` duplica il registry: **76 → 152 tool**.

### 4.2 Path bias dominante

La logica a `src/tools/ai.js:222` applica un floor/bias forte al framework rilevato. Il repository stesso viene classificato da `rule_tool_detect` come `vanilla` frontend, pur essendo un server MCP Node. Prova:

| Prompt | Path | Route primaria |
|---|---|---|
| “Protect a backend web service…” | assente | `rule-backend-security` |
| stesso prompt | root di questo repo | **`rule-frontend-vanilla-reactive`** |
| stesso caso via `/rule-mcp` | root di questo repo | **`rule-frontend-vanilla-reactive`, confidence 1** |

La route backend corretta compare solo come alternativa. La rilevazione progetto deve essere un segnale secondario e domain-aware, non un override trasversale.

### 4.3 Confidence fuorviante

`confidence` è normalizzata sul massimo del gruppo (`rawScore / maxRaw`, `src/tools/ai.js:239`), quindi il candidato migliore ottiene quasi sempre `1`, anche quando la query è ambigua. “Build a secure API” ha prodotto `rule-platform-library` con confidence `1`. Questa non è una probabilità né una confidence assoluta; l'API dovrebbe chiamarla `relativeScore` oppure calibrare una soglia assoluta con fallback “unknown”.

### 4.4 Multilingua incompleta

Il corpus e i sinonimi sono prevalentemente inglesi:

| Lingua | Prompt sicurezza backend | Route |
|---|---|---|
| Inglese | rate limiting + secure headers | `rule-backend-security` |
| Italiano | limitazione richieste + intestazioni sicure | `rule-backend` |
| Francese | limitation requêtes + en-têtes sécurisés | `rule-backend` |

Il dominio generale viene riconosciuto, ma la specializzazione si perde. Servono alias multilingua o una fase di normalizzazione/classificazione semantica.

### 4.5 TLDR e ricerca

`src/tools/skill.js:104` esegue `search(query, 5)` e **poi** filtra per skill. Se quella skill non è nei primi cinque risultati globali, TLDR restituisce “no relevant sections” anche quando il documento contiene materiale utile. Con la query canonica basata sul nome skill, 30 skill-tool non trovano sezioni. La ricerca deve filtrare il corpus per skill prima del top-k.

### 4.6 Contaminazione da `$HOME`

In ambiente isolato vengono caricati 76 tool. Con il normale `$HOME` del workstation vengono importate 11 skill esterne (`caveman-*`, `frontend-design`, ecc.) e il totale sale a 87. `loadPluginJs()` importa inoltre codice JavaScript arbitrario dal plugin. Conseguenze:

- superficie e comportamento non riproducibili;
- prompt/tool supply-chain locale;
- plugin eseguiti con i privilegi del server;
- build, test e produzione dipendono dal contenuto della home dell'utente.

L'import di plugin deve essere opt-in, allowlisted e separato dal corpus ufficiale.

## 5. Finding bloccanti (P0)

### P0-01 — `prompts/get` non è MCP-conforme

- `src/server.js:150-154` restituisce `{ prompt }`;
- lo schema ufficiale richiede `{ description?, messages }` al top level;
- `src/prompts/index.js` usa `role: "system"`, ma MCP ammette `user` o `assistant`.

Tutti e cinque i prompt falliscono `GetPromptResultSchema`. `prompts/list` passa; `prompts/get` no.

**Fix:** restituire `description`/`messages` senza wrapper e convertire il messaggio iniziale in ruolo `user`.

### P0-02 — Build/release/Docker possono cancellare tutte le skill

`scripts/embed-skills.mjs:42` rimuove `skills/` prima di verificare la sorgente. Copia esclusivamente `~/.agents/skills/rule-*`, escludendo la skill centrale `pix_tool`; se non trova sorgenti crea solo una directory placeholder senza `SKILL.md`.

Riproduzione in clone temporaneo con `HOME` vuota:

```text
Embedding skills...
⚠ No rule skills found in ~/.agents/skills/. Creating placeholder.
Embedded 0 skills
SKILL_MD_COUNT=0
```

Impatto:

- `prebuild`, `prepublishOnly`, workflow release e Docker eseguono lo script;
- una CI pulita perde il corpus versionato;
- una macchina dello sviluppatore può pubblicare contenuti locali non revisionati;
- l'operazione non è atomica né riproducibile.

**Fix:** il repository deve essere la sorgente canonica; scrivere in una directory staging, validare hash/conteggio, poi sostituire atomicamente. Mai leggere `$HOME` durante build/release.

### P0-03 — Pipeline release non eseguibile come dichiarata

- `package.json` esegue `node scripts/package.mjs`, ma il file non esiste;
- `.github/workflows/ci.yml` e `release.yml` eseguono `test/ai.test.mjs`, che non esiste;
- il Dockerfile copia `LICENSE`, che non esiste;
- `scripts/package.sh` sovrascrive gli installer universali con stub minimali e maschera il fallimento di `npm pack`;
- lint/format/audit nei workflow usano `|| echo`, quindi non bloccano la pipeline;
- `eslint` e `prettier` non sono dipendenze dichiarate.

Il comando `pnpm build`, eseguito in una copia temporanea per non distruggere il repo, termina con `MODULE_NOT_FOUND scripts/package.mjs` dopo avere già svuotato `skills/`.

### P0-04 — `rule_tool_check` è bypassabile

`src/core/guardrails.js:93-100` accetta `previousPassed` dal chiamante e salta quei controlli senza verificare una ricevuta, una sessione o l'hash del codice. Passando tutti gli ID, codice non conforme ottiene `allPass: true`.

Ulteriori false negative/positive riprodotte:

| Input | Risultato attuale | Atteso |
|---|---|---|
| CSS raw `.foo:hover { … }` | Pass | Fail zero-class |
| React `style={{ color: "red" }}` | Pass | Fail no-inline-style |
| CSS `.foo > span`, `.foo.bar` | Pass | Fail |
| `previousPassed` con tutti gli ID + codice invalido | Pass | Eseguire tutti i check o rifiutare ricevuta |
| React `import "./Button.css"` con CSS incluso nel payload | Fail external CSS | Pass |
| File Markdown che cita `.css` | Fail `css-comments-required` | Regola non applicabile |

Cause: `extractRealCSS()` ignora CSS raw; regex classi riconosce solo `.foo {`; inline style cerca solo attributi HTML quotati; l'import CSS usa il literal string check `import .*.css`.

**Fix:** rimuovere `previousPassed` dall'input pubblico oppure emettere una receipt server-side firmata e legata a `sha256(code + context + guardrailVersion)`. In ogni caso rieseguire tutti i check sul pass finale.

### P0-05 — `rule_tool_fix` ignora dry-run e permette path traversal

Nel ramo `mode=generate`, `src/tools/fix.js:58-79` scrive sempre e non consulta `dryRun`. Inoltre combina `path`, `baseDir` e file generati con `join()` senza verificare che il path risolto resti dentro la root.

Prove in directory temporanea:

- `dryRun: true` ha creato file reali;
- `baseDir: "../outside"` ha scritto fuori dalla root;
- file esistenti vengono sovrascritti senza conferma/backup.

**Fix:** `resolve`, `relative`, rifiuto di path assoluti/`..`, no symlink escape, modalità preview realmente read-only, scrittura atomica e collision policy esplicita.

### P0-06 — SSE locale senza auth + CORS wildcard + tool mutanti

`src/transport/sse.js:38` imposta `Access-Control-Allow-Origin: *`; il daemon avvia HTTP su `127.0.0.1:37999` senza token. Una pagina web visitata dall'utente può aprire SSE, leggere il session endpoint e inviare JSON-RPC al localhost. La catena diventa critica perché `rule_tool_fix` e ADR scrivono file, e `rule_tool_fix` consente path escape.

Altri limiti:

- body POST accumulato in memoria senza limite (`Buffer.concat`);
- una nuova sessione SSE chiude quelle precedenti;
- nessuna origin allowlist, CSRF token o capability grant.

**Fix:** token bearer random per avvio, CORS deny-by-default/allowlist, validazione `Origin`, body limit, consenso per tool mutanti e preferenza stdio. Il binding loopback riduce l'esposizione di rete ma non protegge dai browser locali.

### P0-07 — `rule_tool_architect interview` è rotto nello snapshot corrente

Il tool cerca `skills/rule-architect/assets/context-server.mjs`, ma il working tree ha cancellato l'intero asset tree. La nuova implementazione è distribuita in `rule-architect-cli`/`rule-architect-web`, ancora untracked e non collegata al tool ufficiale. La matrice 402-call ha un solo errore operativo: `rule_tool_architect` in modalità `check`, coerente con la migrazione incompleta.

**Fix:** completare una sola migrazione atomica, aggiornare tool, test, package files e documentazione nello stesso commit; evitare due wizard concorrenti.

### P0-08 — Generator e component template non sono una sorgente affidabile

`rule_tool_fix generate` dichiara framework Angular e Astro ma `generateComponentFiles()` gestisce solo React/Solid, Vue, Svelte e vanilla; Angular/Astro cadono nel default custom element. Il custom element usa un tag senza trattino (`customElements.define("mycomponent", …)`), invalido per la piattaforma.

`rule_tool_component` ha problemi complementari:

- React: 0/6 template UI supera i guardrail per JSDoc mancante;
- Svelte: 0/6 supera `css-comments-required`;
- Angular, Astro e Solid ricevono generic HTML/CSS con `{{ label }}`, non componenti validi per il framework;
- il check sul primo code fence può ignorare il secondo fence CSS;
- modal senza semantics `dialog`, focus management e accessible close label;
- `<button>` spesso senza `type="button"`.

In modalità multi-file, **98 file generati su 114** non superano almeno un guardrail dichiarato del progetto; 16 combinazioni multi-file restituiscono direttamente errore.

## 6. Finding alti (P1)

### P1-01 — Il “fail-closed workflow” è advisory

`preprocessToolCall` e `postprocessToolResult` sono utili e validano payload/output, ma esistono solo dentro `callTool()`. Non intercettano testo finale, file scritti dall'host o risposte senza tool. Documentazione e messaggi devono evitare di presentarlo come garanzia end-to-end.

### P1-02 — MCP completion è una capability morta

`src/server.js:100` controlla `ref.type === "ref"` per completare argomenti di tool. Lo schema MCP `complete` supporta riferimenti a prompt/resource (`ref/prompt`, `ref/resource`), non tool argument completion e non il tipo `ref`. Le richieste schema-valide restituiscono sempre una lista vuota.

### P1-03 — Resource list/read incoerenti per plugin

`listResources()` usa tutti i nomi di `getSkillNames()` e pubblica per esempio `rule://caveman`; il regex di `readResource()` accetta solo nomi che iniziano con `pix_tool`, quindi la risorsa pubblicizzata torna “Resource not found”. Inoltre `rule://skills` include path assoluti e duplicati embedded/home, esponendo dettagli del filesystem.

### P1-04 — Reload non idempotente

`loadAllSkills(force = true)` non svuota `_tools`: una seconda chiamata raddoppia l'elenco da 76 a 152. Il comando reload può quindi generare nomi duplicati, ambiguità e crescita memoria. La registrazione deve essere keyed-map/idempotente e atomica.

### P1-05 — Auto-ADR produce side effect non richiesti e race

L'hook wildcard di `src/tools/adr.js:327` crea ADR per routing/detection/fix. Le prime quattro chiamate di audit hanno creato ADR 011–014 e modificato l'indice senza una richiesta esplicita; sono stati rimossi a fine audit. Il numbering “scan max + 1” e la riscrittura dell'indice non hanno lock, quindi processi concorrenti possono collidere.

**Fix:** default off, opt-in esplicito per sessione, lock/atomic rename e deduplica semantica.

### P1-06 — Installer può perdere configurazioni utente

`src/cli/install.js:137` trasforma JSON non valido in `{}`; gli upsert successivi riscrivono il file cancellando il contenuto precedente. `backupFile()` esiste ma non viene usato. L'uninstaller ha inoltre mapping generici che non sempre coincidono con i path/config speciali usati dall'installer.

**Fix:** parse fail-closed, backup obbligatorio prima di ogni modifica, write atomica e test round-trip per tutti i 23 agenti.

### P1-07 — `skills install --all` non è non-interattivo e il copier è errato

In una shell non-TTY:

```text
TypeError: stdin.setRawMode is not a function
```

`--all` pre-seleziona gli elementi ma chiama comunque l'interfaccia raw. Inoltre `copySkill()` combina `source` con `Dirent.parentPath` già assoluto, creando path inesistenti/duplicati su Node 24. Gli asset correnti mostrano già directory `assets/assets` in quattro skill.

### P1-08 — Gestione segreti insicura nell'installer shell

`scripts/install.sh` legge API key senza modalità silent, le interpola senza escaping in `.bashrc`/`.zshrc`, può duplicarle a ogni run e salva copie in file senza `chmod 600` esplicito. Il server MCP non necessita di queste chiavi per il proprio funzionamento.

**Fix:** rimuovere la raccolta segreti dall'installer oppure usare keychain/provider CLI; mai scrivere token in shell rc.

### P1-09 — Nuovo wizard web: XSS e server esposto

La versione untracked in `skills/rule-architect-web/`:

- interpola input e messaggi di errore in `innerHTML` senza escaping;
- usa numerosi `onclick`/`oninput` inline e uno `style=` inline, violando i suoi stessi principi;
- imposta CORS `*`;
- accumula request body senza limite;
- usa `server.listen(PORT)` senza host, quindi ascolta su tutte le interfacce;
- scrive configurazione senza autenticazione.

Non deve essere distribuita prima di sanitizzazione, event listener esterni, binding loopback e token sessione.

### P1-10 — Metadata/package incoerenti

- package `1.0.0`, package in `server.json` `0.1.0`;
- repository GitHub con `"source": "gitlab"`;
- descrizione “Zero npm dependencies” ma dipendenze runtime SDK/Zod;
- self-dependency `"rule-mcp": "link:"`, che crea un link a sé stesso e warning bin in install pulita;
- README dichiara 71 tool, runtime isolato 76 e live 87.

### P1-11 — Sandbox timeout non cancella il lavoro

Il timeout restituisce errore al chiamante, ma la Promise sottostante continua e può completare una scrittura dopo il timeout. Per tool mutanti servono `AbortSignal`, cancellazione cooperativa e transazioni/rollback.

### P1-12 — Handoff incompleto

Il nome progetto usa `package.json` del cwd anche quando `projectDir` punta altrove; il git diff standard non include untracked file, proprio quelli più rilevanti nello snapshot corrente. Usare sempre cwd=`projectDir`, includere status/nomi untracked e applicare limiti/redaction prima di inviare il contesto a un modello.

## 7. Finding medi e manutenzione (P2)

- **Documentazione stale:** l'estrazione dei token `pix_*` trova 32 nomi non presenti nel registry; esclusi il nome server e gli esempi intenzionali, circa 30 sono alias obsoleti come `pix_react`, `pix_vue`, `pix_angular`, `pix_docker` e `rule_tool_testing`, soprattutto in `docs/01-product-architecture.md` e `docs/02-tools-operations.md`.
- **API/documentazione interna:** lo scan ha rilevato 20 import inutilizzati e 22 simboli pubblici privi di documentazione; `cli()` e `daemonCommand()` concentrano responsabilità e complessità elevate.
- **Dipendenze cicliche:** registry, skill loader, resource/tool registration e auto-ADR formano cluster ciclici che rendono ordine d'import e side effect difficili da prevedere.
- **Naming/generazione:** `formField` diventa `Formfield`, perdendo il confine di parola; file/componenti generati mescolano `.js`, `.jsx`, `.ts` e barrel senza una policy TypeScript esplicita.
- **Health check insufficiente:** `doctor` può restituire `ok: true` anche quando prompt, build, release e alcune configurazioni agente sono invalide.
- **Porta SSE non configurabile da CLI:** `serveCommand()` passa sempre `37999` e `src/index.js` non inoltra `--port`; il tentativo `serve --port 3004` ha comunque colliso su 37999. Questo contribuisce alla fragilità dei test/daemon.
- **Tool annotations assenti:** i client non ricevono `readOnlyHint`, `destructiveHint` o `idempotentHint`; tool di sola lettura e tool mutanti appaiono equivalenti.

## 8. Test, lint, CI e release: risultati reali

| Comando/prova | Stato | Nota |
|---|---|---|
| `node test/smoke.mjs` | Pass | Smoke molto superficiale |
| `pnpm run ci` | **Fail** | Si ferma su `rule-data-duckdb` senza `See also` |
| `pnpm test:all` | **Fail** | Esegue suite Playwright con `node` |
| batch manuale, 19 file (`console-test` escluso) | 14 pass / 5 fail | daemon, docs, skill-docs, 2× Playwright |
| `pnpm lint` | **Fail** | `eslint` non dichiarato; audit esterno rileva 324 problemi |
| `pnpm format` | **Fail** | `prettier` non dichiarato; audit esterno segnala 292 file |
| `pnpm audit --prod` | Pass | 0 vulnerabilità note nel registry al momento del test |
| `pnpm build` in clone temp | **Fail** | embed cancella skill, poi `package.mjs` mancante |
| `pnpm pack` in clone temp | Pass parziale | Pack possibile, non prova correttezza del publish workflow |
| JSON/YAML/JS/Bash syntax | Pass | PowerShell non verificato |
| Docker build | Non eseguito | Docker assente; staticamente fallisce per `LICENSE` e embed |
| `rule_tool_check` su questo report Markdown | **Fail 1/16** | Falso positivo `css-comments-required` perché il testo cita `.css` |

Nota operativa: con pnpm 11, `pnpm ci` è un comando install built-in; per eseguire lo script package occorre `pnpm run ci`.

### Debolezze dei test

- `test:all` include `add-once.test.mjs` e `architect-ui.test.mjs`, che richiedono Playwright runner;
- Playwright usa porta hard-coded 19000, già occupata durante l'audit;
- CI GitHub chiama un file inesistente;
- la suite non copre `previousPassed`, CSS raw, React style object, path traversal, dry-run, malformed config, prompt schema o resource plugin;
- `doctor` restituisce `ok: true` anche con build/prompt/release rotti e config agent non validate;
- CI maschera lint/format/audit invece di usarli come gate.

## 9. Audit skill e contenuti

Tutte le 70 directory hanno:

- nome frontmatter coerente con la directory;
- nomi lowercase/hyphen compatibili con il formato Agent Skills;
- descrizione presente e sotto 1.024 caratteri;
- link Markdown relativi risolvibili;
- tool callable nelle modalità dichiarate, salvo il ramo architect già descritto.

Gap trasversali:

- `rule-data-duckdb`, `rule-data-indexed-db`, `rule-data-sqlite` non hanno `See also` e rompono la suite;
- 30 query TLDR canoniche non restituiscono sezioni per il bug top-k globale;
- `rule-architect-cli`, `rule-architect-web` e le tre nuove skill data sono untracked, quindi non fanno parte di una release Git riproducibile;
- descrizioni e API descrivono spesso un enforcement più forte di quello realmente ottenibile;
- molti asset sono duplicati (`assets/assets`) o generano codice che non soddisfa i guardrail.

La tabella completa per skill è nell'Appendice A.

## 10. Audit tool

### 10.1 Skill-tool

Per ognuno dei 67 skill-tool sono state chiamate le modalità:

1. `full`;
2. `summary`;
3. `search`;
4. `guardrails`;
5. `check`;
6. `tldr`.

Totale: **402 chiamate**. Il trasporto e lo shape MCP sono operativi. Questo prova la callability, non la correttezza semantica di ogni testo restituito. `rule_tool_architect check` è l'eccezione runtime nello snapshot di migrazione.

### 10.2 Tool deterministici

| Tool | Verdetto |
|---|---|
| `pix_tool` | Callable, ma non obbligatorio; ranking da correggere |
| `rule_tool_search` | Callable; BM25 utile, pertinenza/top-k da migliorare |
| `rule_tool_check` | **Bloccato**: bypass e parser incompleti |
| `rule_tool_scaffold` | Callable; restituisce testo, non scrive |
| `rule_tool_detect` | Callable; classificazione troppo frontend-centrica |
| `rule_tool_component` | **Bloccato**: output non affidabile per framework/guardrail |
| `rule_tool_fix` | **Bloccato**: filesystem safety |
| `rule_tool_process_adr` | Parziale: side effect/concorrenza |
| `rule_tool_process_handoff` | Parziale: cwd/untracked/redaction |

La lista completa dei 76 tool isolati è nell'Appendice B.

## 11. Architettura consigliata per enforcement reale

### Fase 1 — bloccare i rischi immediati

1. Disabilitare `rule_tool_fix generate/fix` e SSE mutante fino a sandbox/auth complete.
2. Disabilitare `previousPassed` pubblico.
3. Correggere prompt MCP, build, CI, Docker e installer.
4. Rendere plugin e auto-ADR opt-in.
5. Completare o ritirare il wizard split.

### Fase 2 — gateway unico

Esporre per default solo un piccolo set core:

```text
pix_route
pix_evidence
pix_validate
rule_tool_apply (consenso esplicito)
```

`pix_route` deve effettuare internamente routing + caricamento evidenza, non limitarsi a suggerire al modello il prossimo tool. I 67 tool skill possono restare disponibili in modalità avanzata ma non tutti nel tool-choice budget iniziale.

### Fase 3 — ricevuta verificabile

`pix_validate` dovrebbe produrre:

```json
{
  "artifactSha256": "…",
  "skillVersion": "…",
  "guardrailVersion": "…",
  "allPass": true,
  "receipt": "server-signed-or-session-bound-token"
}
```

Ogni apply/write deve richiedere una receipt valida per esattamente gli stessi byte. Un host extension può inoltre impedire la risposta finale o la scrittura finché non esiste una receipt; un server MCP da solo non può intercettare il testo finale del modello.

### Fase 4 — router calibrato

- classificare prima il dominio (backend/frontend/data/devops/process), poi framework;
- usare path/framework solo dentro il dominio pertinente;
- introdurre score assoluto + soglia “unknown”;
- aggiungere alias IT/FR/ES o semantic embeddings controllati;
- deduplicare registry e separare skill ufficiali/plugin;
- misurare top-1/top-k su dataset versionato, anche per prompt negativi/ambigui.

### Fase 5 — conformance live in CI

Una suite opzionale, protetta da secret/budget, deve eseguire più run per modello/host e misurare:

- percentuale di prima chiamata `pix_tool` quando l'istruzione è presente;
- route corretta;
- caricamento della skill indicata;
- check sull'hash dell'artefatto finale;
- nessuna tool call per richieste fuori dominio;
- nessuna scrittura senza consenso.

I test deterministici devono restare il gate primario; i test live sono una metrica probabilistica, non un requisito non riproducibile per ogni PR.

## 12. Priorità di remediation

| Ordine | Azione | Gate di accettazione |
|---:|---|---|
| 1 | Sandbox `rule_tool_fix`; auth/CORS SSE | Nessuna scrittura fuori root/symlink; dry-run zero side effect; browser hostile test rosso→verde |
| 2 | Eliminare bypass `previousPassed` | Codice modificato forza tutti i check; test CSS/JSX avversariali verdi |
| 3 | Rendere embed/build riproducibili | Build con HOME vuota conserva esattamente le skill versionate |
| 4 | Riparare `prompts/get` e rimuovere completion tool fittizia | Tutte le response passano gli schema SDK ufficiali |
| 5 | Riparare CI/release/package metadata | Un solo comando locale riproduce tutti i gate; nessun `|| echo` |
| 6 | Correggere generatori/template | Ogni output framework compila e supera i guardrail indipendenti |
| 7 | Rendere installer lossless/idempotente | Matrice 23 agenti install→reinstall→uninstall senza perdita |
| 8 | Gateway/orchestrazione e receipts | Artefatto finale hash-equal a quello validato |
| 9 | Calibrare router/multilingua | Dataset top-1 concordato, unknown threshold, path non cambia dominio |
| 10 | Aggiornare docs/manifest | Conteggi/versioni/source generati automaticamente |

## 13. Conclusione di compliance per `gpt-5.6-sol`

**Compatibilità tecnica:** sì. Pi 0.80.6 espone il server e `openai-codex/gpt-5.6-sol` genera tool call valide, legge output MCP e compone risposte utili.

**Compliance workflow:** no. Il modello può e spesso preferisce saltare `pix_tool`; può chiamare direttamente skill-tool, può consegnare codice diverso da quello controllato e non esiste un gate server-side sulla risposta finale.

**Compliance MCP complessiva:** parziale. Tools e molte resources funzionano; prompt e completion sono difettosi.

**Production/release approval:** negata fino alla chiusura dei P0. Il problema non è il modello specifico: sono soprattutto contratti, trust boundary e pipeline del server. Il comando esplicito `/rule-mcp` migliora sensibilmente il comportamento del modello, ma non sostituisce enforcement verificabile.

## Appendix A — Per-skill structural and trigger audit

| Skill | Lines | MCP tool | Metadata/links | TLDR canonical query | Result |
|---|---:|---|---|---|---|
| `pix_tool` | 254 | `pix_tool` | Pass | n/a | **Pass** |
| `rule-architect` | 253 | `rule_tool_architect` | Pass | No result | **Blocked: interview asset missing** |
| `rule-architect-cli` | 82 | `rule_tool_architect_cli` | Pass | Result | **Warning: untracked/WIP** |
| `rule-architect-web` | 71 | `rule_tool_architect_web` | Pass | Result | **Blocked: untracked + UI/security defects** |
| `rule-backend` | 61 | `rule_tool_backend` | Pass | Result | **Pass** |
| `rule-backend-api-design` | 158 | `rule_tool_backend_api_design` | Pass | Result | **Pass** |
| `rule-backend-express` | 147 | `rule_tool_backend_express` | Pass | Result | **Pass** |
| `rule-backend-fastify` | 82 | `rule_tool_backend_fastify` | Pass | Result | **Pass** |
| `rule-backend-hono` | 91 | `rule_tool_backend_hono` | Pass | Result | **Pass** |
| `rule-backend-nestjs` | 94 | `rule_tool_backend_nestjs` | Pass | No result | **Warning** |
| `rule-backend-node` | 214 | `rule_tool_backend_node` | Pass | No result | **Warning** |
| `rule-backend-security` | 174 | `rule_tool_backend_security` | Pass | No result | **Warning** |
| `rule-data` | 39 | `rule_tool_data` | Pass | Result | **Pass** |
| `rule-data-duckdb` | 234 | `rule_tool_data_duckdb` | Warning: missing `See also` | Result | **Warning** |
| `rule-data-indexed-db` | 317 | `rule_tool_data_indexed_db` | Warning: missing `See also` | No result | **Warning** |
| `rule-data-mongodb` | 743 | `rule_tool_data_mongodb` | Pass | No result | **Warning** |
| `rule-data-mysql` | 595 | `rule_tool_data_mysql` | Pass | Result | **Pass** |
| `rule-data-postgresql` | 649 | `rule_tool_data_postgresql` | Pass | No result | **Warning** |
| `rule-data-sql` | 632 | `rule_tool_data_sql` | Pass | No result | **Warning** |
| `rule-data-sqlite` | 242 | `rule_tool_data_sqlite` | Warning: missing `See also` | Result | **Warning** |
| `rule-devops` | 42 | `rule_tool_devops` | Pass | Result | **Pass** |
| `rule-devops-docker` | 128 | `rule_tool_devops_docker` | Pass | No result | **Warning** |
| `rule-devops-gitlab-ci` | 75 | `rule_tool_devops_gitlab_ci` | Pass | Result | **Pass** |
| `rule-devops-testing` | 300 | `rule_tool_devops_testing` | Pass | No result | **Warning** |
| `rule-devops-version` | 161 | `rule_tool_devops_version` | Pass | No result | **Warning** |
| `rule-frontend` | 61 | `rule_tool_frontend` | Pass | Result | **Pass** |
| `rule-frontend-angular` | 504 | `rule_tool_frontend_angular` | Pass | Result | **Pass** |
| `rule-frontend-astro` | 526 | `rule_tool_frontend_astro` | Pass | Result | **Pass** |
| `rule-frontend-meta-next` | 201 | `rule_tool_frontend_meta_next` | Pass | Result | **Pass** |
| `rule-frontend-meta-nuxt` | 181 | `rule_tool_frontend_meta_nuxt` | Pass | Result | **Pass** |
| `rule-frontend-meta-remix` | 224 | `rule_tool_frontend_meta_remix` | Pass | Result | **Pass** |
| `rule-frontend-react` | 688 | `rule_tool_frontend_react` | Pass | No result | **Warning** |
| `rule-frontend-solidjs` | 532 | `rule_tool_frontend_solidjs` | Pass | Result | **Pass** |
| `rule-frontend-svelte` | 508 | `rule_tool_frontend_svelte` | Pass | Result | **Pass** |
| `rule-frontend-vanilla-reactive` | 640 | `rule_tool_frontend_vanilla_reactive` | Pass | No result | **Warning** |
| `rule-frontend-vue` | 522 | `rule_tool_frontend_vue` | Pass | No result | **Warning** |
| `rule-platform` | 43 | `rule_tool_platform` | Pass | Result | **Pass** |
| `rule-platform-agent` | 294 | `rule_tool_platform_agent` | Pass | No result | **Warning** |
| `rule-platform-desktop` | 542 | `rule_tool_platform_desktop` | Pass | Result | **Pass** |
| `rule-platform-expo` | 254 | `rule_tool_platform_expo` | Pass | Result | **Pass** |
| `rule-platform-library` | 259 | `rule_tool_platform_library` | Pass | Result | **Pass** |
| `rule-platform-web` | 241 | `rule_tool_platform_web` | Pass | No result | **Warning** |
| `rule-process` | 43 | `pix_process` | Pass | Result | **Pass** |
| `rule-process-adr` | 96 | `rule_tool_process_adr` | Pass | n/a | **Pass** |
| `rule-process-bmad` | 422 | `rule_tool_process_bmad` | Pass | Result | **Pass** |
| `rule-process-documentation` | 201 | `rule_tool_process_documentation` | Pass | No result | **Warning** |
| `rule-process-feature-workflow` | 121 | `rule_tool_process_feature_workflow` | Pass | Result | **Pass** |
| `rule-process-handoff` | 97 | `rule_tool_process_handoff` | Pass | n/a | **Pass** |
| `rule-styleguide` | 58 | `rule_tool_styleguide` | Pass | Result | **Pass** |
| `rule-styleguide-a11y` | 514 | `rule_tool_styleguide_a11y` | Pass | No result | **Warning** |
| `rule-styleguide-css` | 488 | `rule_tool_styleguide_css` | Pass | No result | **Warning** |
| `rule-styleguide-html` | 339 | `rule_tool_styleguide_html` | Pass | No result | **Warning** |
| `rule-styleguide-javascript` | 553 | `rule_tool_styleguide_javascript` | Pass | No result | **Warning** |
| `rule-styleguide-json` | 132 | `rule_tool_styleguide_json` | Pass | No result | **Warning** |
| `rule-styleguide-markdown` | 132 | `rule_tool_styleguide_markdown` | Pass | Result | **Pass** |
| `rule-styleguide-naming` | 228 | `rule_tool_styleguide_naming` | Pass | No result | **Warning** |
| `rule-styleguide-patterns` | 183 | `rule_tool_styleguide_patterns` | Pass | No result | **Warning** |
| `rule-styleguide-validation` | 472 | `rule_tool_styleguide_validation` | Pass | No result | **Warning** |
| `rule-toolchain` | 69 | `rule_tool_toolchain` | Pass | Result | **Pass** |
| `rule-toolchain-biome` | 101 | `rule_tool_toolchain_biome` | Pass | No result | **Warning** |
| `rule-toolchain-eslint` | 81 | `rule_tool_toolchain_eslint` | Pass | Result | **Pass** |
| `rule-toolchain-husky` | 116 | `rule_tool_toolchain_husky` | Pass | Result | **Pass** |
| `rule-toolchain-parcel` | 120 | `rule_tool_toolchain_parcel` | Pass | Result | **Pass** |
| `rule-toolchain-pnpm` | 114 | `rule_tool_toolchain_pnpm` | Pass | No result | **Warning** |
| `rule-toolchain-project` | 217 | `rule_tool_toolchain_project` | Pass | No result | **Warning** |
| `rule-toolchain-turborepo` | 108 | `rule_tool_toolchain_turborepo` | Pass | Result | **Pass** |
| `rule-toolchain-typescript` | 132 | `rule_tool_toolchain_typescript` | Pass | Result | **Pass** |
| `rule-toolchain-vite` | 93 | `rule_tool_toolchain_vite` | Pass | No result | **Warning** |
| `rule-ui` | 79 | `rule_tool_ui` | Pass | Result | **Pass** |
| `rule-ui-design-system` | 214 | `rule_tool_ui_design_system` | Pass | No result | **Warning** |

Notes: all 70 names are Agent Skills-compatible (valid lowercase/hyphen names, unique, name matches directory, descriptions below 1,024 characters); all relative Markdown links resolve. “Pass” is structural/runtime, not independent factual certification of every framework/database statement.

## Appendix B — Packaged MCP tool inventory

Isolated package state: **76 tools**. Live workstation state: **87 tools** because 11 unrelated global Agent Skills are auto-imported as plugins.

| Tool | Kind | Exercised | Finding |
|---|---|---|---|
| `pix_tool` | Router | 60 curated + 69 self-description + live model | Partial: not mandatory; routing defects |
| `rule_tool_architect` | Skill | 6 modes | Blocked: interview missing |
| `rule_tool_architect_cli` | Skill | 6 modes | Modes callable |
| `rule_tool_architect_web` | Skill | 6 modes | Modes callable |
| `rule_tool_backend` | Skill | 6 modes | Modes callable |
| `rule_tool_backend_api_design` | Skill | 6 modes | Modes callable |
| `rule_tool_backend_express` | Skill | 6 modes | Modes callable |
| `rule_tool_backend_fastify` | Skill | 6 modes | Modes callable |
| `rule_tool_backend_hono` | Skill | 6 modes | Modes callable |
| `rule_tool_backend_nestjs` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_backend_node` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_backend_security` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_data` | Skill | 6 modes | Modes callable |
| `rule_tool_data_duckdb` | Skill | 6 modes | Modes callable |
| `rule_tool_data_indexed_db` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_data_mongodb` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_data_mysql` | Skill | 6 modes | Modes callable |
| `rule_tool_data_postgresql` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_data_sql` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_data_sqlite` | Skill | 6 modes | Modes callable |
| `rule_tool_devops` | Skill | 6 modes | Modes callable |
| `rule_tool_devops_docker` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_devops_gitlab_ci` | Skill | 6 modes | Modes callable |
| `rule_tool_devops_testing` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_devops_version` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_frontend` | Skill | 6 modes | Modes callable |
| `rule_tool_frontend_angular` | Skill | 6 modes | Modes callable |
| `rule_tool_frontend_astro` | Skill | 6 modes | Modes callable |
| `rule_tool_frontend_meta_next` | Skill | 6 modes | Modes callable |
| `rule_tool_frontend_meta_nuxt` | Skill | 6 modes | Modes callable |
| `rule_tool_frontend_meta_remix` | Skill | 6 modes | Modes callable |
| `rule_tool_frontend_react` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_frontend_solidjs` | Skill | 6 modes | Modes callable |
| `rule_tool_frontend_svelte` | Skill | 6 modes | Modes callable |
| `rule_tool_frontend_vanilla_reactive` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_frontend_vue` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_platform` | Skill | 6 modes | Modes callable |
| `rule_tool_platform_agent` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_platform_desktop` | Skill | 6 modes | Modes callable |
| `rule_tool_platform_expo` | Skill | 6 modes | Modes callable |
| `rule_tool_platform_library` | Skill | 6 modes | Modes callable |
| `rule_tool_platform_web` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `pix_process` | Skill | 6 modes | Modes callable |
| `rule_tool_process_bmad` | Skill | 6 modes | Modes callable |
| `rule_tool_process_documentation` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_process_feature_workflow` | Skill | 6 modes | Modes callable |
| `rule_tool_styleguide` | Skill | 6 modes | Modes callable |
| `rule_tool_styleguide_a11y` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_styleguide_css` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_styleguide_html` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_styleguide_javascript` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_styleguide_json` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_styleguide_markdown` | Skill | 6 modes | Modes callable |
| `rule_tool_styleguide_naming` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_styleguide_patterns` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_styleguide_validation` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_toolchain` | Skill | 6 modes | Modes callable |
| `rule_tool_toolchain_biome` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_toolchain_eslint` | Skill | 6 modes | Modes callable |
| `rule_tool_toolchain_husky` | Skill | 6 modes | Modes callable |
| `rule_tool_toolchain_parcel` | Skill | 6 modes | Modes callable |
| `rule_tool_toolchain_pnpm` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_toolchain_project` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_toolchain_turborepo` | Skill | 6 modes | Modes callable |
| `rule_tool_toolchain_typescript` | Skill | 6 modes | Modes callable |
| `rule_tool_toolchain_vite` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_ui` | Skill | 6 modes | Modes callable |
| `rule_tool_ui_design_system` | Skill | 6 modes | Partial: TLDR canonical query empty |
| `rule_tool_search` | Deterministic | Integration/adversarial | Pass; relevance needs tuning |
| `rule_tool_check` | Deterministic | Integration/adversarial | Blocked: trusted previousPassed bypass |
| `rule_tool_scaffold` | Deterministic | Integration/adversarial | Pass (returns text only) |
| `rule_tool_detect` | Deterministic | Integration/adversarial | Partial: frontend-only classification |
| `rule_tool_process_adr` | Deterministic | Integration/adversarial | Partial: races/auto-log pollution |
| `rule_tool_fix` | Deterministic | Integration/adversarial | Blocked: dry-run/path escape |
| `rule_tool_process_handoff` | Deterministic | Integration/adversarial | Partial: project-name/diff gaps |
| `rule_tool_component` | Deterministic | Integration/adversarial | Blocked: invalid/non-compliant outputs |

## Appendix C — Executable source inventory

| File | Lines | Static parse | Review note |
|---|---:|---|---|
| `bin/rule-mcp.js` | 16 | Pass | Parsed; no blocker isolated by automated scan |
| `scripts/embed-skills.mjs` | 67 | Pass | Destructive/non-reproducible skill embedding |
| `scripts/install-skills.sh` | 29 | Pass | Parsed; no blocker isolated by automated scan |
| `scripts/install.ps1` | 526 | Not run | Not parsed: PowerShell unavailable |
| `scripts/install.sh` | 785 | Pass | Parsed; no blocker isolated by automated scan |
| `scripts/package.sh` | 90 | Pass | Overwrites installers; masks pack failure |
| `scripts/post-process.mjs` | 159 | Pass | Parsed; no blocker isolated by automated scan |
| `scripts/setup.sh` | 51 | Pass | Parsed; no blocker isolated by automated scan |
| `scripts/uninstall.ps1` | 499 | Not run | Not parsed: PowerShell unavailable |
| `scripts/uninstall.sh` | 696 | Pass | Parsed; no blocker isolated by automated scan |
| `src/cli/commands.js` | 504 | Pass | Parsed; no blocker isolated by automated scan |
| `src/cli/completions.js` | 250 | Pass | Parsed; no blocker isolated by automated scan |
| `src/cli/daemon.js` | 813 | Pass | Parsed; no blocker isolated by automated scan |
| `src/cli/doctor.js` | 383 | Pass | Health result misses prompt/build/release failures |
| `src/cli/install.js` | 692 | Pass | Malformed-config data loss; uninstall path mismatches |
| `src/cli/paths.js` | 59 | Pass | Parsed; no blocker isolated by automated scan |
| `src/cli/skills-install.js` | 261 | Pass | Non-TTY crash; recursive copy path defect |
| `src/cli/tui.js` | 163 | Pass | Parsed; no blocker isolated by automated scan |
| `src/cli/uninstall.js` | 36 | Pass | Parsed; no blocker isolated by automated scan |
| `src/core/bm25.js` | 292 | Pass | Parsed; no blocker isolated by automated scan |
| `src/core/detector.js` | 156 | Pass | Parsed; no blocker isolated by automated scan |
| `src/core/enforcement.js` | 135 | Pass | Parsed; no blocker isolated by automated scan |
| `src/core/file-tree.js` | 599 | Pass | Framework fallback, invalid custom-element tag, naming drift |
| `src/core/guardrail-defs.js` | 684 | Pass | Regex blind spots; CSS/inline-style false passes |
| `src/core/guardrails.js` | 165 | Pass | `previousPassed` bypass |
| `src/core/skills.js` | 306 | Pass | Parsed; no blocker isolated by automated scan |
| `src/core/template-data.js` | 226 | Pass | Accessibility/semantic/template defects |
| `src/core/templates.js` | 164 | Pass | Framework fallback and non-compliant generation |
| `src/index.js` | 428 | Pass | Parsed; no blocker isolated by automated scan |
| `src/prompts/index.js` | 182 | Pass | Invalid MCP prompt role `system` |
| `src/resources/index.js` | 179 | Pass | Plugin resources advertised but unreadable; duplicate/path leak |
| `src/server.js` | 188 | Pass | Invalid prompts/get and completion implementation |
| `src/tools/adr.js` | 329 | Pass | Auto-log side effects and concurrency risk |
| `src/tools/ai.js` | 269 | Pass | Router scoring, confidence, path-bias defects |
| `src/tools/architect.js` | 112 | Pass | Parsed; no blocker isolated by automated scan |
| `src/tools/fix.js` | 197 | Pass | Dry-run ignored in generate; path escape/overwrite |
| `src/tools/handoff.js` | 508 | Pass | Project-name precedence and incomplete working tree |
| `src/tools/router.js` | 256 | Pass | Registry/enforcement; force reload duplicates; plugin trust boundary |
| `src/tools/skill.js` | 318 | Pass | TLDR top-5-before-filter defect |
| `src/transport/cert.js` | 113 | Pass | Parsed; no blocker isolated by automated scan |
| `src/transport/sse.js` | 233 | Pass | Unauthenticated wildcard-CORS loopback service |
| `src/utils/sandbox.js` | 145 | Pass | Timeout does not cancel work; errors swallowed |
| `test/add-once.test.mjs` | 51 | Pass | Playwright test incorrectly run with Node by test:all |
| `test/agent-commands-install.test.mjs` | 51 | Pass | Parsed; no blocker isolated by automated scan |
| `test/ai.test.mjs` | 80 | Pass | Parsed; no blocker isolated by automated scan |
| `test/architect-ui.test.mjs` | 114 | Pass | Hard-coded shared port; stale wizard expectations |
| `test/cli-tui.test.mjs` | 55 | Pass | Parsed; no blocker isolated by automated scan |
| `test/console-test.mjs` | 42 | Pass | Parsed; no blocker isolated by automated scan |
| `test/daemon-wrapper.test.mjs` | 25 | Pass | Parsed; no blocker isolated by automated scan |
| `test/daemon.test.mjs` | 97 | Pass | Environment-dependent native service assumptions |
| `test/detector.test.mjs` | 105 | Pass | Parsed; no blocker isolated by automated scan |
| `test/docs-architect.test.mjs` | 138 | Pass | Runtime fail: deleted architect assets |
| `test/doctor-ui.test.mjs` | 78 | Pass | Parsed; no blocker isolated by automated scan |
| `test/enforcement.test.mjs` | 100 | Pass | Does not test previousPassed or guardrail false negatives |
| `test/fixtures/plugins/my-custom-rules/plugin.js` | 44 | Pass | Parsed; no blocker isolated by automated scan |
| `test/framework-routing.test.mjs` | 83 | Pass | Parsed; no blocker isolated by automated scan |
| `test/https.test.mjs` | 108 | Pass | Parsed; no blocker isolated by automated scan |
| `test/pi-install.test.mjs` | 33 | Pass | Parsed; no blocker isolated by automated scan |
| `test/repository-contract.test.mjs` | 92 | Pass | Parsed; no blocker isolated by automated scan |
| `test/sandbox.test.mjs` | 92 | Pass | Parsed; no blocker isolated by automated scan |
| `test/skills-docs.test.mjs` | 100 | Pass | Runtime fail: missing `See also` in new data skills |
| `test/smoke.mjs` | 111 | Pass | Parsed; no blocker isolated by automated scan |
| `test/sse.test.mjs` | 120 | Pass | Parsed; no blocker isolated by automated scan |

## Appendix D — Artefatti e riproducibilità

Gli artefatti grezzi dell'audit sono temporanei e non vengono inclusi nel package:

- `/tmp/rule-mcp-static-audit.json` — inventario, metadati, template e guardrail;
- `/tmp/rule-skill-mode-matrix.json` — 402 chiamate per modalità;
- `/tmp/rule-audit-gpt56sol-a.jsonl` … `h.jsonl` — trace chat modello/tool;
- `/tmp/rule-audit-tests.log` — batch test file-per-file;
- `/tmp/rule-audit-eslint.log` e `/tmp/rule-audit-prettier.log`;
- `/tmp/rule-audit-pnpm-run-ci.log`, `/tmp/rule-audit-pack.log` e log delle prove isolate.

Comandi chiave, da eseguire con auto-ADR disabilitato e preferibilmente in un clone temporaneo:

```bash
# Suite package effettiva (non usare `pnpm ci`, che in pnpm 11 installa)
RULE_MCP_DISABLE_AUTO_ADR=1 pnpm run ci

# Smoke e audit dipendenze
RULE_MCP_DISABLE_AUTO_ADR=1 pnpm test
pnpm audit --prod

# Inventario tool isolato dalla home utente
HOME=/tmp/rule-clean-home RULE_MCP_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node --input-type=module -e \
  'import {loadAllSkills} from "./src/core/skills.js"; import {listTools} from "./src/tools/router.js"; await loadAllSkills(); console.log(listTools().length)'

# Verifica sintattica JavaScript
find src bin scripts test skills -type f \( -name "*.js" -o -name "*.mjs" \) \
  -print0 | xargs -0 -n1 node --check
```

Le prove `build`, `rule_tool_fix`, installer e ADR devono restare in directory temporanee finché i finding P0 non sono corretti.
