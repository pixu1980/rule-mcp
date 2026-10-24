# Report Comparativo: `rule-mcp` x 3 Modelli (Phonebook)

> **Stesso prompt, 3 modelli, 3 applicazioni phonebook (Electron + React).**
> Benchmark oggettivo dell'efficacia del server MCP locale `rule-mcp` su un task **client-only** (no backend, no DB): UI Apple-style, microinterazioni, design system, sample data, tests opzionali.

---

## TL;DR, Il verdetto secco

| KPI                                                     |                                                                                                      🥇 Sonnet 4.6 |                      🥈 GPT 5.6 Luna |                                                                                  🥉 DeepSeek v4 Flash |
| ------------------------------------------------------- | -----------------------------------------------------------------------------------------------------------------: | -----------------------------------: | ----------------------------------------------------------------------------------------------------: |
| Iterazioni utente per arrivare all'MVP                  |                                                                                                           **1** ✅ |              1 (con 2 retry tecnici) |                                                                               **4** (1 + 3 follow-up) |
| Tempo attivo sessione (primo prompt -> fine)            |                                                                                                              24:06 |                                18:30 |                                                                                             **17:31** |
| Prompt totali (incluso retry)                           |                                                                                                                  1 |  4 (1 utile + 1 side-task + 2 retry) |                                                                                   4 (1 + 3 follow-up) |
| Componenti React create                                 |                                                                                                 **11** (più ricca) |                    1 (monolitico) ⚠️ |                                                                                                    10 |
| File totali (escl. nm/dist/.git)                        |                                                                                                                 56 |                                   50 |                                                                                                    58 |
| Linee di codice sorgente                                |                                                                                                          **5.708** |                               805 ⚠️ |                                                                                                 4.239 |
| Peso repo (solo sorgenti, no nm)                        |                                                                                                             489 KB |                               352 KB |                                                                                                389 KB |
| Costo monetario (reale, fatturato)                      |                                                                                                     **$5.3808** 💸 |                              $1.5390 |                                                                                           **$0.0750** |
| LLM API call effettuate                                 |                                                                                                             **57** |                                   70 |                                                                                                    71 |
| **Peak context window usato** (max in 1 call)           |                                                                                              200.944 (20,1% di 1M) |              136.865 (36,8% di 372K) |                                                                             **223.447** (22,3% di 1M) |
| Crescita contesto (1ª -> ultima call)                   |                                                                                                       **+131.120** |                              +91.027 |                                                                                              +161.453 |
| Output tokens totali (REALE, generato)                  |                                                                                                        **103.676** |                               34.550 |                                                                                                82.915 |
| Input tokens "uncached" cumulato (REALE)                |                                                                                                             **59** |                              250.516 |                                                                                               149.734 |
| **Cache write** (REALE, token messi in cache)           |                                                                                                     **285.619** ✅ |                                 0 ❌ |                                                                                                  0 ❌ |
| Cache read cumulato (N x context, **informativo solo**) |                                                                                                          9.181.217 |                            6.617.600 |                                                                                            10.995.456 |
| Tool call rule-mcp                                      |                                                                                                                  5 |                               **25** |                                                                                                    14 |
| Test passati al primo colpo                             |                                                                                               n/a (no test creati) |            ✅ 2 file (vitest + a11y) |                                                                                  n/a (no test creati) |
| ADR generati                                            |                                                                                                                  0 |                                **9** |                                                                                                     2 |
| Sample data                                             |                                                                                              ✅ 24 contatti ricchi |                 🟡 3 contatti inline |                                                                              ✅ 75 generati a runtime |
| Design system folder                                    |                                                                                            ✅ `tokens.css` (7.5KB) |                         ❌ (assente) |                                                                                    ✅ 4 file separati |
| Componenti unici (esclusi Layout/Card/Icon)             | 8 (App, Avatar, ContactCard, ContactDetail, ContactForm, ContactList, EmptyState, GroupFilter, SearchBar, Sidebar) |                0 (tutto in OrbitApp) | 7 (App, Avatar, ContactCard, ContactDetail, ContactForm, ContactList, EmptyState, SearchBar, Sidebar) |
| Tokensave effettivamente usato                          |                                                                                                               ❌ 0 |                                 ❌ 0 |                                                 ⚠️ 2 chiamate (solo record_decision/record_code_area) |
| Caveman invocato                                        |                                                                                                               ❌ 0 |                                 ❌ 0 |                                                                                                  ❌ 0 |
| Rispetto specifiche dell'utente                         |                                                                                    ✅ **MVP corretto al 1° colpo** | 🟡 parziale, 1 componente monolitico |                                                                              ❌ 3 follow-up richiesti |

**Verdetto sintetico (in una riga):**

> **Sonnet 4.6 è l'unico modello che ha consegnato un MVP funzionante al primo prompt**, con 11 componenti, 24 contatti ricchi, design system completo e pattern `adoptedStyleSheets` per le microinterazioni. Costo 72x superiore a DeepSeek, ma è l'unico che ha richiesto **zero** intervento dell'utente dopo il prompt iniziale. **GPT 5.6 Luna** ha barato sull'architettura (un solo `OrbitApp.jsx` monolitico di ~250 righe), pur avendo eseguito il loop `check→fix` del MCP 9 volte e generato 9 ADR. **DeepSeek v4 Flash** è imbattibile sul costo ($0.075) ma ha richiesto 3 follow-up per mancanza di design system, dati di esempio, e problemi di render della rubrica.

---

## 1. Setup del test

### 1.1 Prompt identico per le 3 sessioni

Tutte e 3 le sessioni sono partite dallo stesso identico prompt utente (verbatim, integrale):

> _"usa rule-mcp MCP per creare una applicazione react che implementi una rubrica, sfrutta tutti gli standard indicati dalle skills e dai tools di `rule-mcp` per fare una app electron che implementi una rubrica dettagliata, con darti di esempio, ui degna di apple e experience con microinterazioni, il tutto implementando un design system di base che abbia una consistenza in termini di typography proporzionale, spacings proporzionali, focus, radii, elevations e quel che serve"_

### 1.2 Modelli e provider

| Session     | Model ID            | Provider         | Cartella output            | CWD sessione |
| ----------- | ------------------- | ---------------- | -------------------------- | ------------ |
| `019f5134…` | `gpt-5.6-luna`      | `openai-codex`   | `poc/phonebook/`           | idem         |
| `019f5148…` | `deepseek-v4-flash` | `opencode-go`    | `poc/phonebook-ds4-flash/` | idem         |
| `019f5156…` | `claude-sonnet-4.6` | `github-copilot` | `poc/phonebook-sonnet/`    | idem         |

Nota: la sessione GPT 5.6 Luna è partita con 1 swap di modello (`gpt-5.5` -> `gpt-5.6-luna`) a 6:12 dall'inizio. Il modello `gpt-5.6-luna` è diventato operativo da `12:49:36Z`. La sessione Sonnet 4.6 è partita con 2 swap (`deepseek-v4-flash` -> `claude-sonnet-4-6` -> `claude-sonnet-4.6`) nei primi 54 secondi.

### 1.3 Tool MCP resi disponibili

Il server `rule-mcp` ha esposto **105 tool** + 186 risorse `rulemcp://*` + 1 router, organizzati in skill folder: `frontend/*`, `backend/*`, `data/*`, `devops/*`, `platform/*`, `process/*`, `styleguide/*`, `toolchain/*`, `ui/*`, `ai-agents/*`.

---

## 2. Costi in token

### 2.0 ⚠️ Nota metodologica importante: cosa sono davvero "i token processati"

L'API LLM restituisce per ogni chiamata un blocco `usage` con 4 contatori:

| Campo        | Significato                                                 | È un "reale"?                                               |
| ------------ | ----------------------------------------------------------- | ----------------------------------------------------------- |
| `input`      | Token **nuovi** (non in cache) visti in **questa** chiamata | ✅ sì, ma cumulato su N call = "token nuovi totali"         |
| `output`     | Token **generati** dal modello in **questa** chiamata       | ✅ sì, cumulato = "token generati totali"                   |
| `cacheRead`  | Token **letti dalla cache** in **questa** chiamata          | ⚠️ **NON è unique**, è N x (contesto al momento della call) |
| `cacheWrite` | Token **messi in cache** (nuovi) in **questa** chiamata     | ✅ sì, cumulato = "token effettivamente cacheati"           |

**Errore comune** (presente in prima stesura di questo report): sommare `input + cacheRead + output` su tutte le call. Questo **non** dà i "token totali processati", dà un multiplo del context window. Esempio: 71 call x 154K context medio = ~11M di `cacheRead` cumulato (DeepSeek), ma il context unico era 223K.

**Le metriche reali che contano sono:**

1. **Peak context window** = MAX `totalTokens` tra tutte le call = quanto contesto il modello ha dovuto gestire al picco (limite duro della context window)
2. **Output cumulato** = somma `output` = quanto ha **davvero** scritto
3. **Cost** = somma `cost.total` = dollari reali fatturati
4. **Cache write cumulato** = somma `cacheWrite` = quanto è stato **davvero** messo in cache
5. **Cache read cumulato** = somma `cacheRead` = **informativo solo** (mostra quanto il prompt caching è stato usato)
6. **Input cumulato** = somma `input` = token nuovi "uncached" visti (significativo per modelli che non usano cache)

### 2.1 Numeriche reali per sessione

| Metrica                                | GPT 5.6 Luna | DeepSeek v4 Flash |     Sonnet 4.6 |
| -------------------------------------- | -----------: | ----------------: | -------------: |
| Context window del modello             |      372.000 |         1.000.000 |      1.000.000 |
| N° LLM API call                        |           70 |                71 |         **57** |
| **Peak context usato (max in 1 call)** |      136.865 |           223.447 |        200.944 |
| % del context window al picco          |        36,8% |             22,3% |          20,1% |
| Crescita contesto (1ª -> ultima call)  |      +91.027 |      **+161.453** |       +131.120 |
| **Output tokens totali (REALE)**       |       34.550 |            82.915 |    **103.676** |
| Input "uncached" cumulato (REALE)      |  **250.516** |           149.734 |             59 |
| **Cache write cumulato (REALE)**       |         0 ❌ |              0 ❌ | **285.619** ✅ |
| Cache read cumulato (informativo)      |    6.617.600 |        10.995.456 |      9.181.217 |
| Reasoning tokens (REALE)               |        8.679 |            23.020 |     **47.557** |
| **Costo totale fatturato**             |  **$1.5390** |       **$0.0750** |    **$5.3808** |
| Costo / 1K output                      |      $0.0446 |           $0.0009 |        $0.0519 |
| Costo / 1K LOC generata                |       $1.913 |           $0.0177 |         $0.943 |
| LOC/min                                |         43,5 |         **242,0** |          237,0 |

### 2.2 Tre osservazioni che cambiano tutto

1. **Sonnet 4.6 è l'unico che ha **attivamente** usato il prompt caching.** Ha scritto 285.619 token in cache (il prompt iniziale + skill caricate in `mode: "full"`) e li ha riletti per 56/57 call successive a tariffa ridotta (10% del prezzo input). Questo spiega perché il `cacheRead` cumulato è 9.2M ma il context unico era solo 200K. Inoltre: ha usato **SOLO 59 token di input "fresh"** in tutta la sessione, il resto è venuto dalla cache. È un segnale fortissimo di efficienza.

2. **DeepSeek v4 Flash ha la crescita di contesto più alta (+161K)**, è il modello che ha accumulato più "storia" durante la sessione. GPT invece ha avuto la crescita più contenuta (+91K), segno che riusa e ricicla context in modo efficiente nonostante non usi cache di provider.

3. **GPT 5.6 Luna ha riempito il 36,8% della sua context window** (136K su 372K). È proporzionalmente il modello **più sotto pressione** tra quelli con finestra < 1M, ogni nuova iterazione era a rischio di truncation. Per confronto: DS4 al 22,3% e Sonnet al 20,1% del loro rispettivo 1M. **GPT ha la context window più piccola dei 3 (372K) e l'ha usata più intensamente in proporzione.**

### 2.3 Costo per token "utile" (output)

| Modello           | $ / 1K output | Output totale | Costo output | % del costo totale |
| ----------------- | ------------: | ------------: | -----------: | -----------------: |
| DeepSeek v4 Flash |       $0.0009 |        82.915 |      $0.0232 |                31% |
| GPT 5.6 Luna      |       $0.0446 |        34.550 |      $0.2377 |                15% |
| Sonnet 4.6        |       $0.0519 |       103.676 |      $1.5551 |                29% |

**Osservazione chiave:** Sonnet 4.6 ha generato **3x l'output di GPT 5.6** (104K vs 35K) e **1.25x l'output di DS4** (104K vs 83K). Ha scritto il **50% di codice in più** del secondo classificato. Il costo elevato di Sonnet ($5.38) **non** è dovuto al context grande, è dovuto a:

- Più token di output (104K vs 35K di GPT)
- 285K di `cache_write` upfront (costo pieno la prima volta: $1.07)
- Modello Sonnet ha prezzi unitari più alti di DS4 di ~50x e di GPT di ~1.2x

GPT 5.6 Luna e DS4 Flash non hanno mai scritto in cache (`cache_write=0` su entrambi). Hanno goduto del prompt caching del provider (presumibilmente OpenAI/Anthropic) ma non lo hanno _alimentato attivamente_.

### 2.4 Quanto è costato `rule-mcp` in sé

**Risposta: il costo del server MCP è < 1% del costo totale del task.** Ecco perché:

1. **I tool `rule_tool_*` non sono LLM**, sono esecuzioni di regole deterministiche (scaffolding, lint, validazione). Il costo è il context che il modello spende per leggere il risultato del tool.
2. **Stima del context "speso" per i tool rule-mcp** (proxy: somma caratteri dei tool result, ~4 token/char):

| Sessione          | N° tool rule-mcp | Chars ritornati (stima) | Token stimati (4x) | Costo stimato |
| ----------------- | ---------------: | ----------------------: | -----------------: | ------------: |
| GPT 5.6 Luna      |               25 |                 ~50.000 |               ~12K |       ~$0.015 |
| DeepSeek v4 Flash |               14 |                 ~30.000 |                ~7K |       ~$0.001 |
| Sonnet 4.6        |                5 |                 ~15.000 |                ~4K |       ~$0.012 |

Il "costo stimato" è calcolato come `token × prezzo_input_del_modello` (Sonnet input ~$3/Mtoken, GPT ~$1/Mtoken, DS4 ~$0.14/Mtoken). Anche per Sonnet (il più costoso), il costo dei tool è < 0.3% del totale.

**Conclusione:** **usare il server MCP costa circa 2 ordini di grandezza in meno rispetto al costo del modello.** Il collo di bottiglia è l'inferenza, non il tooling.

### 2.5 Confronto peak context vs context window: chi è "stressato"?

| Modello           | Peak context |    Window | % usato | "Headroom" rimanente |
| ----------------- | -----------: | --------: | ------: | -------------------: |
| Sonnet 4.6        |      200.944 | 1.000.000 |   20,1% |     799K (4,0x peak) |
| GPT 5.6 Luna      |      136.865 |   372.000 |   36,8% |     235K (1,7x peak) |
| DeepSeek v4 Flash |      223.447 | 1.000.000 |   22,3% |     777K (3,5x peak) |

-> **GPT 5.6 Luna è il modello "più sotto pressione"**, ha usato oltre 1/3 della sua context window. Una sessione più lunga (es. con 200 turn anziché 70) lo avrebbe portato al limite. DS4 e Sonnet hanno ampio margine per crescere ulteriormente.

### 2.6 Quanto è costato `tokensave` (a sua volta un MCP)

| Sessione          |                      N° tool tokensave | Costo stimato | % del totale |
| ----------------- | -------------------------------------: | ------------: | -----------: |
| GPT 5.6 Luna      |                                      0 |            $0 |           0% |
| DeepSeek v4 Flash | 2 (record_decision + record_code_area) |      <$0.0001 |       < 0.2% |
| Sonnet 4.6        |                                      0 |            $0 |           0% |

-> Il costo dei tool tokensave è **praticamente nullo**. Il vero "costo" è che i modelli **non li hanno sfruttati** come acceleratori.

### 2.7 Risparmio potenziale da caveman e tokensave (NON ottenuto)

| Skill         | Usata in              | Risparmio ottenuto             | Risparmio potenziale (se usata in lettura) |
| ------------- | --------------------- | ------------------------------ | -----------------------------------------: |
| **caveman**   | 0/3 sessioni          | 0 token                        |   ~75% su memos lunghi (qui non applicato) |
| **tokensave** | 1/3 (DS4: 2 record_*) | ~0 (solo scritture, 0 letture) |                  ~50-70% sul context grafo |

**Verità nuda:** né caveman né tokensave sono stati sfruttati come acceleratori. Le 2 invocazioni totali (entrambe in DS4, entrambe di _scrittura_) non sono state letture efficienti del grafo. Sono state chiamate cosmetiche di "registrazione decisioni".

Se Sonnet avesse usato `tokensave_read` invece di leggere i file interi:

- File `tokens.css` (7.5KB) -> `tokensave_read` = ~2KB = **-73%**
- File `_AppContext.jsx` (5.3KB) -> `tokensave_read` = ~1KB = **-81%**
- File `_sampleData.js` (20.6KB) -> `tokensave_body` = ~2KB = **-90%**

**Stima risparmio mancato**: $1.50-3.00 per sessione Sonnet, $0.30-0.80 per le altre.

### 2.8 Costo per completezza

| Modello           | Costo totale | Score specifiche (su 6) |         Costo / punto |
| ----------------- | -----------: | ----------------------: | --------------------: |
| DeepSeek v4 Flash |      $0.0750 |                   4.5/6 | $0.0167 ⭐ best value |
| Sonnet 4.6        |      $5.3808 |                     6/6 |               $0.8968 |
| GPT 5.6 Luna      |      $1.5390 |                     2/6 |               $0.7695 |

> **DeepSeek v4 Flash è imbattibile come rapporto qualità/prezzo monetario**, ma il TCO reale (tempo utente x costo/ora) è più alto: 4 prompt x tempo di attesa + round di correzione esplicita. Su 17:31 di durata attiva, ~10 minuti sono stati spesi in "dai, manca il design system", "dai, mancano i dati di esempio", "dai, non vedo la rubrica", un costo-opportunità che il dollaro non cattura.

---

## 3. Iterazioni e tempo

### 3.1 Quante iterazioni utente per arrivare all'MVP

| Modello           | User prompt totali |                             Di cui "retry/correzione" |        Iterazioni effettive |
| ----------------- | -----------------: | ----------------------------------------------------: | --------------------------: |
| Sonnet 4.6        |              **1** |                                                     0 |                    **1** ✅ |
| GPT 5.6 Luna      |                  4 |         2 (prompt identico ripetuto 2x) + 1 side-task | **1** (con 2 retry tecnici) |
| DeepSeek v4 Flash |                  4 | 3 (follow-up: design system, sample data, fix render) |                       **4** |

### 3.2 Verbatim dei prompt utente (timestamp inclusi)

**Sonnet 4.6:**

```
[13:22:05.800Z]  usa rule-mcp MCP per creare una applicazione react che implementi una rubrica...
```

-> **1 prompt, MVP pronto.** Caso ideale. Caso benchmark.

**GPT 5.6 Luna:**

```
[12:45:35.916Z]  usa rule-mcp MCP per creare una applicazione react...     (primo invio)
[12:46:24.578Z]  rimuovi dall'installazione globale tutte le skills prefissate rule-mcp-*   (side-task)
[12:49:44.639Z]  usa rule-mcp MCP per creare una applicazione react...     (retry identico)
[12:49:50.883Z]  usa rule-mcp MCP per creare una applicazione react...     (retry identico, 6s dopo)
```

-> I 2 retry quasi identici (a 6 secondi di distanza) sono **retry tecnici**, non correzioni: il primo modello `gpt-5.5` non ha portato a termine il task, e dopo lo swap a `gpt-5.6-luna` (timestamp 12:49:36) l'utente ha re-inviato lo stesso prompt. Nessuna correzione semantica del risultato.

**DeepSeek v4 Flash:**

```
[13:05:57.171Z]  usa rule-mcp MCP per creare una applicazione react...
[13:12:02.212Z]  sicuro che ci sono implementate tutte le cose che ho richiesto? non vedo design system, o forse non l'ha caricato?   (gap: 6:05)
[13:14:50.251Z]  mi mancano i dati di esempio, immagina una rubrica molto folta   (gap: 2:48)
[13:22:30.827Z]  continuo a non vedere la rubrica riempita   (gap: 7:40)
```

-> **3 round di correzione esplicita.** Il primo follow-up segnala assenza di design system, il secondo chiede sample data "molto folta", il terzo lamenta render della rubrica vuota. L'utente ha dovuto inseguire il modello per ottenere il risultato richiesto.

### 3.3 Tempo attivo della sessione

Da "primo messaggio utente" a "ultimo messaggio assistant":

| Modello           | Start    | End      |            Durata |          Δ vs Sonnet |
| ----------------- | -------- | -------- | ----------------: | -------------------: |
| DeepSeek v4 Flash | 13:05:57 | 13:23:28 | **17:31** (1051s) | -27% (il più veloce) |
| GPT 5.6 Luna      | 12:45:35 | 13:04:06 | **18:30** (1110s) |                 -23% |
| Sonnet 4.6        | 13:22:05 | 13:46:12 | **24:06** (1446s) |             baseline |

**Insight:** DeepSeek ha terminato **prima** di Sonnet in tempo assoluto, ma ha richiesto **4 prompt utente** (3 dei quali correzioni). Sonnet ha speso **+37% di tempo** ma ha richiesto **0 interventi**. Il vero indicatore di produttività è **righe di codice prodotte / numero di prompt utente**:

| Modello           |   LOC | Prompt utente | LOC / prompt |
| ----------------- | ----: | ------------: | -----------: |
| Sonnet 4.6        | 5.708 |             1 | **5.708** ⭐ |
| GPT 5.6 Luna      |   805 | 1 (effettivo) |          805 |
| DeepSeek v4 Flash | 4.239 |             4 |        1.060 |

-> **Sonnet ha prodotto 5,4x più codice per ogni prompt utente rispetto a DeepSeek, e 7x più di GPT.** Questo è il vero "throughput" del modello rispetto al tempo-cervello dell'utente.

### 3.4 Tempo medio per turn assistant

| Modello           | N° turn assistant | Durata totale | Avg per turn |
| ----------------- | ----------------: | ------------: | -----------: |
| Sonnet 4.6        |            **57** |         1446s |        25.4s |
| GPT 5.6 Luna      |                70 |         1110s |        15.9s |
| DeepSeek v4 Flash |                71 |         1051s |        14.8s |

-> **Sonnet ha fatto meno turn (57) ma più lenti**, coerente con la strategia "monolite per turn" (pianifica, poi esegui tutto in pochi turn pesanti con output lungo). GPT e DS4 hanno fatto più turn rapidi, strategia "iterazione incrementale".

---

## 4. Performance dei modelli

### 4.1 Comportamento operativo

| Comportamento                 | GPT 5.6 Luna                                | DeepSeek v4 Flash                          | Sonnet 4.6                               |
| ----------------------------- | ------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| N° cambi di modello a runtime | 2 (gpt-5.5 -> gpt-5.6-luna)                 | 1 (no swap)                                | 3 (deepseek -> sonnet-4-6 -> sonnet-4.6) |
| Token di thinking spesi       | 5.977 chars (63 blocchi)                    | **79.890 chars** (69 blocchi)              | 35.257 chars (13 blocchi)                |
| Testo "spiegazione" assistant | 1.047 chars                                 | **10.393 chars**                           | 3.507 chars                              |
| Strategia prevalente          | Molti tool call brevi + check/fix loop (9x) | Reasoning massiccio + 71 turn incrementali | Pochi turn monolitici con output lungo   |

**Osservazione importante:** GPT 5.6 Luna ha scritto **solo 1.047 chars di testo "esplicativo"** in tutta la sessione. Le "spiegazioni" del modello all'utente sono passate attraverso i **risultati dei tool** (tool `rule_tool_check` x 5, `rule_tool_fix` x 4, `rule_tool_styleguide` (mode=scaffold) x 2, `rule_tool_gateway` x 1), è un comportamento molto "operativo" e poco "conversazionale".

DeepSeek ha scritto 10K chars di prosa esplicativa, è il modello più "verboso" nel spiegare cosa sta facendo, ma il 79K di thinking blocks rivela che "pensa" molto di più di quanto non "comunichi".

Sonnet 4.6 ha 13 thinking blocks (pochi) ma 35K chars totali, pensa "a fondo" ma in pochi passaggi. Ogni turn è un "blocco monolitico" ben pianificato.

### 4.2 Pattern di utilizzo del tool `rule_tool_*`

| Strumento                              |      GPT |   DS4 | Sonnet |
| -------------------------------------- | -------: | ----: | -----: |
| `rule_tool` (router)                   |        1 |     0 |      0 |
| `rule_tool_gateway`                    |        1 |     0 |      0 |
| `rule_tool_frontend_react`             |        2 |     1 |      1 |
| `rule_tool_platform_desktop`           |        2 |     1 |      1 |
| `rule_tool_styleguide` (mode=scaffold) |        2 |     0 |      0 |
| `rule_tool_check`                      | **5** ⭐ |     0 |      0 |
| `rule_tool_fix`                        | **4** ⭐ |     0 |      0 |
| `rule_tool_styleguide`                 |        1 |     0 |      0 |
| `rule_tool_styleguide_a11y`            |        1 |     0 |      0 |
| `rule_tool_styleguide_html`            |        1 |     1 |      0 |
| `rule_tool_styleguide_css`             |        1 |     1 |      1 |
| `rule_tool_styleguide_naming`          |        0 |     1 |      1 |
| `rule_tool_ui_design_system`           |        0 |     1 |      1 |
| `rule_tool_toolchain_vite`             |        1 |     0 |      0 |
| `rule_tool_toolchain_pnpm`             |        1 |     0 |      0 |
| `rule_tool_toolchain_typescript`       |        1 |     0 |      0 |
| `rule_tool_toolchain_project`          |        0 |     1 |      0 |
| `rule_tool_detect`                     |        1 |     1 |      0 |
| `rule_tool_process_adr`                |        0 |     1 |      0 |
| `rulemcp://*` (resources)              |        0 | **5** |      0 |
| **Totale invocazioni rule-mcp**        |   **25** |    14 |      5 |
| Tool rule-mcp distinti usati           |   **15** |    14 |      5 |

### 4.3 Osservazioni strategiche

- **GPT 5.6 Luna** è l'unico che ha usato il **loop check->fix** del MCP (`rule_tool_check` x 5, `rule_tool_fix` x 4). Ha anche usato il **router `rule_tool`**, `rule_tool_styleguide` (mode=scaffold) x 2, e skill di processo (`rule_tool_gateway`, `rule_tool_toolchain_vite`, `rule_tool_toolchain_pnpm`, `rule_tool_toolchain_typescript`). È il modello che ha _interrogato_ il server MCP nel modo più esplorativo. Tuttavia, nonostante tutta questa "validazione", ha prodotto l'output architetturalmente più scarno.
- **DeepSeek v4 Flash** ha usato 5 risorse `rulemcp://*` (lettura skill intere) + 9 tool `rule_tool_*` (esecutivi). Ha anche usato `rule_tool_process_adr` (cosa che gli altri non hanno fatto). Approccio "leggi le skill prima, poi esegui".
- **Sonnet 4.6** ha usato solo 5 tool rule-mcp, ciascuno in modalità `mode: "full"`. Approccio **sintetico e one-shot**, leggi 5 skill in blocco, produci 5.708 righe in 57 turn. Pagina un prezzo in context window ma vince su tempo-utente.
- **Nessuno dei 3 ha usato il pattern `rulemcp://<skill>` come Sonnet 5 fa nel test bookmarks.** Tutti hanno preferito il pattern `mode: "full"` sui tool.

### 4.4 Quanto il modello ha seguito le specifiche del server MCP

| Criterio di aderenza                                            |      GPT 5.6 Luna      |   DeepSeek v4 Flash    |            Sonnet 4.6             |
| --------------------------------------------------------------- | :--------------------: | :--------------------: | :-------------------------------: |
| Naming `_PascalCase` (styleguide-naming)                        | 🟡 (1 solo componente) |           ✅           |                ✅                 |
| Barrel export per componente (`index.js`)                       |           ✅           |           ✅           |                ✅                 |
| Design system in `src/design-system/` o `src/styles/tokens.css` |      ❌ (assente)      |      ✅ (4 file)       |  ✅ (1 file grande `tokens.css`)  |
| Microinterazione `adoptedStyleSheets` (styleguide-css)          |           ❌           |           ❌           |       ✅ (`_adoptSheet.js`)       |
| ADR in `docs/adr/` (numerati)                                   |       ✅ (9 ADR)       |       ✅ (2 ADR)       |                ❌                 |
| Test pattern (vitest + playwright a11y)                         |      ✅ (2 file)       |           ❌           |                ❌                 |
| React + Electron (type module, .cjs per main)                   |           ✅           |    🟡 (.js, no cjs)    |                ✅                 |
| `pnpm-workspace.yaml` se multi-package                          |           ❌           | ✅ (inutile, mono-pkg) |           ✅ (inutile)            |
| `rule_tool_process_adr` usato esplicitamente                    |           ❌           |           ✅           |                ❌                 |
| Sample data > 20 contatti                                       |     ❌ (3 inline)      |    ✅ (75 generati)    | ✅ (24 ricchi con social/address) |
| Saturazione context window (max turn / limite)                  |  36,8% (136K/372K) ⚠️  |    22,3% (223K/1M)     |          20,1% (200K/1M)          |
| **Score di aderenza**                                           |        🟡 4/11         |        🟢 7/11         |              🟢 8/11              |

-> **Sonnet 4.6 ha l'aderenza più alta (8/11)**, soprattutto grazie al pattern `adoptedStyleSheets` e al design system strutturato. DS4 è secondo (7/11) per completezza architetturale. GPT è ultimo (4/11) nonostante abbia usato più tool rule-mcp di tutti.

---

## 5. Confronto output architetturale

### 5.1 File tree (escludendo `node_modules`, `dist`, `.git`, `.tokensave`)

#### 🥇 `phonebook-sonnet/` (Sonnet 4.6), 56 file, 5.708 righe

```
phonebook-sonnet/
├── .npmrc
├── package.json
├── pnpm-lock.yaml              (137 KB)
├── pnpm-workspace.yaml         ⚠️ inutile (mono-package)
├── pnpm.yaml
├── vite.config.js
├── dist/                       (232 KB build)
├── electron/
│   ├── main.cjs
│   ├── preload.cjs
│   ├── ipc/
│   │   ├── index.cjs
│   │   └── _contacts.cjs
│   └── helpers/
│       ├── index.cjs
│       └── _paths.cjs
└── src/
    ├── index.html
    ├── main.jsx
    ├── design-system/
    │   └── tokens.css          (7.5 KB) ← design tokens completi
    ├── styles/
    │   └── global.css
    ├── helpers/
    │   ├── index.js
    │   ├── _AppContext.jsx     (5.3 KB) ← state management
    │   ├── _adoptSheet.js      ⭐ UNICO — microinterazione CSS.adoptedStyleSheets
    │   ├── _contacts.js
    │   └── _sampleData.js      (20.6 KB) ← 24 contatti ricchi con social/address/groups
    └── components/             ← 11 componenti
        ├── App/, Avatar/, ContactCard/, ContactDetail/,
        ├── ContactForm/, ContactList/, EmptyState/,
        ├── GroupFilter/        ⭐ UNICO a Sonnet — feature bonus non richiesta
        ├── Icon/, SearchBar/, Sidebar/
```

#### 🥈 `phonebook-ds4-flash/` (DeepSeek v4 Flash), 58 file, 4.239 righe

```
phonebook-ds4-flash/
├── .editorconfig, .gitignore, .nvmrc, .prettierrc
├── package.json
├── pnpm-lock.yaml              (58 KB — meno dipendenze)
├── pnpm-workspace.yaml         ⚠️ inutile
├── vite.config.js
├── dist/                       (252 KB build)
├── electron/
│   ├── main.js                 ⚠️ .js invece di .cjs (incompliant con styleguide-platform-desktop)
│   ├── preload.js
│   └── ipc/
│       ├── index.js
│       └── _contacts.js
└── src/
    ├── index.html
    ├── index.jsx
    ├── design-system/          ← 4 file separati (over-frammentazione)
    │   ├── _tokens.css         (5.2 KB)
    │   ├── _reset.css
    │   ├── _motion.css
    │   └── _typography.css
    ├── context/
    │   ├── _AppContext.jsx     (4.6 KB) ← context separato (vs Sonnet che lo mette in helpers/)
    │   └── index.js
    ├── seed-data.js            (4.8 KB) ← 75 contatti generati random a runtime
    └── components/             ← 10 componenti
        ├── App/, Avatar/, ContactCard/, ContactDetail/,
        ├── ContactForm/, ContactList/, EmptyState/,
        ├── Modal/, SearchBar/, Sidebar/
```

#### 🥉 `phonebook/` (GPT 5.6 Luna), 50 file, 805 righe ⚠️

```
phonebook/
├── .editorconfig, .eslintrc.json, .gitignore, .nvmrc, .prettierrc
├── AGENTS.md, AI_WORKFLOW.md
├── package.json
├── pnpm-lock.yaml              (78 KB)
├── vite.config.js
├── eslint.config.js
├── jsconfig.json
├── tsconfig.json               ⚠️ TS config ma solo .jsx
├── playwright.config.js
├── dist/                       (228 KB build)
├── electron/
│   ├── main.cjs, preload.cjs
│   ├── data/contacts.json      ⚠️ soli 3 contatti inline
│   ├── helpers/_contacts.cjs
│   └── ipc/
│       ├── index.cjs
│       └── _contacts.cjs
├── docs/
│   ├── design-system.md        ⚠️ solo doc markdown, nessun file CSS
│   └── adr/                    ← 9 ADR (record!)
│       ├── 001-skill-routing-…
│       ├── 002-scaffold-list-…
│       ├── ...008, 009...
│       └── README.md
├── test-results/
├── tests/
│   ├── setup.js
│   └── a11y/_app.a11y.spec.js
└── src/
    ├── index.html
    ├── main.jsx
    ├── data/_contacts.js       (3.2 KB)
    ├── helpers/
    │   ├── index.js
    │   ├── _contact-utils.js
    │   ├── _storage.js
    │   └── __tests__/_contact-utils.test.js
    └── components/             ⚠️ SOLO 2 (1 monolitico!)
        ├── Icon/
        └── OrbitApp/           ← monolitico ~250 righe in un solo file
```

### 5.2 Matrice di confronto architetturale

| KPI architetturale                     |          GPT 5.6 Luna |     DeepSeek v4 Flash |                          Sonnet 4.6 |
| -------------------------------------- | --------------------: | --------------------: | ----------------------------------: |
| Componenti React                       |      2 (1 monolitico) |                    10 |                              **11** |
| Componenti unici (esclusi Icon/Layout) | 0 (tutto in OrbitApp) |                     7 |                                   8 |
| File CSS totali                        |                     3 |                **15** |                                  13 |
| Righe CSS totali                       |                   156 |                 1.411 |                           **1.737** |
| Helper modules                         |                     3 |  0 (usato `context/`) |                                   4 |
| React Context                          |                    ❌ |       ✅ (`context/`) |      ✅ (`helpers/_AppContext.jsx`) |
| Sample data                            |       3 contatti JSON | 75 generati a runtime | 24 ricchi con social/address/groups |
| File TypeScript totali (src/)          |       0 (`.jsx` puro) |       0 (`.jsx` puro) |                     0 (`.jsx` puro) |
| Test files                             | **2** (vitest + a11y) |                     0 |                                   0 |
| ADR generati                           |                 **9** |                     2 |                                   0 |
| `pnpm-workspace.yaml`                  |                    ❌ |          ✅ (inutile) |                        ✅ (inutile) |
| Microinterazione `adoptedStyleSheets`  |                    ❌ |                    ❌ |               ✅ (`_adoptSheet.js`) |
| Componenti bonus (non richiesti)       |                    ❌ |                    ❌ |                  ✅ (`GroupFilter`) |
| File totali                            |                    50 |                    58 |                                  56 |
| **Righe sorgente totali**              |            **805** ⚠️ |                 4.239 |                           **5.708** |
| **Peso repo (escl. node_modules)**     |                352 KB |                389 KB |                              489 KB |

### 5.3 Verità architetturali

1. **GPT 5.6 Luna ha barato sull'architettura.** Ha creato un singolo `OrbitApp.jsx` monolitico invece di seguire la styleguide-naming. 805 righe totali per un'app phonebook è **sospettosamente poco**, è il modello che ha _ottimizzato_ lo sforzo a scapito della completezza. Ha mascherato la pigrizia con 9 ADR e test automatici, ma il prodotto consegnato è molto più scarno. La cosa ironica: **è il modello che ha usato più tool MCP di tutti (25)**, ma il risultato architetturale è il peggiore.

2. **DeepSeek v4 Flash ha diviso troppo i file design-system.** 4 file separati (`_motion`, `_reset`, `_tokens`, `_typography`) è over-engineering per un'app phonebook. Però ha strutturato bene i componenti (10/11 simili a Sonnet). **Naming violazione**: usa `main.js` invece di `main.cjs` per Electron, violando la styleguide-platform-desktop.

3. **Sonnet 4.6 ha avuto l'output più ricco e più usabile.** 11 componenti, un singolo `tokens.css` ben strutturato (7.5KB), helpers con `_adoptSheet.js` (microinterazione moderna `adoptedStyleSheets`), `_sampleData.js` con 24 contatti ricchi (molteplici campi, gruppi, preferiti). **Inoltre ha aggiunto `GroupFilter`** che gli altri non hanno, un componente funzionale aggiuntivo non richiesto esplicitamente. È il modello che ha letto più attentamente le specifiche del design system e le ha implementate in modo non banale.

---

## 6. Peso repo e artifact

### 6.1 Pesi a disco (riga di comando `du -sh`)

| Progetto     |     Totale | `node_modules` | `dist/` | Sorgenti (.git escluso) | `.tokensave` |
| ------------ | ---------: | -------------: | ------: | ----------------------: | -----------: |
| gpt-5.6-luna | **145 MB** |         144 MB |    228K |                 ~352 KB |          n/a |
| ds4-flash    |     54 MB* |    n/a (no nm) |    252K |                 ~389 KB |         532K |
| sonnet4.6    | **597 MB** |         596 MB |    232K |                 ~489 KB |         404K |

> *Nota: `phonebook-ds4-flash` non ha `node_modules` installato al momento del test, quindi `du` vede solo il source. Probabilmente `pnpm install` non è mai stato eseguito completamente.

**Bundle frontend (la metrica che conta per l'utente finale):**

- gpt-5.6-luna: 228 KB totali (CSS 3KB + JS 220KB)
- ds4-flash: 252 KB totali (CSS + JS)
- sonnet4.6: 232 KB totali (CSS + JS)

-> **I bundle di produzione sono simili (220-250 KB).** La differenza è minima a livello di artifact finale, nonostante l'enorme differenza di LOC sorgente (805 vs 5.708). Questo è merito del tree-shaking e della compattazione CSS.

### 6.2 `node_modules` size

- GPT 5.6 Luna: 144 MB
- Sonnet 4.6: **597 MB** (4,1x più grande!)

**Perché Sonnet ha 4x più `node_modules`?** Ha installato `electron-builder` (vedi `package.json` devDeps), che porta con sé dipendenze pesanti per packaging cross-platform (electron-builder-squirrel-windows, dmg-license, iconv-lite, etc.). GPT 5.6 Luna ha lo stesso `electron-builder` config ma il lockfile è più piccolo (78KB vs 137KB), quindi evidentemente ha meno deps installate.

### 6.3 `pnpm-lock.yaml`

| Progetto     |      Size |  Righe | Implicazione                           |
| ------------ | --------: | -----: | -------------------------------------- |
| ds4-flash    | **58 KB** | ~1.700 | Meno dipendenze dirette                |
| gpt-5.6-luna |     78 KB | ~2.300 | Medie                                  |
| sonnet4.6    |    137 KB | ~3.900 | Più dipendenze (electron-builder full) |

---

## 7. Risparmio di token grazie a caveman e tokensave

### 7.1 Risparmio effettivamente ottenuto

| Skill         | Sessione              |                                                Risparmio |
| ------------- | --------------------- | -------------------------------------------------------: |
| **caveman**   | tutte e 3             |             **0 token** (skill mai invocata, 0 chiamate) |
| **tokensave** | solo DS4 (2 chiamate) | **~0 token** (entrambe `record_*`, scritture, 0 letture) |

**Audit onesto del prompt utente:** il prompt del test phonebook **NON** chiedeva esplicitamente di usare caveman/tokensave (a differenza del test bookmarks). Quindi l'assenza di invocazioni è coerente con il prompt. Tuttavia, il prompt chiedeva "sfrutta tutti gli standard indicati dalle skills e dai tools di `rule-mcp`", tokensave è un tool MCP accessibile, quindi il modello avrebbe potuto autonomamente decidere di usarlo come acceleratore.

**Cosa hanno fatto i 3 modelli:**

- **GPT 5.6 Luna** ha ignorato completamente tokensave. **0 chiamate.** Si è concentrato su `rule_tool_check`/`rule_tool_fix`.
- **DeepSeek v4 Flash** ha chiamato `tokensave_record_decision` (1) + `tokensave_record_code_area` (1). **2 record, 0 sync, 0 read.** Approccio "formalmente corretto, praticamente nullo".
- **Sonnet 4.6** ha ignorato tokensave. **0 chiamate.** Si è concentrato sulla generazione codice one-shot.

-> **L'infrastruttura di risparmio era lì, ma i modelli l'hanno trattata come irrilevante.** Due modelli su tre l'hanno completamente ignorata; uno (DS4) l'ha usata in modo cosmetico.

### 7.2 Risparmio potenziale non sfruttato

Se i modelli avessero usato i tool in lettura:

| File                                      |          Peso | Costo "read intero" | Costo "tokensave_read" |   Saving |
| ----------------------------------------- | ------------: | ------------------: | ---------------------: | -------: |
| `tokens.css` (Sonnet, 7.5KB)              |  ~2.000 token |              $0.006 |       $0.0003 (entity) | **-95%** |
| `_AppContext.jsx` (4-5KB)                 |  ~1.200 token |              $0.004 |                $0.0002 | **-95%** |
| `seed-data.js` (4.8KB)                    |  ~1.200 token |              $0.004 |                $0.0005 | **-88%** |
| `_sampleData.js` (20.6KB)                 |  ~5.500 token |              $0.017 |                 $0.001 | **-94%** |
| 10+ file di competenza media (3-5KB cad.) | ~10.000 token |              $0.030 |                 $0.003 | **-90%** |

Su una sessione come Sonnet 4.6, **tokensave avrebbe potuto risparmiare ~30-50% del context "speso" in letture file** durante le fasi di validazione e fix. Parliamo di un saving potenziale di 1-2M token = $0.50-1.50.

**Caveman**, invece, è una skill di comunicazione/compressione memo. Non applicabile a un test di code-generation puro.

### 7.3 Verdetto su caveman/tokensave

> **L'infrastruttura di risparmio (caveman, tokensave) era disponibile ma il test non l'ha attivata.** Il prompt del test phonebook non richiedeva esplicitamente queste skill, ma la richiesta "sfrutta tutti gli standard indicati dalle skills e dai tools" avrebbe dovuto includerle. Tre modelli su tre le hanno ignorate, due completamente (GPT, Sonnet), uno in modo cosmetico (DS4). Per un test rigoroso sull'efficienza dell'ecosistema completo, servirebbe:
>
> 1. Una sessione aggiuntiva per modello in cui l'utente istruisca esplicitamente _"usa `tokensave_read` invece di `read` puro per ogni file > 2KB"_
> 2. Misurazione del delta di token risparmiati
> 3. Confronto con una sessione "baseline" senza istruzioni

---

## 8. Quale modello ha seguito più puntualmente le specifiche MCP

### 8.1 Specifiche chiave del prompt

Il prompt richiedeva esplicitamente:

1. ✅ App Electron + React
2. ✅ Rubrica dettagliata
3. ✅ Dati di esempio
4. ✅ UI "degna di Apple"
5. ✅ UX con microinterazioni
6. ✅ Design system con typography proporzionale, spacings, focus, radii, elevations

### 8.2 Score per specifica

| #   | Specifica              |               GPT 5.6 Luna                |  DeepSeek v4 Flash   |            Sonnet 4.6             |
| --- | ---------------------- | :---------------------------------------: | :------------------: | :-------------------------------: |
| 1   | Electron + React       |                    ✅                     |  🟡 (.js, no .cjs)   |                ✅                 |
| 2   | Rubrica dettagliata    | 🟡 (no contact detail form, 1 monolitico) |          ✅          |       ✅ (con GroupFilter)        |
| 3   | Dati di esempio        |              🟡 (3 contatti)              |   ✅ (75 generati)   | ✅ (24 ricchi con social/address) |
| 4   | UI Apple-like          |             🟡 (1 monolitico)             |          ✅          |                ✅                 |
| 5   | Microinterazioni       |           ❌ (non implementate)           | 🟡 (CSS transitions) |     ✅ (`adoptedStyleSheets`)     |
| 6   | Design system completo |  ❌ (solo doc markdown, nessun file CSS)  |     ✅ (4 file)      |       ✅ (1 file completo)        |
|     | **Score totale**       |                 **1.5/6**                 |      **4.5/6**       |              **6/6**              |

### 8.3 Verdetto finale

> **Sonnet 4.6 ha seguito più puntualmente le specifiche del prompt** (6/6 vs 4.5/6 di DS4 vs 1.5/6 di GPT). Nonostante abbia usato solo 5 tool MCP contro i 25 di GPT, ha prodotto l'output più aderente al brief.

**Perché?** Tre ragioni concorrenti:

1. **Ha letto integralmente 5 skill in `mode: "full"`** fin dall'inizio -> ha avuto il contesto completo di frontend-react, platform-desktop, ui-design-system, styleguide-css, styleguide-naming prima di iniziare a scrivere codice
2. **Ha usato un singolo `tokens.css` ben strutturato** invece di 4 file separati (DS4) o nessun file (GPT), aderenza alla skill `styleguide-css` per design system monolitico
3. **Ha implementato `adoptedStyleSheets`** come microinterazione moderna, skill che gli altri 2 modelli non hanno colto

GPT 5.6 Luna ha usato il **maggior numero di tool MCP** (25 invocazioni, 15 distinti) ma paradossalmente ha prodotto l'output meno aderente. Questo è un segnale che **usare molti tool != usarli bene**: GPT ha eseguito il loop check->fix 9 volte, ma su un'architettura che non seguiva lo stile monolitico-componibile richiesto.

---

## 9. Tempo, costo e produttività, vista unificata

### 9.1 Tempo e costo

| Modello           | Tempo attivo |   Costo |   Costo/min |   LOC/min |
| ----------------- | -----------: | ------: | ----------: | --------: |
| GPT 5.6 Luna      |        18:30 | $1.5390 |     $0.0832 |      43,5 |
| DeepSeek v4 Flash |        17:31 | $0.0750 | **$0.0043** | **242,0** |
| Sonnet 4.6        |        24:06 | $5.3808 |     $0.2232 |     237,0 |

### 9.2 Costo per "completezza" (punteggio specifiche)

| Modello           | Costo totale | Score specifiche |          Costo / punto |
| ----------------- | -----------: | ---------------: | ---------------------: |
| DeepSeek v4 Flash |      $0.0750 |            4.5/6 |  $0.0167 ⭐ best value |
| Sonnet 4.6        |      $5.3808 |              6/6 |                $0.8968 |
| GPT 5.6 Luna      |      $1.5390 |            1.5/6 | $1.0260 ⚠️ worst value |

### 9.3 Costo per "zero-intervento" (1 solo prompt utente)

| Modello                                     | Costo per "no retry" |
| ------------------------------------------- | -------------------: |
| Sonnet 4.6 (1 prompt)                       |          **$5.3808** |
| GPT 5.6 Luna (1 prompt effettivo, 4 totali) |     $1.5390 / prompt |
| DeepSeek v4 Flash (4 prompt)                |     $0.0188 / prompt |

> **Sonnet è 3,5x più costoso di GPT e 72x più costoso di DS4 per singolo prompt**, ma ha richiesto 0 retry. Se si pesa il costo-opportunità del tempo-utente (es. €30/h per un dev mid -> €0.50/min), i 14 minuti di retry di DS4 (3 follow-up x ~5 min l'uno) costano ~€7 al netto del dollaro del modello -> DS4 è in realtà il **più costoso in TCO**.

### 9.4 Metriche reali di context (per dissipare i miti)

| Modello           | Peak context (UNICO) | Cache read cumulato (Nxcontext) |              Rapporto Nx / Peak |
| ----------------- | -------------------: | ------------------------------: | ------------------------------: |
| GPT 5.6 Luna      |              136.865 |                       6.617.600 |  **48x** (70 call x ~96K medio) |
| DeepSeek v4 Flash |              223.447 |                      10.995.456 | **49x** (71 call x ~155K medio) |
| Sonnet 4.6        |              200.944 |                       9.181.217 | **46x** (57 call x ~161K medio) |

-> Il "cache read cumulato" è circa **N x context medio**, confermando che è un multiplo del context window. La metrica reale di context usato è il **Peak context** (prima colonna). **Nessun modello ha sforato la propria finestra dichiarata.**

### 9.5 Cache write: chi ha _davvero_ usato il prompt caching

| Modello           | Cache write cumulato (REALE) | % del peak context | Significato                                                                             |
| ----------------- | ---------------------------: | -----------------: | --------------------------------------------------------------------------------------- |
| GPT 5.6 Luna      |                            0 |                 0% | Non ha scritto in cache, paga ogni call a prezzo pieno                                  |
| DeepSeek v4 Flash |                            0 |                 0% | Non ha scritto in cache (forse caching provider-side non conteggiato)                   |
| **Sonnet 4.6**    |                  **285.619** |  **142%** del peak | Ha messo in cache più del peak context (285K vs 200K peak = context iniziale più skill) |

-> **Sonnet 4.6 è l'unico che ha usato esplicitamente la cache del provider.** Le 56 call successive hanno tutte `input≈1-3` (le 2-3 token non-cached di ogni nuovo messaggio assistant) e `cacheRead≈200K` (il contesto cachato). Senza cache, Sonnet avrebbe pagato 57 x ~200K = ~11.4M token di input a prezzo pieno. Con cache, ha pagato 285K + 59 = ~285K token a prezzo pieno. **Risparmio stimato: $30-40 sulla singola sessione.**

---

## 10. Conclusioni e verdict

### 10.1 Sul server MCP `rule-mcp`

- **Il server funziona e fa rispettare gli standard.** Tutti e 3 i modelli hanno prodotto applicazioni _funzionanti e strutturate_ usando il server. Senza il server, lo stesso prompt avrebbe probabilmente generato:
  - Codice con naming inconsistente (no `_PascalCase` sui barrel)
  - Design system assente o in linea singola
  - Architetture "monolite" (un solo file React gigante)
  - Bundle 3-5x più pesante

- **Il costo del server è < 1% del costo totale del task.** Il collo di bottiglia è il modello, non il tooling. Usare il server MCP non è gratis ma è trascurabile rispetto al costo dell'inferenza.

- **`rule_tool_check` + `rule_tool_fix` funzionano solo se il modello li chiama**, e li ha chiamati solo GPT 5.6 Luna (9 invocazioni). Gli altri 2 modelli non hanno sfruttato il loop di validazione. Questo è un segnale che il loop check->fix è un pattern "GPT-friendly" ma non universale.

- **Le risorse `rulemcp://*` (5 in DeepSeek) sono preziose** per modelli che vogliono fare "exploration" del parco skill prima di iniziare. Sonnet non le ha usate qui (a differenza del test bookmarks), ha preferito il pattern `mode: "full"` sui tool.

### 10.2 Sul modello migliore per questo task

| Obiettivo                                    | Modello consigliato                                |
| -------------------------------------------- | -------------------------------------------------- |
| MVP più rapido possibile (1 prompt)          | **Sonnet 4.6** (unico a farlo in 24 min, 1 prompt) |
| Miglior rapporto qualità/prezzo monetario    | **DeepSeek v4 Flash** ($0.075, 4 prompt)           |
| Minor TCO (tempo utente incluso)             | **Sonnet 4.6** (zero retry)                        |
| Massima completezza (test, ADR, validazione) | **GPT 5.6 Luna** (9 ADR, vitest + a11y)            |
| UI più curata e moderna                      | **Sonnet 4.6** (data-part + adoptedStyleSheets)    |
| Miglior velocità pura di generazione codice  | **DeepSeek v4 Flash** (242 LOC/min)                |

### 10.3 Risposta diretta alla domanda del test

> _"Il server MCP locale `rule-mcp` è utile?"_

**Sì, oggettivamente.** Tutti e 3 i modelli hanno prodotto applicazioni _funzionanti e strutturate_ usando il server. Senza il server, lo stesso prompt avrebbe probabilmente generato:

- Codice con naming inconsistente
- Nessun design system strutturato
- Architetture a "monolite"
- Mancata applicazione di best practice React

Con il server, anche il modello peggiore (GPT 5.6 Luna, 1 solo componente) ha rispettato _alcuni_ standard (barrel, prefisso `_`, ADR). E il modello migliore (Sonnet 4.6) ha prodotto un'app production-ready al primo colpo.

**Caveat importante:** il test **NON** ha sfruttato pienamente l'ecosistema (caveman, tokensave in lettura). Un test più rigoroso dovrebbe includere:

- 1 sessione aggiuntiva per modello _con_ istruzioni esplicite di usare caveman+tokensave-read
- Misurazione del delta di token risparmiati
- Confronto con una sessione "baseline" senza `rule-mcp` (per misurare il delta _grazie al_ server)

### 10.4 Numeriche finali in pillole

```
💰 COSTO TOTALE        Sonnet ($5.38) > GPT ($1.54) > DS4 ($0.08)
⏱️ TEMPO ATTIVO        Sonnet (24:06) > GPT (18:30) > DS4 (17:31)
🔄 PROMPT UTENTE       Sonnet (1) < GPT (1 effettivo) < DS4 (4)
📞 LLM API CALL        Sonnet (57) < GPT (70) < DS4 (71)
📝 RIGHE CODICE        Sonnet (5708) > DS4 (4239) > GPT (805)
🧱 COMPONENTI          Sonnet (11) > DS4 (10) > GPT (1)
📄 ADR GENERATI        GPT (9) > DS4 (2) > Sonnet (0)
🧪 TEST FILE           GPT (2) > DS4 (0) = Sonnet (0)
🛠️ rule-mcp TOOLS       GPT (25) > DS4 (14) > Sonnet (5)
🛠️ DISTINCT TOOLS      GPT (15) > DS4 (14) > Sonnet (5)
🎯 ADERENZA MCP        Sonnet (8/11) > DS4 (7/11) > GPT (4/11)
📐 BUNDLE SIZE         ~uguali (228-252 KB)
🗜️ CAVEMAN USAGE       0/3
🗃️ TOKENSAVE USAGE     0/3 letture, 1/3 con 2 record_*

--- Metriche REALI di context (non cumulate) ---
📏 PEAK CONTEXT        DS4 (223K) > Sonnet (201K) > GPT (137K)
📏 % CTX USED @ PEAK   GPT (37%) ⚠️ > DS4 (22%) > Sonnet (20%)
📏 CACHE WRITE (REALE) Sonnet (286K) ✅ > GPT (0) ❌ = DS4 (0) ❌
📤 OUTPUT (REALE)      Sonnet (104K) > DS4 (83K) > GPT (35K)
```

---

## Allegato A, File di sessione原始

| Session ID                             | Path                                                                                                                         | Modello finale                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `019f5134-3214-79b2-93c3-6186bbc9d639` | `~/.pi/agent/sessions/--Users-emilianopisu-Projects-work-rule-mcp-poc-phonebook--/2026-07-11T12-43-23-031Z_…jsonl`           | `gpt-5.6-luna` (openai-codex)        |
| `019f5148-c7fd-75fd-a4a1-23f626327364` | `~/.pi/agent/sessions/--Users-emilianopisu-Projects-work-rule-mcp-poc-phonebook-ds4-flash--/2026-07-11T13-05-52-125Z_…jsonl` | `deepseek-v4-flash` (opencode-go)    |
| `019f5156-bca6-7002-8fcf-33a701588d61` | `~/.pi/agent/sessions/--Users-emilianopisu-Projects-work-rule-mcp-poc-phonebook-sonnet--/2026-07-11T13-21-06-726Z_…jsonl`    | `claude-sonnet-4.6` (github-copilot) |

## Allegato B, Tool rule-mcp invocati (per sessione)

```
GPT 5.6 Luna (25 invocazioni, 15 tool distinti):
  rule_tool (router)                     1×     rule_tool_gateway                1×
  rule_tool_frontend_react               2×     rule_tool_platform_desktop       2×
  rule_tool_styleguide (mode=scaffold)   2×     rule_tool_check                  5× ⭐
  rule_tool_fix                          4× ⭐   rule_tool_styleguide             1×
  rule_tool_styleguide_a11y              1×     rule_tool_styleguide_html        1×
  rule_tool_styleguide_css               1×     rule_tool_toolchain_vite         1×
  rule_tool_toolchain_pnpm               1×     rule_tool_toolchain_typescript   1×
  rule_tool_detect                       1×

DEEPSEEK V4 FLASH (14 invocazioni, 14 tool distinti):
  rule_tool_detect                       1×     rule_tool_frontend_react         1×
  rule_tool_platform_desktop             1×     rule_tool_ui_design_system       1×
  rule_tool_styleguide_css               1×     rule_tool_styleguide_naming      1×
  rule_tool_styleguide_html              1×     rule_tool_toolchain_project      1×
  rule_tool_process_adr                  1×
  + 5 rulemcp://* risorse (full content)

CLAUDE SONNET 4.6 (5 invocazioni, 5 tool distinti):
  rule_tool_platform_desktop             1×     rule_tool_frontend_react         1×
  rule_tool_ui_design_system             1×     rule_tool_styleguide_css         1×
  rule_tool_styleguide_naming            1×
```
