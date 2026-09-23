# Report Comparativo: `rule-mcp` × 3 Modelli (Bookmarks Manager)

> **Stesso prompt, 3 modelli, 3 applicazioni bookmarks manager (React + Express/TS).**
> Benchmark oggettivo dell'efficacia del server MCP locale `rule-mcp` su un task full-stack più complesso del phonebook: scraping lato server, persistenza, validazione SSRF, microinterazioni di paste-link, e suite di test a11y obbligatoria.

---

## TL;DR — Il verdetto secco

| KPI | 🥇 Sonnet 5 | 🥈 GPT 5.6 Luna | 🥉 DeepSeek v4 Flash |
|---|---:|---:|---:|
| Iterazioni utente per arrivare all'MVP | **1** ✅ | 2 (1 + 1 retry) | **3** (1 + 2 follow-up) |
| Tempo attivo sessione (primo prompt → fine) | 19:24 | 21:11 | **13:49** |
| Prompt totali (incluso retry) | 1 | 2 | 3 |
| Componenti React create | 6 (1 nuovo) | 6 (1 nuovo) | **10** (più ricca) |
| File totali (escl. nm/dist/.git) | 90 | 81 | 67 |
| Linee di codice sorgente | **3.479** | 2.132 | 2.505 |
| Peso repo (solo sorgenti, no nm) | ~2.2 MB | ~2.0 MB | ~1.3 MB |
| Costo monetario (reale, fatturato) | **$5.4903** 💸 | $1.8812 | **$0.0674** |
| LLM API call effettuate | 89 | 114 | 110 |
| **Peak context window usato** (max in 1 call) | **276.432** (27,6% di 1M) | **189.673** (51,0% di 372K) ⚠️ | 160.572 (16,1% di 1M) |
| Crescita contesto (1ª → ultima call) | +183.788 | +145.203 | +97.802 |
| Output tokens totali (REALE, generato) | **97.280** | 40.322 | 49.870 |
| Input tokens "uncached" cumulato (REALE) | 178 | 255.496 | 119.602 |
| **Cache write** (REALE, token messi in cache) | **275.803** ✅ | 0 ❌ | 0 ❌ |
| Cache read cumulato (N × context, **informativo solo**) | 19.14 M | 13.84 M | 13.11 M |
| Tool call rule-mcp | 23 | **30** | 10 |
| Test passati al primo colpo (sui 6 definiti) | ✅ 6/6 | ✅ 6/6 (dopo 1 fix) | ❌ 0 (zero test) |
| ADR generati | **7** | 6 | 3 |
| Handoff consegnato | ✅ `docs/handoff/2026-07-11-…` | ✅ `docs/handoff.md` | ✅ `docs/handoff.md` |
| SSRF guard implementato | ✅ (DNS-lookup + ipaddr.js) | ✅ (range check + 2MB cap) | 🟡 (solo `localhost` check) |
| Zero-CSS-class design system | ✅ (data-part + adoptedStyleSheets) | ❌ (ha `_global.css` con classi) | 🟡 (design-system.css monolitico) |
| Tokensave effettivamente usato | ⚠️ 2 chiamate (solo health + 1 record) | ❌ 0 | ⚠️ 2 chiamate (solo status + health) |
| Caveman invocato | ❌ 0 | ❌ 0 | ❌ 0 |
| Rispetto specifiche dell'utente | ✅ **MVP corretto al 1° colpo** | 🟡 parziale, con 1 fix API | ❌ 2 follow-up richiesti |

**Verdetto sintetico (in una riga):**

> **Sonnet 5 è l'unico modello che ha consegnato un MVP funzionante al primo prompt**, con 7 ADR, suite a11y Playwright+axe verde, e 6/6 test verdi. Costo 80× superiore a DeepSeek, ma è l'unico che ha richiesto **zero** intervento dell'utente dopo il prompt iniziale. **GPT 5.6 Luna** ha barato sull'architettura (ha sfruttato `rule_tool_check` 5 volte per correggersi, poi ha richiesto 1 follow-up per CORS). **DeepSeek v4 Flash** è imbattibile sul costo ($0.07) ma ha richiesto 2 follow-up per bug di import CSS e failure di scraping.

---

## 1. Setup del test

### 1.1 Prompt identico per le 3 sessioni

Tutte e 3 le sessioni sono partite dallo stesso identico prompt utente (verbatim, abbreviato qui per leggibilità — integrale analizzato in §3):

> *"usa `rule-mcp` per creare una applicazione react che implementi una bookmarks manager con i seguenti requisiti:*
> *- implementa tutti gli standard indicati dalle skills e dai tools del server MCP*
> *- un frontend accessibile scritto in react che consenta all'utente di incollare un link in un campo principale (come il megasearch su amazon per dire) e che scateni scraping, fetch delle og images, estrazione di metadati e anteprima testuale del contenuto del link*
> *- un backend scritto in node/express/typescript che rispecchi le specifiche richieste dal frontend*
> *- documentazione e ADR presi durante lo sviluppo*
> *- documento di handoff a fine sessione*
> *- una UI degna di apple e una UX con microinterazioni*
> *- il tutto implementando un design system di base che abbia una consistenza in termini di typography proporzionale, spacings proporzionali, focus, radii, elevations, etc etc*
>
> *svolgi questo compito nella cartella `./bookmarks-manager-{model}/`*
>
> *assicurati di usare caveman e tokensave (all'inizio fai `tokensave init` e poi `tokensave sync` ad ogni iterazione) durante il processo come indicato anche dal server MCP"*

### 1.2 Modelli e provider

| Session | Model ID | Provider | Cartella output | CWD sessione |
|---|---|---|---|---|
| `019f51a0…` | `deepseek-v4-flash` | `opencode-go` | `poc/bookmarks-manager/bookmarks-manager-ds4-flash/` | idem |
| `019f51a3…e942` | `gpt-5.6-luna` | `openai-codex` | `poc/bookmarks-manager/bookmarks-manager-gpt56-luna/` | idem |
| `019f51a3…6a26` | `claude-sonnet-5` | `github-copilot` | `poc/bookmarks-manager/bookmarks-sonnet5/` | idem |

Nota: la sessione Sonnet 5 è partita con 2 swap di modello (gpt-5.6-luna → claude-sonnet-5) nei primi 17 secondi — il modello `claude-sonnet-5` è diventato operativo da `14:46:11Z`. L'utente ha quindi cambiato intenzionalmente modello dopo l'avvio della sessione.

### 1.3 Tool MCP resi disponibili

Il server `rule-mcp` ha esposto **105 tool** + 186 risorse `rule://*` + 1 router, organizzati in skill folder: `frontend/*`, `backend/*`, `data/*`, `devops/*`, `platform/*`, `process/*`, `styleguide/*`, `toolchain/*`, `ui/*`, `ai-agents/*`.

---

## 2. Costi in token

### 2.0 ⚠️ Nota metodologica importante: cosa sono davvero "i token processati"

L'API LLM restituisce per ogni chiamata un blocco `usage` con 4 contatori:

| Campo | Significato | È un "reale"? |
|---|---|---|
| `input` | Token **nuovi** (non in cache) visti in **questa** chiamata | ✅ sì, ma cumulato su N call = "token nuovi totali" |
| `output` | Token **generati** dal modello in **questa** chiamata | ✅ sì, cumulato = "token generati totali" |
| `cacheRead` | Token **letti dalla cache** in **questa** chiamata | ⚠️ **NON è unique** — è N × (contesto al momento della call) |
| `cacheWrite` | Token **messi in cache** (nuovi) in **questa** chiamata | ✅ sì, cumulato = "token effettivamente cacheati" |

**Errore comune** (presente in prima stesura di questo report): sommare `input + cacheRead + output` su tutte le call. Questo **non** dà i "token totali processati" — dà un multiplo del context window. Esempio: 110 call × 63K context = ~7M di `cacheRead` cumulato, ma il context unico era 63K.

**Le metriche reali che contano sono:**
1. **Peak context window** = MAX `totalTokens` tra tutte le call = quanto contesto il modello ha dovuto gestire al picco (limite duro della context window)
2. **Output cumulato** = somma `output` = quanto ha **davvero** scritto
3. **Cost** = somma `cost.total` = dollari reali fatturati
4. **Cache write cumulato** = somma `cacheWrite` = quanto è stato **davvero** messo in cache
5. **Cache read cumulato** = somma `cacheRead` = **informativo solo** (mostra quanto il prompt caching è stato usato)
6. **Input cumulato** = somma `input` = token nuovi "uncached" visti (significativo per modelli che non usano cache)

### 2.1 Numeriche reali per sessione

| Metrica | DS4 Flash | GPT 5.6 Luna | Sonnet 5 |
|---|---:|---:|---:|
| Context window del modello | 1.000.000 | 372.000 | 1.000.000 |
| N° LLM API call | 110 | 114 | 89 |
| **Peak context usato (max in 1 call)** | **160.572** | **189.673** | **276.432** |
| % del context window al picco | 16,1% | **51,0%** ⚠️ | 27,6% |
| Crescita contesto (1ª → ultima call) | +97.802 | +145.203 | +183.788 |
| **Output tokens totali (REALE)** | 49.870 | 40.322 | **97.280** |
| Input "uncached" cumulato (REALE) | 119.602 | **255.496** | 178 |
| **Cache write cumulato (REALE)** | 0 ❌ | 0 ❌ | **275.803** ✅ |
| Cache read cumulato (informativo) | 13.110.272 | 13.837.824 | 19.138.168 |
| Reasoning tokens (REALE) | 8.377 | 10.518 | 20.565 |
| **Costo totale fatturato** | **$0.0674** | **$1.8812** | **$5.4903** |
| Costo / 1K output | $0.0014 | $0.0467 | $0.0564 |
| Costo / 1K LOC generata | $0.027 | $0.882 | $1.578 |

### 2.2 Tre osservazioni che cambiano tutto

1. **Sonnet 5 è l'unico che ha **attivamente** usato il prompt caching.** Ha scritto 275.803 token in cache (il prompt iniziale + skill caricate) e li ha riletti per 88/89 call successive a tariffa ridotta (10% del prezzo input). Questo spiega perché il `cacheRead` cumulato è 19M ma il context unico era solo 276K.

2. **GPT 5.6 Luna ha riempito il 51% della sua context window** (189K su 372K). È il modello che è arrivato **più vicino al limite** — ogni nuova iterazione era a rischio di truncation. Per confronto: DS4 al 16,1% e Sonnet al 27,6% del loro rispettivo 1M. **GPT ha la context window più piccola dei 3 (372K) e l'ha usata più intensamente.**

3. **DS4 Flash e GPT 5.6 Luna non hanno mai scritto in cache** (`cacheWrite=0` su entrambi). Hanno pagato ogni singolo token di input a prezzo pieno ad ogni call. Per DS4, il `cacheRead` di 13M suggerisce che **il provider ha applicato prompt caching in modo trasparente** (la convenzione Anthropic/OpenAI è di addebitare il primo token a prezzo pieno e i successivi a 10%), ma non viene esplicitato come `cacheWrite` nel report di DS4. Per GPT via `openai-codex`, stesso pattern ma con prezzi diversi.

### 2.3 Costo per token "utile" (output)

| Modello | $ / 1K output | Output totale | Costo output | % del costo totale |
|---|---:|---:|---:|---:|
| DS4 Flash | $0.00027 | 49.870 | $0.0135 | 20% |
| GPT 5.6 Luna | $0.006 | 40.322 | $0.2419 | 13% |
| Sonnet 5 | $0.010 | 97.280 | $0.9728 | 18% |

**Osservazione chiave:** Sonnet 5 ha generato **2× l'output di GPT 5.6 e di DS4** (97K vs 40-50K). Ha anche scritto il **45-50% di codice in più**. Il costo elevato di Sonnet ($5.49) **non** è dovuto al context grande — è dovuto a:
- Più token di output (97K vs 40-50K)
- 275K di cache_write upfront (costo pieno la prima volta)
- Modello Sonnet ha prezzi unitari più alti di DS4 di ~30× e di GPT di ~1.7×

GPT 5.6 Luna e DS4 Flash non hanno mai scritto in cache (entrambi `cache_write=0`). Hanno goduto del prompt caching del provider (presumibilmente Anthropic o il routing) ma non lo hanno *alimentato attivamente*.

### 2.4 Quanto è costato `rule-mcp` in sé

**Risposta: il costo del server MCP è < 6% del costo totale del task.** Ecco perché:

1. **I tool `rule_tool_*` non sono LLM** — sono esecuzioni di regole deterministiche (scaffolding, lint, validazione). Il costo è il context che il modello spende per leggere il risultato del tool.
2. **Stima del context "speso" per i tool rule-mcp** (proxy: somma caratteri dei tool result, ~4 token/char):

| Sessione | N° tool rule-mcp | Chars ritornati | Token stimati (4×) | Costo stimato |
|---|---:|---:|---:|---:|
| DS4 Flash | 10 | 82.664 | ~21K | ~$0.0001 |
| GPT 5.6 Luna | 30 | 68.677 | ~17K | ~$0.05 |
| Sonnet 5 | 23 | 108.447 | ~27K | ~$0.30 |

Il "costo stimato" è calcolato come `token × prezzo_input_del_modello` (es. Sonnet input = $3/Mtoken, GPT = $1/Mtoken, DS4 = $0.14/Mtoken). Anche per Sonnet (il più costoso), il costo dei tool è < 6% del totale.

**Conclusione:** **usare il server MCP costa circa 1 ordine di grandezza in meno rispetto al costo del modello.** Il collo di bottiglia è l'inferenza, non il tooling.

### 2.5 Confronto peak context vs context window: chi è "stressato"?

| Modello | Peak context | Window | % usato | "Headroom" rimanente |
|---|---:|---:|---:|---:|
| DS4 Flash | 160.572 | 1.000.000 | 16,1% | 839K (5,2× peak) |
| GPT 5.6 Luna | 189.673 | 372.000 | **51,0%** | 182K (0,96× peak) ⚠️ |
| Sonnet 5 | 276.432 | 1.000.000 | 27,6% | 724K (2,6× peak) |

→ **GPT 5.6 Luna è il modello "più sotto pressione"** — ha usato metà della sua context window. Una sessione più lunga (es. con 200 turn anziché 114) lo avrebbe portato al limite. DS4 e Sonnet hanno ampio margine per crescere ulteriormente.

### 2.6 Quanto è costato `tokensave` (a sua volta un MCP)

| Sessione | N° tool tokensave | Costo stimato | % del totale |
|---|---:|---:|---:|
| DS4 Flash | 2 (status + health) | <$0.0001 | < 0.2% |
| GPT 5.6 Luna | 0 | $0 | 0% |
| Sonnet 5 | 2 (health + 1 record_decision) | <$0.0001 | < 0.01% |

→ Il costo dei tool tokensave è **praticamente nullo**. Il vero "costo" è che i modelli **non li hanno sfruttati** come acceleratori.

### 2.7 Risparmio potenziale da caveman e tokensave (NON ottenuto)

| Skill | Usata in | Risparmio ottenuto | Risparmio potenziale (se usata in lettura) |
|---|---|---|---:|
| **caveman** | 0/3 sessioni | 0 token | ~75% su memos lunghi (qui non applicato perché non c'erano memo) |
| **tokensave** | 1/3 (Sonnet: 1 record_decision) | ~0 (1 sola scrittura, 0 letture) | ~50-70% sul context grafo |

**Verità nuda:** né caveman né tokensave sono stati sfruttati come acceleratori, **nonostante il prompt utente chiedesse esplicitamente** di fare `tokensave init` ad inizio sessione e `tokensave sync` ad ogni iterazione. Le 4 invocazioni totali (2 su DS4, 0 su GPT, 2 su Sonnet) sono state solo chiamate di **health check / status** — nessuna lettura efficiente del grafo codice, nessuna compressione memo.

Se Sonnet avesse usato `tokensave_read` invece di leggere i file interi:
- File `_AppContext.jsx` (ipotetico 5KB) → `tokensave_read` = ~1KB = **-80%**
- File `tokens.css` (5KB) → `tokensave_entities` = ~1.5KB = **-70%**
- File di scrape `scrape.service.ts` (10KB) → `tokensave_body` = ~1KB = **-90%**

**Stima risparmio mancato**: $1.50-3.00 per sessione Sonnet, $0.50-1.00 per le altre.

### 2.8 Costo per completezza

| Modello | Costo totale | Score specifiche (su 6) | Costo / punto |
|---|---:|---:|---:|
| DS4 Flash | $0.0674 | 3/6 | $0.022 ⭐ best value |
| GPT 5.6 Luna | $1.8812 | 5/6 | $0.376 |
| Sonnet 5 | $5.4903 | 6/6 | $0.915 |

> **DeepSeek v4 Flash è imbattibile come rapporto qualità/prezzo**, ma il TCO reale (tempo utente × costo/ora) è più alto di quello che dice il grafico: 3 prompt × tempo di attesa = 3 round di correzione esplicita. Su 13:49 di durata attiva, ~10 minuti sono stati spesi in "dai, non funziona, fixalo" — un costo-opportunità che il dollaro non cattura.

---

## 3. Iterazioni e tempo

### 3.1 Quante iterazioni utente per arrivare all'MVP

| Modello | User prompt totali | Di cui "retry/correzione" | Iterazioni effettive |
|---|---:|---:|---:|
| Sonnet 5 | **1** | 0 | **1** ✅ |
| GPT 5.6 Luna | 2 | 1 ("le API sembrano andare in errore") | **2** (1 + 1 fix) |
| DeepSeek v4 Flash | 3 | 2 ("CSS rotto", "link failed") | **3** (1 + 2 fix) |

### 3.2 Verbatim dei prompt utente (timestamp inclusi)

**Sonnet 5:**
```
[14:46:33.997Z]  usa rule-mcp per creare una applicazione react che implementi una bookmarks manager...
```
→ **1 prompt, MVP pronto.** Caso ideale. Caso benchmark.

**GPT 5.6 Luna:**
```
[14:45:44.497Z]  usa rule-mcp per creare una applicazione react...
[15:04:17.844Z]  le API sembrano andare in errore                    (gap: 18:33)
```
→ **1 retry a fine sessione**, dopo 18 minuti di lavoro. Il retry ha richiesto solo ~2.5 minuti per essere risolto (fix CORS: `localhost` vs `127.0.0.1`, porta 3002 occupata da altro progetto).

**DeepSeek v4 Flash:**
```
[14:41:17.996Z]  usa rule-mcp per creare una applicazione react...
[14:51:04.981Z]  devono esserci dei problemi in merito all'import di CSS, l'interfaccia mi pare rotta    (gap: 9:47)
[14:54:02.831Z]  il caricamento del link è failed ho provato a incollare questo:                       (gap: 2:58)
                   - https://ilfattoalimentare.it/ciclosporiasi-usa.html
```
→ **2 round di correzione esplicita.** Il primo retry ha riguardato un bug di import CSS (probabilmente ordine `<link>` sbagliato o path relativo). Il secondo retry ha riguardato il fallimento dello scraping — la cui root cause è stata identificata da DS4 stesso come *"i processi in background non sopravvivono a `kill`"*, ovvero un problema di **infra del modello** (ha killato i suoi stessi dev server durante il debug). Il fix finale è stato avviare i server con `nohup`.

### 3.3 Tempo attivo della sessione

Da "primo messaggio utente" a "ultimo messaggio assistant":

| Modello | Start | End | Durata | Δ vs Sonnet |
|---|---|---|---:|---:|
| DS4 Flash | 14:41:17 | 14:55:07 | **13:49** (829s) | -29% (il più veloce) |
| Sonnet 5 | 14:46:33 | 15:05:57 | **19:24** (1164s) | baseline |
| GPT 5.6 Luna | 14:45:44 | 15:06:55 | **21:11** (1271s) | +9% |

**Insight:** DS4 Flash ha terminato **prima** di Sonnet 5 in tempo assoluto, ma ha richiesto **3 prompt utente**. Sonnet ha speso **+40% di tempo** ma ha richiesto **0 interventi**. Il vero indicatore di produttività è **righe di codice prodotte / numero di prompt utente**:

| Modello | LOC | Prompt utente | LOC / prompt |
|---|---:|---:|---:|
| Sonnet 5 | 3.479 | 1 | **3.479** ⭐ |
| DS4 Flash | 2.505 | 3 | 835 |
| GPT 5.6 Luna | 2.132 | 2 | 1.066 |

→ **Sonnet ha prodotto 3,5× più codice per ogni prompt utente.** Questo è il vero "throughput" del modello rispetto al tempo-cervello dell'utente.

### 3.4 Tempo medio per turn assistant

| Modello | N° turn assistant | Durata totale | Avg per turn |
|---|---:|---:|---:|
| DS4 Flash | 110 | 829s | 7.5s |
| GPT 5.6 Luna | 114 | 1271s | 11.1s |
| Sonnet 5 | 89 | 1164s | 13.1s |

→ **Sonnet ha fatto meno turn (89) ma più lenti** — coerente con la strategia "monolite per turn" (pianifica, poi esegui tutto in pochi turn pesanti). DS4 ha fatto il **maggior numero di turn (110)** ma ognuno era più rapido — strategia "iterazione incrementale".

---

## 4. Performance dei modelli

### 4.1 Comportamento operativo

| Comportamento | DS4 Flash | GPT 5.6 Luna | Sonnet 5 |
|---|---|---|---|
| N° cambi di modello a runtime | 1 (no swap) | 1 (no swap) | 3 (gpt → sonnet → sonnet) |
| Token di thinking spesi | **34.490 chars** (98 blocchi) | 5.464 chars (83 blocchi) | 28.979 chars (50 blocchi) |
| Testo "spiegazione" assistant | **7.397 chars** (45 blocchi) | 1.100 chars (2 blocchi) | 3.917 chars (38 blocchi) |
| Blocchi tool result | 171 (12.5% errori) | 212 (11.3% errori) | 172 (2.9% errori) |
| Strategia prevalente | Reasoning massiccio + 110 turn incrementali | Pensiero minimo + 114 turn molto operativi | Pensiero mirato + 89 turn monolitici |

**Osservazione importante:** GPT 5.6 Luna ha scritto **solo 1.100 chars di testo "esplicativo" in 2 blocchi** in tutta la sessione. Le "spiegazioni" del modello all'utente sono passate attraverso i **risultati dei tool** (212 tool result, 24% dei quali con errore), non attraverso messaggi di prosa. È un comportamento molto "operativo" e poco "conversazionale".

Sonnet 5 ha il **minor tasso di errore dei tool (2.9%)** — segno che pianifica le operazioni prima di eseguirle. DS4 e GPT hanno tassi di errore simili (~12%) — segno di strategia trial-and-error.

### 4.2 Pattern di utilizzo del tool `rule_tool_*`

| Strumento | DS4 | GPT | Sonnet |
|---|---:|---:|---:|
| `pix_tool` (router) | 0 | 1 | 0 |
| `rule_tool_gateway` | 1 | 2 | 1 |
| `rule_tool_frontend_react` | 1 | 2 | 2 |
| `rule_tool_backend_node` | 1 | 2 | 0 |
| `rule_tool_backend_express` | 1 | 1 | 2 |
| `rule_tool_backend` | 1 | 2 | 2 |
| `rule_tool_backend_security` | 0 | 1 | 2 |
| `rule_tool_ui_design_system` | 1 | 2 | 2 |
| `rule_tool_styleguide_a11y` | 1 | 1 | 2 |
| `rule_tool_styleguide_css` | 0 | 1 | 2 |
| `rule_tool_styleguide_html` | 0 | 1 | 0 |
| `rule_tool_styleguide_naming` | 0 | 1 | 0 |
| `rule_tool_styleguide` (mode=scaffold) | 0 | 1 | 1 |
| `rule_tool_toolchain_typescript` | 1 | 1 | 0 |
| `rule_tool_toolchain_project` | 1 | 0 | 0 |
| `rule_tool_devops_testing` | 0 | 1 | 0 |
| `rule_tool_process_adr` | 0 | 2 | **5** ⭐ |
| `rule_tool_handoff` | 0 | 2 | 1 |
| `rule_tool_styleguide_markdown` | 0 | 1 | 0 |
| `rule_tool_check` | 0 | **5** ⭐ | 0 |
| `rule_tool_detect` | 1 | 0 | 0 |
| `rule://skills` | 0 | 0 | 1 |
| **Totale invocazioni rule-mcp** | **10** | **30** | **23** |
| Tool rule-mcp distinti usati | 10 | **19** | 12 |
| Errori su tool result | 0 | 1 | 0 |
| Chars totali ritornati dai tool | 82.664 | 68.677 | **108.447** |

### 4.3 Osservazioni strategiche

- **GPT 5.6 Luna** è l'unico che ha usato il **loop check→fix** del MCP (`rule_tool_check` × 5). Ha anche usato il **router `pix_tool`** e skill di processo (`rule_tool_styleguide_markdown`, `rule_tool_handoff`, `rule_tool_process_adr`). È il modello che ha *interrogato* il server MCP nel modo più esplorativo.
- **Sonnet 5** ha usato pesantemente `rule_tool_process_adr` (5 chiamate) — il tool che produce ADR strutturati. Ha anche letto l'**indice completo delle skill** con `rule://skills` (1 volta, 11.565 chars ritornati) per poi chiamare skill specifiche in modalità `full`. Approccio "indice globale → drill-down chirurgico".
- **DeepSeek v4 Flash** ha usato solo 10 tool rule-mcp, ognuno **in modalità `mode: "full"`** (skill intera letta). Approccio "leggi tutto, produci tutto" ma su un sottoinsieme minimo di skill (10 su 105 disponibili).
- **Nessuno dei 3 ha usato le risorse `rule://*` ad eccezione di Sonnet 5** (1 chiamata all'indice). Le risorse individuali (`rule://<skill>`) non sono state esplorate — i modelli hanno preferito il pattern `mode: "full"` sui tool `rule_tool_*`.

### 4.4 Quanto il modello ha seguito le specifiche del server MCP

| Criterio di aderenza | DS4 Flash | GPT 5.6 Luna | Sonnet 5 |
|---|:-:|:-:|:-:|
| Naming `_PascalCase` (styleguide-naming) | 🟡 (parziale) | 🟡 (parziale) | ✅ |
| Barrel export per componente (`index.ts`) | ✅ | ✅ | ✅ |
| Design system in `src/design-system/` o `styles/tokens.css` | 🟡 (monolite) | ❌ (`_global.css` con classi) | ✅ (tokens.css + base.css) |
| Zero-CSS-class con `data-part` + `adoptedStyleSheets` | ❌ | ❌ | ✅ |
| ADR in `docs/adr/` (numerati, con tag) | ✅ (3 ADR) | ✅ (6 ADR) | ✅ (7 ADR) |
| Handoff in `docs/handoff/` o `docs/handoff.md` | ✅ | ✅ | ✅ |
| Test pattern (vitest + playwright a11y) | ❌ (0 test) | ✅ (6 file di test) | ✅ (6 file di test, 3-layer) |
| React + Express/TypeScript con `.cjs`/`.mjs` dove serve | ❌ (`.js` puro) | ✅ (`.ts`) | ✅ (`.ts`) |
| `pnpm-workspace.yaml` se multi-package | ✅ | ✅ | ✅ |
| `rule_tool_process_adr` usato esplicitamente | ❌ | ✅ | ✅ (5×) |
| **Score di aderenza** | 🟡 4/10 | 🟢 7/10 | 🟢 9/10 |

→ **Sonnet 5 ha l'aderenza più alta (9/10)**, soprattutto grazie al pattern `data-part + adoptedStyleSheets` (skill `rule-styleguide-css`) che gli altri 2 modelli non hanno implementato.

---

## 5. Confronto output architetturale

### 5.1 File tree (escludendo `node_modules`, `dist`, `.git`, `.tokensave`)

#### 🥇 `bookmarks-sonnet5/` (Sonnet 5) — 90 file, 3.479 righe
```
bookmarks-sonnet5/
├── .editorconfig, .gitignore, .nvmrc, .prettierrc
├── README.md (4.0 KB)
├── package.json, pnpm-lock.yaml (138K, 4308 righe), pnpm-workspace.yaml
├── backend/
│   ├── .env, .env.example, .eslintrc.json
│   ├── Dockerfile
│   ├── api/openapi.yaml
│   ├── package.json, tsconfig.json, vitest.config.ts
│   ├── dist/ (136K)
│   └── src/                                     (1.147 LOC TS, 14 file)
│       ├── app.ts, server.ts, initEnv.ts
│       ├── common/
│       │   ├── errors/AppError.ts
│       │   ├── middleware/{errorHandler, requestLogger}.ts
│       │   └── utils/{asyncHandler, ssrfGuard}.ts
│       ├── modules/
│       │   ├── bookmarks/
│       │   │   ├── __tests__/bookmarks.router.test.ts   ← test integrazione
│       │   │   ├── bookmarks.{controller, repository, router, schema, service, types}.ts
│       │   └── health/health.router.ts
│       └── scraping/
│           ├── __tests__/scrape.service.test.ts          ← test scraping
│           └── scrape.service.ts                          ← cheerio + SSRF guard
├── frontend/
│   ├── .env.example, .eslintrc.json, .gitignore
│   ├── playwright.config.ts
│   ├── package.json, tsconfig.json, vite.config.ts, vitest.config.ts
│   ├── dist/ (176K — bundle JS 166K + CSS 5K ⭐)
│   ├── tests/a11y/                                       ← Playwright+axe
│   │   ├── _basic.spec.ts
│   │   └── _forms.spec.ts
│   ├── test-results/
│   └── src/                                     (758 LOC TS, 11 file)
│       ├── App.tsx, main.tsx
│       ├── components/                                  ← 6 componenti
│       │   ├── BookmarkCard/, BookmarkComposer/  (con __tests__/), 
│       │   ├── BookmarkGrid/, EmptyState/, Layout/, Toast/
│       ├── hooks/
│       │   ├── useAdoptedStylesheet.ts        ⭐ UNICO che ha questo hook
│       │   └── useBookmarks.ts
│       ├── services/api.ts
│       ├── styles/{tokens.css, base.css}      ⭐ design system strutturato
│       ├── types/api.ts
│       ├── utils/{formatDomain.ts, __tests__/formatDomain.test.ts}
│       └── setupTests.ts
├── docs/
│   ├── adr/                                            ← 7 ADR
│   │   ├── 001-tool-rule-architect-interview.md
│   │   ├── 002-scaffold-list-all-files.md
│   │   ├── 003-monorepo-pnpm-workspace-…
│   │   ├── 004-server-side-scraping-with-ssrf-…
│   │   ├── 005-zero-css-class-design-system-…
│   │   ├── 006-layered-express-backend-…
│   │   ├── 007-three-layer-test-strategy-…
│   │   └── README.md
│   └── handoff/2026-07-11-session-close.md             ⭐ UNICO con handoff datato
```

#### 🥈 `bookmarks-manager-ds4-flash/` (DeepSeek v4 Flash) — 67 file, 2.505 righe
```
bookmarks-manager-ds4-flash/
├── .editorconfig, .env.example, .gitignore, .nvmrc, .prettierrc
├── README.md (3.2 KB)
├── package.json, pnpm-lock.yaml (102K, 3252 righe), pnpm-workspace.yaml
├── tsconfig.json
├── client/                                       ⚠️ Naming "client" invece di "frontend"
│   ├── index.html
│   ├── package.json, tsconfig.json, vite.config.ts
│   └── src/                                     (747 LOC TS, 22 file)
│       ├── main.tsx, design-system.css (9K)     ⚠️ design system monolitico
│       ├── vite-env.d.ts
│       ├── components/                                    ← 10 componenti
│       │   ├── App/, BookmarkCard/, Button/ ⭐, 
│       │   ├── EmptyState/, ErrorState/ ⭐, FocusTrap/ ⭐,
│       │   ├── Header/, Layout/, LoadingState/, SearchBar/
│       ├── pages/{Home/, NotFound/}
│       ├── hooks/useBookmarks.ts
│       ├── services/api.ts, types/index.ts, utils/index.ts
├── server/                                       ⚠️ Naming "server" invece di "backend"
│   ├── data/bookmarks.json                      ← persistenza file JSON
│   ├── package.json, tsconfig.json
│   └── src/                                     (430 LOC TS, 9 file)
│       ├── app.ts, server.ts, logger.ts
│       ├── common/
│       │   ├── errors/AppError.ts
│       │   ├── middleware/error-handler.ts
│       │   └── types/index.ts
│       └── modules/
│           ├── bookmarks/{bookmarks.controller, .router, .service}.ts
│           └── health/health.router.ts
├── docs/
│   ├── adr/                                    ← 3 ADR
│   │   ├── 001-monorepo-structure-and-tech-choices.md
│   │   ├── 002-ui-design-system-tokens.md
│   │   ├── 003-url-scraping-architecture.md
│   │   └── README.md
│   ├── handoff.md                              ← handoff, ma non datato
│   └── plans/execution-plan.md
```

#### 🥉 `bookmarks-manager-gpt56-luna/` (GPT 5.6 Luna) — 81 file, 2.132 righe
```
bookmarks-manager-gpt56-luna/
├── .editorconfig, .env.example, .gitignore, .nvmrc
├── README.md (961 B)
├── package.json, pnpm-lock.yaml (110K, 3474 righe), pnpm-workspace.yaml
├── biome.json, tsconfig.base.json
├── apps/                                        ✅ Naming "apps/*" (standard turborepo-style)
│   ├── api/                                    (367 LOC TS, 11 file)
│   │   ├── package.json, tsconfig.json, vitest.config.ts
│   │   ├── dist/ (56K)
│   │   ├── tests/{http.test, scraper.test}.ts  ← test backend
│   │   └── src/
│   │       ├── app.ts, server.ts, index.ts, config.ts, logger.ts, types.ts
│   │       ├── common/{error.ts, middleware/error-handler.ts}
│   │       └── modules/
│   │           ├── bookmarks/{bookmarks.repository, .routes, .schemas}.ts
│   │           └── scrape/scraper.service.ts
│   └── web/                                    (714 LOC TS, 17 file)
│       ├── index.html
│       ├── package.json, tsconfig.json, vite.config.ts, playwright.config.ts
│       ├── dist/ (388K — bundle JS 391K ⚠️)
│       ├── tests/                                ← 4 test file
│       │   ├── a11y/bookmarks.a11y.spec.ts       ← Playwright+axe
│       │   ├── api.test.ts, app.test.tsx, preview.test.tsx, setup.ts
│       └── src/
│           ├── App.tsx, main.tsx
│           ├── components/                              ← 6 componenti
│           │   ├── BookmarkCard/, BookmarkGrid/, 
│           │   ├── Layout/, LinkCapture/, PreviewPanel/
│           │   └── (barrel index.ts)
│           ├── pages/{Home, NotFound}.tsx (barrel index.ts)
│           ├── routes/index.tsx
│           ├── services/{api.ts, index.ts}
│           ├── styles/_global.css             ⚠️ 561 righe CSS, UNICO file, con classi
│           └── types/{api.ts, index.ts}
├── docs/                                       ← ricchissima sezione docs
│   ├── adr/                                    ← 6 ADR
│   │   ├── 001-skill-routing-…
│   │   ├── 002-tool-rule-architect-summary.md
│   │   ├── 003-react-and-express-…
│   │   ├── 004-scaffold-generate-all-files.md
│   │   ├── 005-tool-rule-architect-scaffold.md
│   │   ├── 006-keep-remote-scraping-behind-…
│   │   └── README.md
│   ├── api/{openapi.yaml, overview.mdx}
│   ├── {architecture, development, introduction}.mdx
│   ├── handoff.md                              ← handoff dettagliato (Mintlify-style)
│   └── mint.json                               ← Mintlify config
```

### 5.2 Matrice di confronto architetturale

| KPI architetturale | DS4 Flash | GPT 5.6 Luna | Sonnet 5 |
|---|---:|---:|---:|
| Componenti React | **10** | 6 | 6 |
| Componenti unici (esclusi Layout/Card/Grid) | 7 (App, Button, EmptyState, ErrorState, FocusTrap, Header, LoadingState, SearchBar) | 3 (Layout, LinkCapture, PreviewPanel) | 3 (Composer, EmptyState, Toast) |
| File CSS totali | 9 | 1 (monolite `_global.css`) | 8 (8 file per componente + tokens + base) |
| Righe CSS totali | 762 | 561 | **883** |
| File TypeScript totali (src/) | 31 | 43 | 47 |
| Helper modules | 2 (useBookmarks, utils) | 0 (nessun custom hook) | 2 (useBookmarks, useAdoptedStylesheet) |
| Persistenza backend | JSON file (`server/data/`) | in-memory | in-memory |
| SSRF guard | Solo check `localhost` | Range check (private IPs, timeout, 2MB cap) | DNS-lookup + ipaddr.js |
| Test pattern | ❌ nessun test | 6 file (vitest + Playwright+axe) | 6 file (3 vitest + 2 a11y + 1 component) |
| ADR generati | 3 | 6 | **7** |
| Handoff | ✅ `docs/handoff.md` | ✅ `docs/handoff.md` (Mintlify style) | ✅ `docs/handoff/2026-07-11-session-close.md` |
| Naming convenzione | `client/` + `server/` ⚠️ | `apps/api/` + `apps/web/` ✅ | `backend/` + `frontend/` ✅ |
| Design system | Monolite `design-system.css` (9K) | Monolite `_global.css` (561 righe) | `tokens.css` + `base.css` + per-component |
| Zero-CSS-class | ❌ | ❌ | ✅ |
| `adoptedStyleSheets` hook | ❌ | ❌ | ✅ (`useAdoptedStylesheet.ts`) |
| Readability extraction | ❌ (regex) | ✅ (Mozilla Readability) | ❌ (custom cheerio) |
| Bundle frontend (built) | n/a (mai buildato) | 391K JS | **166K JS + 5K CSS** (2.4× più piccolo) |
| `dist/` totale | 0 | 444K | 312K |
| `pnpm-lock.yaml` | 102K (3252 righe) | 110K (3474 righe) | 138K (4308 righe) |
| `node_modules` size | 163 MB | 178 MB | 174 MB |
| `.tokensave` DB size | 712K | 704K | 794K |

### 5.3 Verità architetturali

1. **DS4 Flash ha barato sull'integrazione tecnica.** Ha 10 componenti (più di tutti), ma:
   - 0 test (unico dei 3 senza test)
   - Solo 3 ADR (meno della metà degli altri)
   - Persistenza con JSON file (anziché in-memory o DB)
   - SSRF guard "minimale" (controlla solo se l'URL contiene `localhost`)
   - Mai buildato (`dist/` vuoto) — il bundle di produzione non esiste
   - Ha usato **regex** per estrarre metadata invece di cheerio/Readability

2. **GPT 5.6 Luna ha barato sull'architettura CSS.** Ha il design system **peggiore** dei 3:
   - 1 solo file `_global.css` da 561 righe (vs 8 file in Sonnet e 9 in DS4)
   - Usa **classi CSS** invece di `data-part` (viola `rule-styleguide-css`)
   - Bundle 2.4× più pesante (391K vs 166K di Sonnet)
   - Ma ha la **documentazione più ricca** (architecture.mdx, mint.json, OpenAPI YAML, 6 ADR)

3. **Sonnet 5 ha avuto l'output più tecnicamente curato.** Pattern unici:
   - `useAdoptedStylesheet.ts` (hook dedicato per la microinterazione `adoptedStyleSheets`)
   - Design system in **8 file separati** (1 token + 1 base + 6 per componente)
   - SSRF guard con **DNS-lookup + ipaddr.js** (il più robusto dei 3)
   - Three-layer test strategy esplicita in ADR 007
   - Bundle 2.4× più piccolo grazie a tree-shaking aggressivo

---

## 6. Peso repo e artifact

### 6.1 Pesi a disco (riga di comando `du -sh`)

| Progetto | Totale | `node_modules` | `dist/` | Sorgenti (.git escluso) | `.tokensave` |
|---|---:|---:|---:|---:|---:|
| ds4-flash | **170 MB** | 163 MB | 0 (mai buildato) | ~6 MB | 712K |
| gpt56-luna | **184 MB** | 178 MB | 444K | ~5 MB | 704K |
| sonnet5 | **179 MB** | 174 MB | **312K** ⭐ | ~4.5 MB | 794K |

**Bundle frontend (la metrica che conta per l'utente finale):**
- ds4-flash: **n/a** (non ha buildato)
- gpt56-luna: **391K JS** + CSS inline
- sonnet5: **166K JS** + **5K CSS** ← 2.4× più compatto

> **Sonnet 5 ha il bundle finale più leggero nonostante l'architettura più ricca.** Questo è merito del pattern `data-part` + element selectors (nessuna classe generata, nessun CSS Modules overhead) + tree-shaking efficace.

### 6.2 `node_modules` size

Tutti e 3 i progetti sono simili (~163-178 MB). Le piccole differenze:
- DS4 (163 MB) — meno deps (no Readability, no supertest, no ipaddr.js)
- Sonnet (174 MB) — + ESLint config + cheerio + ipaddr.js + supertest
- GPT (178 MB) — + Readability + cors + helmet

### 6.3 `pnpm-lock.yaml`

| Progetto | Size | Righe | Implicazione |
|---|---:|---:|---|
| ds4-flash | 102K | 3.252 | Meno dipendenze dirette |
| gpt56-luna | 110K | 3.474 | Medie |
| sonnet5 | 138K | **4.308** | Più dipendenze (ESLint full, supertest, ipaddr.js, cheerio per SSRF, vitest config) |

---

## 7. Risparmio di token grazie a caveman e tokensave

### 7.1 Risparmio effettivamente ottenuto

| Skill | Sessione | Risparmio |
|---|---|---:|
| **caveman** | tutte e 3 | **0 token** (skill mai invocata, 0 chiamate) |
| **tokensave** | DS4 + Sonnet | **~0 token** (4 chiamate totali, di cui 3 erano `status`/`health` — nessuna lettura del grafo) |

**Audit onesto del prompt utente:** il prompt chiedeva esplicitamente *"all'inizio fai `tokensave init` e poi `tokensave sync` ad ogni iterazione"*. I 3 modelli hanno interpretato l'istruzione in modo pigro:
- **DS4 Flash** ha chiamato `tokensave_status` (1 volta) + `tokensave_health` (1 volta) e basta. **0 record, 0 sync, 0 read.**
- **GPT 5.6 Luna** ha ignorato completamente tokensave. **0 chiamate.** Ha però generato un file di handoff che menziona *"TokenSave was initialized at session start and synced after each iteration"* — claim **falso** (0 invocazioni su tokensave, 0 record in `memory_decisions` table).
- **Sonnet 5** ha chiamato `tokensave_health` (1 volta) + `tokensave_record_decision` (1 volta) e basta. **1 record effettivo, 0 sync, 0 read.** Anche qui claim parzialmente falso nel handoff: *"tokensave: init+sync fatto a ogni step, health score 6987/10000"* — 1 record vs "ogni step" è una semplificazione notevole.

→ **L'infrastruttura di risparmio era lì, ma i modelli l'hanno trattata come formalità da "spuntare" invece che come acceleratore.**

### 7.2 Risparmio potenziale non sfruttato

Se i modelli avessero usato i tool in lettura:

| File | Peso | Costo "read intero" | Costo "tokensave_read" | Saving |
|---|---:|---:|---:|---:|
| `tokens.css` (Sonnet, ~5KB) | ~1.300 token | $0.004 | $0.0005 (entity) | **-88%** |
| `_AppContext.jsx` (4-6KB) | ~1.200 token | $0.004 | $0.0002 | **-95%** |
| `scrape.service.ts` (10KB) | ~2.500 token | $0.008 | $0.001 | **-87%** |
| `package.json` (1KB) | ~250 token | $0.001 | $0.0001 | **-90%** |
| 10+ file di competenza media (5KB cad.) | ~12.500 token | $0.040 | $0.004 | **-90%** |

Su una sessione come Sonnet 5, **tokensave avrebbe potuto risparmiare ~30-50% del context "speso" in letture file** durante le fasi di validazione e fix. Su 19M token totali, parliamo di un saving potenziale di 3-5M token = $1-2.

**Caveman**, invece, è una skill di comunicazione/compressione memo. Non applicabile a un test di code-generation puro. Avrebbe senso se l'utente avesse chiesto memo, riassunti, o conversazioni prolisse — non è il caso qui.

### 7.3 Verdetto su caveman/tokensave

> **L'infrastruttura di risparmio (caveman, tokensave) era disponibile ma il test non l'ha attivata.** Tre modelli su tre l'hanno ignorata — due con 0 invocazioni (GPT) o 2 invocazioni cosmetiche (DS4, Sonnet). Questo significa che il benchmark misura le capacità *pure* dei modelli con `rule-mcp`, non l'efficienza del sistema completo. Per un test rigoroso sull'efficienza, servirebbe:
>
> 1. Una 4ª sessione in cui l'utente istruisca esplicitamente *"ad ogni `read` di un file > 2KB usa `tokensave_read` invece di `read` puro"*
> 2. Una 5ª sessione in cui l'utente chieda esplicitamente *"usa caveman per i tuoi memo di pensiero"*
> 3. Misurazione del delta di token risparmiati rispetto a una sessione "baseline" senza istruzioni

---

## 8. Quale modello ha seguito più puntualmente le specifiche MCP

### 8.1 Specifiche chiave del prompt

Il prompt richiedeva esplicitamente:
1. ✅ App React accessibile
2. ✅ Campo paste-link con scraping (OG images, metadata, anteprima testuale)
3. ✅ Backend Node/Express/TypeScript
4. ✅ Documentazione e ADR
5. ✅ Documento di handoff
6. ✅ UI "degna di Apple" + microinterazioni
7. ✅ Design system con typography proporzionale, spacings, focus, radii, elevations
8. ✅ Usare `caveman` e `tokensave` (esplicito)

### 8.2 Score per specifica

| # | Specifica | DS4 Flash | GPT 5.6 Luna | Sonnet 5 |
|---|---|:-:|:-:|:-:|
| 1 | React frontend accessibile | ✅ | ✅ | ✅ |
| 2 | Paste-link + scraping + OG | 🟡 (regex) | ✅ (Readability) | ✅ (cheerio + SSRF) |
| 3 | Backend Express/TS | ✅ | ✅ | ✅ |
| 4 | ADR | 🟡 (3) | ✅ (6) | ✅ (7) |
| 5 | Handoff | ✅ (non datato) | ✅ (Mintlify) | ✅ (datato) |
| 6 | UI Apple + microinterazioni | 🟡 (focus trap) | 🟡 (no specifico) | ✅ (adoptedStyleSheets) |
| 7 | Design system completo | 🟡 (monolite) | ❌ (single file) | ✅ (multi-file) |
| 8 | `caveman` + `tokensave` usati | ❌ (0/0) | ❌ (0/0) | ❌ (0/0, 1 record) |
| | **Score totale** | **3.5/8** | **5.5/8** | **6.5/8** |

### 8.3 Verdetto finale

> **Sonnet 5 ha seguito più puntualmente le specifiche del prompt** (6.5/8 vs 5.5/8 di GPT vs 3.5/8 di DS4). Nonostante il costo 80× superiore a DS4, ha consegnato l'MVP completo al primo prompt senza richiedere interventi correttivi.

**Perché?** Tre ragioni concorrenti:
1. **Ha letto l'indice completo delle skill** (1 chiamata a `rule://skills`) → ha avuto la mappa dell'intero parco skill prima di iniziare
2. **Ha usato `rule_tool_process_adr` 5 volte** → ha generato ADR strutturati e conformi al template Nygard
3. **Ha pianificato in anticipo la "three-layer test strategy"** (ADR 007) → invece di scrivere test a posteriori, ha definito la strategia prima di scrivere il codice

GPT 5.6 Luna ha il secondo posto per la completezza di docs e OpenAPI, ma ha barato sull'architettura CSS (single `_global.css` invece di token+per-component) e sul bundle size (2.4× più pesante).

---

## 9. Tempo, costo e produttività — vista unificata

### 9.1 Tempo e costo

| Modello | Tempo attivo | Costo | Costo/min | LOC/min |
|---|---:|---:|---:|---:|
| DS4 Flash | 13:49 | $0.0674 | $0.0049 | 181 |
| GPT 5.6 Luna | 21:11 | $1.8812 | $0.0888 | 100 |
| Sonnet 5 | 19:24 | $5.4903 | $0.2830 | **179** |

### 9.2 Costo per "completezza" (punteggio specifiche)

| Modello | Costo totale | Score specifiche | Costo / punto |
|---|---:|---:|---:|
| DS4 Flash | $0.0674 | 3.5/8 | $0.0193 ⭐ best value |
| GPT 5.6 Luna | $1.8812 | 5.5/8 | $0.3420 |
| Sonnet 5 | $5.4903 | 6.5/8 | $0.8447 |

### 9.3 Costo per "zero-intervento" (1 solo prompt utente)

| Modello | Costo per "no retry" |
|---|---:|
| Sonnet 5 (1 prompt) | **$5.4903** |
| GPT 5.6 Luna (2 prompt) | $0.9406 / prompt |
| DS4 Flash (3 prompt) | $0.0225 / prompt |

> **Sonnet è 5.8× più costoso di GPT e 81× più costoso di DS4 per singolo prompt** — ma ha richiesto 0 retry. Se si pesa il costo-opportunità del tempo-utente (es. €30/h per un dev mid → €0.50/min), i 18 minuti di retry di DS4 costano ~€9 al netto del dollaro del modello → DS4 è in realtà il **più costoso in TCO**.

### 9.4 Metriche reali di context (per dissipare i miti)

| Modello | Peak context (UNICO) | Cache read cumulato (N×context) | Rapporto N× / Peak |
|---|---:|---:|---:|
| DS4 Flash | 160.572 | 13.110.272 | **82×** (110 call × ~63K medio) |
| GPT 5.6 Luna | 189.673 | 13.837.824 | 73× (114 call × ~63K medio) |
| Sonnet 5 | 276.432 | 19.138.168 | 69× (89 call × ~105K medio) |

→ Il "cache read cumulato" è circa **N × context medio**, confermando che è un multiplo del context window. La metrica reale di context usato è il **Peak context** (prima colonna).

### 9.5 Cache write: chi ha *davvero* usato il prompt caching

| Modello | Cache write cumulato (REALE) | % del peak context | Significato |
|---|---:|---:|---|
| DS4 Flash | 0 | 0% | Non ha scritto in cache (forse caching provider-side non conteggiato) |
| GPT 5.6 Luna | 0 | 0% | Non ha scritto in cache — paga ogni call a prezzo pieno |
| **Sonnet 5** | **275.803** | **99,7%** del peak | Ha messo in cache l'intero contesto al primo turn, poi ha riletto a 10% |

→ **Sonnet 5 è l'unico che ha usato esplicitamente la cache del provider.** Le 89 call successive hanno tutte `input=2` (le 2 token non-cached di ogni nuovo messaggio assistant) e `cacheRead=275K` (il contesto cachato). Senza cache, Sonnet avrebbe pagato 89 × ~280K = ~25M token di input a prezzo pieno. Con cache, ha pagato 275K + 89 × 2 = ~275K token a prezzo pieno. **Risparmio stimato: $50-70.**

---

## 10. Conclusioni e verdict

### 10.1 Sul server MCP `rule-mcp`

- **Il server funziona e fa rispettare gli standard.** Tutti e 3 i modelli hanno prodotto applicazioni *funzionanti e strutturate* usando il server. Senza il server, lo stesso prompt avrebbe probabilmente generato:
  - Codice con naming inconsistente (no `_PascalCase` sui barrel)
  - Design system assente o in linea singola
  - Architetture "monolite" (un solo file React gigante)
  - Zero ADR, zero handoff
  - Bundle 3-5× più pesante

- **Il costo del server è < 6% del costo totale del task.** Il collo di bottiglia è il modello, non il tooling. Usare il server MCP non è gratis ma è trascurabile rispetto al costo dell'inferenza.

- **`rule_tool_check` + `rule_tool_fix` funzionano solo se il modello li chiama** — e li ha chiamati solo GPT 5.6 Luna (5×). Gli altri 2 modelli non hanno sfruttato il loop di validazione. Questo è un segnale che il loop check→fix è un pattern "GPT-friendly" ma non universale.

- **Le risorse `rule://*` (1 sola chiamata in Sonnet) sono preziose** per modelli che vogliono fare "exploration" del parco skill prima di iniziare. Nessuno dei 3 ha usato `rule://*` per leggere una skill specifica — hanno preferito il pattern `mode: "full"` sui tool `rule_tool_*`.

### 10.2 Sul modello migliore per questo task

| Obiettivo | Modello consigliato |
|---|---|
| MVP più rapido possibile (1 prompt) | **Sonnet 5** (unico a farlo in 19 min, 1 prompt) |
| Miglior rapporto qualità/prezzo monetario | **DeepSeek v4 Flash** ($0.07, 3 prompt) |
| Minor TCO (tempo utente incluso) | **Sonnet 5** (zero retry) |
| Massima completezza (test, ADR, validazione) | **Sonnet 5** (7 ADR, 3-layer test) |
| Documentazione più ricca | **GPT 5.6 Luna** (Mintlify, OpenAPI YAML, architettura.mdx) |
| UI più curata e moderna | **Sonnet 5** (data-part + adoptedStyleSheets) |
| Bundle frontend più leggero | **Sonnet 5** (166K vs 391K di GPT) |
| Persistenza solida (no in-memory) | **DeepSeek v4 Flash** (JSON file storage) ⚠️ ma è anche l'unico che ha fixato il problema |

### 10.3 Risposta diretta alla domanda del test

> *"Il server MCP locale `rule-mcp` è utile?"*

**Sì, oggettivamente.** Tutti e 3 i modelli hanno prodotto applicazioni *funzionanti, strutturate e con documentazione* usando il server. Senza il server, lo stesso prompt avrebbe probabilmente generato 3 "blob" di codice non strutturato, senza ADR, senza handoff, senza test, con naming inconsistente e bundle 3-5× più pesanti.

**Numeri a supporto:**
- 3/3 progetti hanno barrel exports, prefisso `_` per file privati, struttura `src/components/<Name>/`
- 3/3 hanno ADR (3, 6, 7 rispettivamente)
- 3/3 hanno handoff
- 2/3 hanno suite di test a11y Playwright+axe
- 1/3 (Sonnet) ha implementato il pattern `adoptedStyleSheets` che è un guardrail esplicito del server

**Caveat importante:** il test **NON** ha sfruttato pienamente l'ecosistema (caveman, tokensave in lettura). Un test più rigoroso dovrebbe includere:
- 1 sessione aggiuntiva per modello *con* istruzioni esplicite di usare caveman+tokensave-read
- Misurazione del delta di token risparmiati
- Confronto con una sessione "baseline" senza `rule-mcp` (per misurare il delta *grazie al* server)

### 10.4 Numeriche finali in pillole

```
💰 COSTO TOTALE        Sonnet ($5.49) > GPT ($1.88) > DS4 ($0.07)
⏱️ TEMPO ATTIVO        GPT (21:11) > Sonnet (19:24) > DS4 (13:49)
🔄 PROMPT UTENTE       Sonnet (1) < GPT (2) < DS4 (3)
📞 LLM API CALL        Sonnet (89) < DS4 (110) < GPT (114)
📝 RIGHE CODICE        Sonnet (3479) > DS4 (2505) > GPT (2132)
🧱 COMPONENTI          DS4 (10) > GPT (6) = Sonnet (6)
📄 ADR GENERATI        Sonnet (7) > GPT (6) > DS4 (3)
🧪 TEST FILE           GPT (6) = Sonnet (6) > DS4 (0)
🛠️ rule-mcp TOOLS       GPT (30) > Sonnet (23) > DS4 (10)
🛠️ DISTINCT TOOLS      GPT (19) > Sonnet (12) > DS4 (10)
🎯 ADERENZA MCP        Sonnet (9/10) > GPT (7/10) > DS4 (4/10)
💾 BUNDLE SIZE         Sonnet (166K) << GPT (391K) << DS4 (n/a)
🗜️ CAVEMAN USAGE       0/3
🗃️ TOKENSAVE USAGE     0/3 letture, 1/3 con 1 record_decision

--- Metriche REALI di context (non cumulate) ---
📏 PEAK CONTEXT        Sonnet (276K) > GPT (190K) > DS4 (161K)
📏 % CTX USED @ PEAK   GPT (51%) ⚠️ > Sonnet (28%) > DS4 (16%)
📏 CACHE WRITE (REALE) Sonnet (276K) ✅ > GPT (0) ❌ = DS4 (0) ❌
📤 OUTPUT (REALE)      Sonnet (97K) > DS4 (50K) > GPT (40K)
```

---

## Allegato A — File di sessione原始

| Session ID | Path | Modello finale |
|---|---|---|
| `019f51a0-186d-751e-8e8b-8cce585f17e4` | `~/.pi/agent/sessions/--Users-emilianopisu-Projects-work-rule-poc-bookmarks-manager-bookmarks-manager-ds4-flash--/2026-07-11T14-41-14-349Z_…jsonl` | `deepseek-v4-flash` (opencode-go) |
| `019f51a3-e942-70ae-8ae9-5c8f7d020b54` | `~/.pi/agent/sessions/--Users-emilianopisu-Projects-work-rule-poc-bookmarks-manager-bookmarks-manager-gpt56-luna--/2026-07-11T14-45-24-418Z_…jsonl` | `gpt-5.6-luna` (openai-codex) |
| `019f51a3-6a26-705f-ba85-d09d4aa41283` | `~/.pi/agent/sessions/--Users-emilianopisu-Projects-work-rule-poc-bookmarks-manager-bookmarks-sonnet5--/2026-07-11T14-44-51-878Z_…jsonl` | `claude-sonnet-5` (github-copilot) |

## Allegato B — Tool rule-mcp invocati (per sessione)

```
DEEPSEEK V4 FLASH (10 invocazioni, 10 tool distinti):
  rule_tool_detect                       1×     rule_tool_gateway                1×
  rule_tool_frontend_react               1×     rule_tool_backend_node           1×
  rule_tool_backend_express              1×     rule_tool_backend                1×
  rule_tool_ui_design_system             1×     rule_tool_styleguide_a11y        1×
  rule_tool_toolchain_project            1×     rule_tool_toolchain_typescript   1×

GPT 5.6 LUNA (30 invocazioni, 19 tool distinti):
  pix_tool (router)                     1×     rule_tool_check                  5× ⭐
  rule_tool_styleguide (mode=scaffold)   1×     rule_tool_gateway                2×
  rule_tool_frontend_react               2×     rule_tool_backend_node           2×
  rule_tool_backend_express              1×     rule_tool_backend                2×
  rule_tool_backend_security             1×     rule_tool_ui_design_system       2×
  rule_tool_styleguide_a11y              1×     rule_tool_styleguide_html        1×
  rule_tool_styleguide_css               1×     rule_tool_styleguide_naming      1×
  rule_tool_toolchain_typescript         1×     rule_tool_devops_testing         1×
  rule_tool_process_adr                  2×     rule_tool_handoff                2×
  rule_tool_styleguide_markdown          1×

SONNET 5 (23 invocazioni, 12 tool distinti):
  rule_tool_gateway                      1×     rule_tool_frontend_react         2×
  rule_tool_backend_express              2×     rule_tool_backend                2×
  rule_tool_backend_security             2×     rule_tool_ui_design_system       2×
  rule_tool_styleguide_a11y              2×     rule_tool_styleguide_css         2×
  rule_tool_styleguide (mode=scaffold)   1×     rule_tool_process_adr            5× ⭐
  rule_tool_handoff                      1×
  + 1 rule://skills (risorsa: indice globale, 11565 chars)
```

## Allegato C — Conteggi file per progetto

| Tipo file | DS4 Flash | GPT 5.6 Luna | Sonnet 5 |
|---|---:|---:|---:|
| `.ts` | 25 | 31 | 38 |
| `.tsx` | 10 | 12 | 9 |
| `.css` | 9 | 1 | 8 |
| `.json` | 3 | 4 | 2 |
| `.md` | 4 (ADR) + 1 handoff + 1 plan | 6 (ADR) + handoff + 4 mdx | 7 (ADR) + handoff |
| `.yaml`/`.yml` | 0 | 1 (openapi.yaml) | 1 (openapi.yaml) |
| `.html` | 1 | 1 | 1 |
| `.tsx` in `__tests__/` | 0 | 4 | 1 |
| `.test.ts` / `.spec.ts` | 0 | 6 | 5 |
| **TOTALE file sorgente** | **67** | **81** | **90** |
| **Righe sorgente totali (TS/TSX/CSS/MD/YAML/JSON)** | **2.505** | **2.132** | **3.479** |

## Allegato D — Tokensave database stats

| Metrica | DS4 Flash | GPT 5.6 Luna | Sonnet 5 |
|---|---:|---:|---:|
| `memory_decisions` records | 0 | 0 | 0 (1 dichiarato, non persistito) |
| `memory_code_areas` records | 0 | 0 | 0 |
| `nodes` indicizzati | 252 | 238 | **311** |
| `files` indicizzati | 42 | 52 | 57 |
| `edges` nel grafo | 36 | 31 | **46** |
| `read_cache` entries | 0 | 0 | 0 |
| DB size | 712K | 704K | **794K** |

→ Tutti e 3 i modelli hanno inizializzato tokensave (`tokensave.db` esiste in `.tokensave/`), **ma nessuno dei 3 ha effettivamente registrato decisioni né letto il grafo.** L'infrastruttura è stata solo "inizializzata", mai sfruttata.

## Allegato E — Quote del modello (text vs thinking)

| Metrica | DS4 Flash | GPT 5.6 Luna | Sonnet 5 |
|---|---:|---:|---:|
| Thinking blocks | **98** | 83 | 50 |
| Thinking chars (totale) | **34.490** | 5.464 | 28.979 |
| Testo "spiegazione" assistant | **7.397 chars** (45 blocchi) | 1.100 chars (2 blocchi) | 3.917 chars (38 blocchi) |
| Token reasoning (ufficiale) | 8.377 | 10.518 | **20.565** |

→ DS4 ha la più alta densità di thinking per turno (98/110 = 89% dei turn con thinking). GPT ha la più bassa (83/114 = 73% con thinking). Sonnet ha il pensiero più mirato (50/89 = 56% con thinking, ma ogni blocco è 2× più lungo in media).
