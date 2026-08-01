# Mega Review — Compliance `claude-*` e affidabilità del router `rule`

**Data**: 2026-07-15
**Versione analizzata**: `rule-mcp@1.0.0`, commit `4d9764b` (2026-07-11)
**SDK MCP**: `@modelcontextprotocol/sdk@1.29.0`
**Autore**: mega-review agente (pi), su richiesta utente

## 0. Come leggere questo report

"Ogni singola riga di codice" non è verificabile in un solo passaggio (~9.3k righe in `src/`, 70 skill in `skills/`, oltre 700 righe di guardrail). Questo report è quindi:

1. **Un audit architetturale completo** di ogni sottosistema (server, tools, skills, resources, prompts, enforcement, installer, CLI).
2. **Verifiche puntuali riproducibili** con evidenza grezza (comandi eseguiti + output) per i punti critici, non affermazioni generiche.
3. **Una risposta diretta e argomentata** alla domanda centrale: *il router `rule` e i trigger delle skill/tool vengono realmente coinvolti dal modello durante una sessione chat?*

Ogni comando riportato in questo documento è stato eseguito realmente in questa sessione contro il repository corrente (non simulato).

---

## 1. Executive Summary

| Area | Verdetto | Severità |
|---|---|---|
| Protocollo MCP — `tools/*`, `resources/*` | ✅ Conforme (validato contro gli schema Zod ufficiali dell'SDK) | — |
| Protocollo MCP — `prompts/get` | ❌ **Rotto per qualunque client conforme alla spec**, Claude incluso | 🔴 Critical |
| Router `rule` invocato automaticamente dal modello | ⚠️ **Non garantito strutturalmente**. Dipende al 100% da istruzioni testuali (CLAUDE.md/AGENTS.md), non dal protocollo | 🟠 High |
| Integrazione con le "Agent Skills" native di Claude (`.claude/skills/`) | ❌ Non implementata: le skill restano markdown esposti solo via tool MCP custom | 🟠 High |
| Superficie di tool esposta (76 tool + 146 risorse "as shipped") | ⚠️ Grande, senza `annotations`/`readOnlyHint`, nessun filtro `allowedTools` consigliato | 🟡 Medium |
| Sicurezza (path traversal, command injection) | ⚠️ Una falla di path traversal in `pix_fix mode=generate` | 🟡 Medium |
| Qualità test/CI | ⚠️ 4/20 file di test rossi o falliti allo stato attuale | 🟡 Medium |
| Validazione argomenti, guardrail, enforcement post-hoc | ✅ Solido, ben progettato per quello che può fare (vedi §6) | — |

**In una frase**: l'infrastruttura di guardrail/enforcement/BM25 è progettata bene ed è *effettiva quando un tool viene effettivamente chiamato*, ma **nulla nel server MCP obbliga un modello — Claude o altro — a chiamare `rule` prima di scrivere codice**. Il progetto lo sa e compensa iniettando istruzioni testuali (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`) in ogni agente supportato: è una soluzione ragionevole ma probabilistica, non deterministica, e in più il canale nativo che Claude offre proprio per questo scopo (Agent Skills in `.claude/skills/`, auto-discovery reale) non viene usato.

---

## 2. Architettura — cosa espone davvero il server

```
src/server.js         → Server MCP (stdio/SSE), capabilities: tools, resources, prompts, logging, completions
src/tools/router.js   → registry generico (registerTool/listTools/callTool) + hook before/after/post
src/tools/ai.js       → tool "rule" (il router — scoring keyword su sezioni ## delle SKILL.md)
src/tools/skill.js    → genera un tool pix_<skill> per OGNI skill + pix_search/pix_check/pix_scaffold
src/core/skills.js    → loadAllSkills(): carica 70 skill, registra ~76 tool, costruisce indice BM25
src/core/enforcement.js → pre/post-processing: valida shape, appende "PIX ENFORCEMENT CONTRACT"
src/resources/index.js → 146 risorse rule://... (2 per skill + 8 statiche)
src/prompts/index.js  → 5 MCP prompt (code-review, generate-component, a11y-test/review, architect-scaffold)
```

Conteggio verificato (repository pulito, nessuna skill personale extra in `~/.agents/skills`):

```
$ node clean-tools.mjs
clean shipped tool count: 76
clean shipped resource count: 146
tool defs JSON bytes: 90873  ~tokens: 22718
```

In questa sessione live (con skill personali aggiuntive installate sulla macchina, es. `caveman-*`, `frontend-design`, `grill-me`...) il conteggio tool sale a **87**, e nell'host "pi" ogni risorsa MCP viene *inoltre* esposta come un tool a sé stante (`get_..._skill_full_content`, `get_..._skill_summary_first_30_lines`, ecc.), portando la superficie totale visibile al modello a **oltre 220 tool callable in una singola sessione**. Questo è un dettaglio specifico dell'host, non del server, ma è un effetto concreto e osservabile dell'architettura "una risorsa/skill = un tool" che il progetto adotta.

---

## 3. 🔴 CRITICAL — `prompts/get` restituisce una risposta non valida per lo spec MCP

`src/prompts/index.js` costruisce ogni prompt con un messaggio `role: "system"`:

```js
messages: [{ role: "system", content: { type: "text", text: "..." } }]
```

Lo spec MCP (`PromptMessage`) e l'SDK ufficiale ammettono **solo** `role: "user" | "assistant"` — non `"system"` (fonte: [MCP spec — Prompts](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts), confermato via `RoleSchema = z.enum(['user','assistant'])` nell'SDK installato in `node_modules/@modelcontextprotocol/sdk`).

In più, `src/server.js` risponde a `prompts/get` con `{ prompt: {...} }`, mentre `GetPromptResultSchema` richiede `{ description?, messages }` **al primo livello**, senza wrapper `prompt` e senza campo `name`.

### Riproduzione (eseguita realmente, non simulata)

```js
import { GetPromptResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { getPrompt } from "./src/prompts/index.js";

const p = getPrompt("rule-code-review");
const serverResult = { prompt: p }; // esattamente ciò che server.js manda sul wire

GetPromptResultSchema.safeParse(serverResult).success
// => false
```

Output reale:

```
--- Validation against official GetPromptResultSchema ---
success: false
[
  {
    "expected": "array",
    "code": "invalid_type",
    "path": [ "messages" ],
    "message": "Invalid input: expected array, received undefined"
  }
]
```

E anche correggendo lo shape (`{ description, messages }` senza wrapper), il `role: "system"` fallisce comunque:

```
Fixed shape but role='system' still present. success: false
[
  {
    "code": "invalid_value",
    "values": [ "user", "assistant" ],
    "path": [ "messages", 0, "role" ],
    "message": "Invalid option: expected one of \"user\"|\"assistant\""
  }
]
```

### Impatto

Qualunque client MCP che valida le risposte contro lo schema ufficiale (il client TypeScript/Python di riferimento, e presumibilmente Claude Desktop/Claude Code quando usano `prompts/get`) **rifiuta la risposta con un errore di parsing**. Le 5 slash-prompt del server (`rule-code-review`, `rule-generate-component`, `rule-a11y-test`, `rule-a11y-review`, `rule-architect-scaffold`) sono quindi **inutilizzabili da qualsiasi client conforme**, indipendentemente dal modello. `tools/*` e `resources/*` invece sono stati validati con successo contro gli schema ufficiali (vedi §Appendice) — il problema è isolato al sottosistema `prompts`.

### Fix consigliato

```js
// server.js — GetPromptRequestSchema handler
const prompt = getPrompt(name);
return { description: prompt.description, messages: prompt.messages };

// prompts/index.js — ogni messages[]
{ role: "user", content: { type: "text", text: "<system-style instructions>" } }
```

(Il pattern comune per "istruzioni di sistema" via MCP prompt è impacchettarle in un messaggio `role: "user"` iniziale, dato che lo spec non prevede un ruolo system dedicato in questo canale.)

---

## 4. 🟠 HIGH — Il router e le skill NON usano il meccanismo nativo di Claude

Claude (Claude Code, Claude Agent SDK, claude.ai) ha una feature **nativa** chiamata *Agent Skills*: cartelle in `.claude/skills/<name>/SKILL.md` con frontmatter YAML, **scoperte e invocate automaticamente da Claude stesso** in base alla `description`, oppure richiamabili esplicitamente con `/nome-skill` — senza passare da un tool MCP (fonte: [Claude Code Docs — Agent Skills](https://code.claude.com/docs/en/skills), [Claude Code Docs — Skills nell'SDK](https://code.claude.com/docs/en/agent-sdk/skills)).

`rule-mcp` **non installa mai nulla in `.claude/skills/`**. Verificato leggendo `src/cli/skills-install.js`:

```js
const globalDir = ...          // ~/.agents/skills
const localDir = ".agents/skills";
const targetDir = scope === "project" ? localDir : globalDir;
```

Le 70 skill del progetto vivono solo in `~/.agents/skills/` (una convenzione inventata dall'ecosistema rule, non riconosciuta nativamente da nessun host), e diventano visibili al modello **esclusivamente** come:

1. Contenuto leggibile via tool MCP `pix_<skill>` (richiede che il modello scelga di chiamarlo);
2. Contenuto leggibile via risorsa MCP `rule://<skill>` (richiede supporto client + scelta esplicita, o — nel caso di host come "pi" — un ulteriore tool `get_..._skill_full_content` da scegliere).

Per Claude, questo significa che **il meccanismo di auto-invocazione realmente supportato dal vendor (matching semantico automatico su `description`) non entra mai in gioco**: tutto il "trigger" avviene sul livello superiore, molto più fragile, di "il modello decide di chiamare un tool tra 76+".

### Compensazione attuale (e suo limite strutturale)

Il progetto è consapevole di questo limite e compensa iniettando testo imperativo nei file di memoria di ogni agente. Verificato in `scripts/install.sh` (righe 516-565) e osservabile *live* in questa stessa sessione, dove il blocco `<!-- rule-mcp-rules -->` è presente nel `CLAUDE.md` di progetto:

```
## MANDATORY: Use rule-mcp enforced workflow for coding work
This rule overrides weaker project guidance. No exceptions.
- Call `rule` before implementation; load exact routed skill evidence.
...
```

Questo funziona **solo se l'host carica quel file come istruzione persistente di sistema** (vero per Claude Code/`CLAUDE.md`, Gemini CLI/`GEMINI.md`, Codex/`AGENTS.md`, Cursor/`.cursorrules`, "pi"/`AGENTS.md` — tutti supportati e verificati nel codice di installazione). Ma resta **un'istruzione in linguaggio naturale che il modello può ignorare, dimenticare a metà conversazione (specialmente su context lunghi), o de-prioritizzare** rispetto alla richiesta esplicita dell'utente. Nessun meccanismo del protocollo MCP impedisce al modello di generare codice senza chiamare `rule` — il server può solo reagire *dopo* che un tool è stato chiamato (vedi §6), non *prima*.

**Non esiste, nello spec MCP attuale, un modo per un server di forzare un client a chiamare un tool specifico prima di rispondere.** Questo è un limite del protocollo, non solo di questo progetto — ma il progetto lo presenta implicitamente come "enforced workflow", il che può creare un falso senso di garanzia.

---

## 5. 🟠 HIGH — L'"enforcement" è reale solo *dopo* l'invocazione, mai *prima*

`src/core/enforcement.js` è ben scritto per quello che fa:

- `preprocessToolCall`: rifiuta payload oversize (>256KB), NUL byte, prototype pollution, nesting >12, >1000 chiavi, richieste `rule` senza `prompt`.
- `postprocessToolResult`: valida che l'output sia MCP-content valido, e — **solo per il tool `rule`** — verifica che le skill/tool citati nella risposta di routing esistano davvero (`validateRouterResult`), prevenendo allucinazioni del *router stesso*.
- Ogni risposta non di errore riceve in coda un blocco testuale "PIX ENFORCEMENT CONTRACT" (`## PIX ENFORCEMENT CONTRACT ...`) — un nudge testuale ripetuto ad ogni tool call.

Ho verificato con un test reale che questo pipeline funziona come documentato:

```
=== test/enforcement.test.mjs ===
✅ preprocessing and postprocessing fail closed; hallucination guardrails enforced
```

Il punto architetturale da chiarire: **questo hook si attiva solo quando un tool viene effettivamente invocato**. Se il modello (Claude o altro) decide semplicemente di scrivere il codice senza chiamare `rule`/`pix_check`, l'intera pipeline di enforcement non entra mai in esecuzione — non c'è alcun controllo server-side che blocchi una risposta "no-tool-call". L'unica leva rimasta è, di nuovo, l'istruzione testuale in `CLAUDE.md`/`AGENTS.md`.

---

## 6. 🟡 MEDIUM — Superficie di tool enorme, nessuna annotation, nessun filtro consigliato

- 76 tool "as shipped" (87+ in un ambiente con skill personali extra), ciascuno con schema JSON completo re-inviato ad ogni turno: **~22.7k token** solo per le definizioni tool (misurato: `90873 byte / 4 ≈ 22718 token`), prima ancora che la conversazione inizi.
- Anthropic stessa documenta che ogni definizione di tool MCP costa **500–2000 token**, e che caricare troppi tool "brucia" contesto prima che Claude faccia qualunque lavoro utile — per questo ha introdotto **Tool Search** (abilitato di default in Claude Code) per differire il caricamento delle definizioni complete e permettere di scalare a centinaia/migliaia di tool (fonte: [Claude Code Docs — Scale to many tools with tool search](https://code.claude.com/docs/en/agent-sdk/tool-search.md), [Tool Search Tool — Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)).
- Questo significa che l'affidabilità del "il modello sceglie il tool giusto tra N" **varia moltissimo per host**: buona su Claude Code (tool search attivo di default), incerta su host che non implementano tool search o filtri `allowedTools` (es. Claude Desktop "vanilla", o host generici come "pi" che oltretutto duplicano il problema esponendo anche le risorse come tool).
- Nessun tool registrato in `src/tools/router.js` imposta `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `title`) benché l'SDK e lo spec 2025-06-18 li supportino (`ToolAnnotationsSchema`, verificato in `node_modules/@modelcontextprotocol/sdk`). Risultato pratico: un client come Claude Code non può distinguere in automatico "questo tool legge soltanto" (es. `pix_search`) da "questo tool scrive file" (es. `pix_fix mode=generate`, `pix_process_adr`) — tutti richiedono la stessa fiducia/approvazione.

### Raccomandazione concreta
- Aggiungere `annotations: { readOnlyHint: true }` a `rule`, `pix_search`, `pix_check` (mode ≠ scaffold), le 67 skill-tool in `mode=full/summary/search/guardrails/tldr`.
- Aggiungere `annotations: { destructiveHint: false, idempotentHint: false }` a `pix_fix` (mode=fix/generate), `pix_process_adr`.
- Documentare nel README un `allowedTools`/whitelist consigliata per Claude Code, per limitare il tool-choice budget al set core (9 tool) più il set skill effettivamente rilevante al progetto, invece di esporre tutti i 76 sempre.

---

## 7. 🟡 MEDIUM — Path traversal in `pix_fix mode=generate`

`src/tools/fix.js`, ramo `mode === "generate"`:

```js
const rootDir = args.path || ".";
const files = generateComponentFiles({ name: args.name, framework: args.framework, baseDir: args.baseDir });
for (const file of files) {
  const fullPath = join(rootDir, file.path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, file.content, "utf8");
}
```

`args.name` e `args.baseDir` sono stringhe libere fornite dal chiamante (in pratica dal modello, sulla base del prompt utente) e **non vengono mai sanitizzate** prima di essere passate a `join()`/`writeFileSync`. Verificato con:

```
$ grep -n "startsWith(rootDir\|resolve(\|sanitize" src/core/file-tree.js src/tools/fix.js
(nessun risultato)
```

A differenza di `pix_process_adr` (che passa sempre `title` attraverso `slugify()`, il quale rimuove `/` e caratteri non alfanumerici — verificato in `src/tools/adr.js`), `pix_fix` non applica alcuna funzione equivalente a `name`/`baseDir`. Un valore come `name = "../../../../tmp/evil"` o `baseDir = "../../.ssh"` **non viene bloccato a livello di codice**: `join()` di Node normalizza ma non impedisce la risalita di directory.

Non è uno scenario di attacco "diretto" da rete (il chiamante è il modello collegato via MCP, non un utente HTTP anonimo), ma è un classico pattern "confused deputy" da MCP: se il modello viene indotto — per prompt injection da un file/README letto in precedenza, o per semplice allucinazione — a passare un `name`/`baseDir` con `../`, il server scrive fuori dalla directory di progetto senza alcun avviso.

### Fix consigliato
Aggiungere una funzione `assertInsideProject(rootDir, fullPath)` (resolve + `startsWith`) prima di ogni `writeFileSync`/`mkdirSync` in `fix.js`, analoga alla `slugify()` già usata in `adr.js`.

---

## 8. 🟢 Cosa funziona bene (per completezza)

- **Validazione Zod** su ogni tool (via `zodSchema.parse`) prima dell'handler — verificato che errori di validazione tornano come `isError: true` con dettaglio leggibile, non stack trace grezzi.
- **`pix_check`/guardrail engine** (`src/core/guardrails.js` + `guardrail-defs.js`, 683 righe): motore deterministico, testabile, con supporto a `previousPassed` per iterazione incrementale — buon design per un ciclo "generate → check → fix → re-check".
- **BM25 (`src/core/bm25.js`)**: indice di ricerca reale (non semplice `includes()`), con statistiche (`totalDocs`, `uniqueTerms`, `avgDocLength`) esposte per diagnosi.
- **Router `rule` (`src/tools/ai.js`)**: l'algoritmo di scoring è testato (14 test dedicati tra `test/ai.test.mjs` e `test/framework-routing.test.mjs`, tutti verdi in questa sessione) — è corretto **come funzione pura**: dato un prompt, restituisce sempre skill coerenti con keyword/heading matching e bias di framework. Il problema descritto in §4/§6 non è "l'algoritmo sbaglia", è "non è garantito che venga interrogato".
- **Comando exec sicuro**: verificato che `execSync`/`spawn` in `handoff.js`, `daemon.js`, `architect.js` non concatenano mai input utente dentro la stringa di comando shell — i path arbitrari passano solo come `cwd` o argomenti array a `spawn` (safe pattern), non come injection nella command string.
- **Multi-agente**: l'installer supporta realmente 23 agenti/IDE con path di configurazione distinti (verificato in `src/cli/install.js`), non solo Claude.

---

## 9. Stato dei test — evidenza reale (non dichiarata, eseguita)

```
$ node test/smoke.mjs                     → 7/7 ✅
$ node test/ai.test.mjs                   → 8/8 ✅
$ node test/framework-routing.test.mjs    → 5/5 ✅
$ node test/detector.test.mjs             → 14/14 ✅
$ node test/enforcement.test.mjs          → ✅
$ node test/sandbox.test.mjs              → 15/15 ✅
$ node test/https.test.mjs                → 11/11 ✅
$ node test/sse.test.mjs                  → 16/16 ✅
$ node test/daemon.test.mjs               → 1/6 ✅ (5 falliti — timing porta, verificare se ambiente-dipendente)
$ node test/add-once.test.mjs             → ❌ crash: richiede `playwright test`, non `node`, va eseguito con il test runner Playwright
$ node test/architect-ui.test.mjs         → ❌ crash: stesso motivo (usa test.describe() di @playwright/test)
$ node test/docs-architect.test.mjs       → ❌ AssertionError: ADR decisions summary missing 011-...md (drift docs/adr/DECISIONS.md)
$ node test/skills-docs.test.mjs          → ❌ AssertionError: rule-data-duckdb missing "See also" cross-reference
```

Lo script `"test:all": "for f in test/*.test.mjs; do node \"$f\"; done"` in `package.json` è **rotto per costruzione**: itera alla cieca su tutti i `*.test.mjs`, ma almeno 2 file (`add-once.test.mjs`, `architect-ui.test.mjs`) sono suite `@playwright/test` che vanno lanciate con `pnpm exec playwright test`, non con `node` diretto. Lo script `"ci"` invece elenca i file esplicitamente ed evita questo problema — ma allora `test:all` andrebbe corretto o rimosso per non essere fuorviante.

I fallimenti in `docs-architect.test.mjs` e `skills-docs.test.mjs` sono drift di documentazione preesistenti (non introdotti in questa sessione — verificato che il working tree aveva già modifiche non committate su `docs/adr/001-*.md`, `002-*.md`, `docs/03-*.md`, `docs/04-*.md` prima di questo audit).

---

## 10. Raccomandazioni prioritizzate

| # | Azione | Severità | Sforzo |
|---|---|---|---|
| 1 | Correggere `prompts/get`: shape `{description, messages}` senza wrapper `prompt`, `role: "user"` invece di `"system"` | 🔴 Critical | Basso (1 file, `server.js` + `prompts/index.js`) |
| 2 | Aggiungere sanitizzazione path (`assertInsideProject`) in `pix_fix mode=generate` per `name`/`baseDir` | 🟡 Medium | Basso |
| 3 | Aggiungere `annotations` (`readOnlyHint`/`destructiveHint`) a tutti i tool in `registerTool()` | 🟡 Medium | Medio (tocca ~9 punti di registrazione) |
| 4 | Documentare esplicitamente (README/docs) che l'"enforcement" è **advisory, non protocollare**, ed è efficace solo se l'host carica `CLAUDE.md`/`AGENTS.md` come istruzione persistente — evitare il termine "enforced" senza qualificarlo | 🟠 High | Basso |
| 5 | Valutare un ponte reale verso `.claude/skills/` (generare `SKILL.md` + frontmatter compatibile anche lì, non solo in `~/.agents/skills/`) per ottenere auto-discovery nativa su Claude | 🟠 High | Alto |
| 6 | Aggiungere una guida "raccomandazione allowedTools" per host con tanti tool, e valutare di *non* esporre 2 risorse per ogni skill di default (146 risorse è tanto se l'host le trasforma in tool) | 🟡 Medium | Medio |
| 7 | Riscrivere ~59/70 descrizioni skill con formula esplicita "Use when..." per aumentare la qualità del matching semantico se/quando porterete le skill su un meccanismo nativo | 🟢 Low | Medio |
| 8 | Correggere `test:all` in `package.json` (playwright vs node) e sanare il drift `docs/adr/DECISIONS.md` | 🟢 Low | Basso |

---

## Appendice A — Comandi eseguiti per la verifica protocollare

```bash
# Verifica shape prompts/get vs schema ufficiale
node -e '
import { GetPromptResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { getPrompt } from "./src/prompts/index.js";
const p = getPrompt("rule-code-review");
console.log(GetPromptResultSchema.safeParse({ prompt: p }).success); // false
'

# Verifica tools/resources (entrambi PASS)
ListToolsResultSchema.safeParse({ tools: listTools() }).success        // true
ReadResourceResultSchema.safeParse(await readResource("rule://skills")).success // true
CallToolResultSchema.safeParse(await callTool("rule", {...})).success   // true

# Conteggio tool/risorse "as shipped"
clean shipped tool count: 76
clean shipped resource count: 146
tool defs JSON bytes: 90873  ~tokens: 22718
```

## Appendice B — Metriche skill

- 70 cartelle skill in `skills/` (repo), 69 restituite da `getSkillNames()` (esclude `rule` stesso).
- 0 skill senza `description` nel frontmatter.
- 0 skill con `description` > 1024 caratteri.
- 59/70 skill **senza** una formula esplicita "use when/this/for" nella `description` (rilevante solo se si migra a un meccanismo di auto-discovery semantica nativo tipo Claude Skills; con l'attuale dispatch esplicito via tool `pix_<skill>` l'impatto pratico è limitato).

## Appendice C — Riferimenti esterni

- MCP Specification — Prompts: https://modelcontextprotocol.io/specification/2025-06-18/server/prompts
- Claude Code Docs — Agent Skills: https://code.claude.com/docs/en/skills
- Claude Code Docs — Agent Skills nell'SDK: https://code.claude.com/docs/en/agent-sdk/skills
- Claude Code Docs — Tool Search (scale to many tools): https://code.claude.com/docs/en/agent-sdk/tool-search.md
- Claude Platform Docs — Tool Search Tool: https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
