# Handoff Fase 7 — Installer, uninstaller, configurazioni

**Per:** deepseek-v4-flash  
**Da:** gpt-5.6-sol (audit + remediation fasi 1-6)  
**Data:** 2026-07-15  
**File interessati:** `src/cli/install.js`, `src/cli/skills-install.js`, `scripts/install.sh`

---

## Contesto (cosa è già stato risolto)

Nelle fasi 1-6 sono stati corretti: file-system safety, SSE auth, MCP protocol, build/CI, guardrail parser, router domain-aware, gateway deterministico, template conformi.

**NON è stato toccato l'installer.** Tutti i bug riportati nell'audit sono ancora presenti.

---

## Cosa fare

### 7.1 — Installer lossless e idempotente (`src/cli/install.js`)

**Problema:** `parseJson()` a riga 137 trasforma JSON malformato in `{}`, cancellando silenziosamente la configurazione utente. `backupFile()` esiste ma non viene mai chiamato.

**Fix:**

```js
// src/cli/install.js — parseJson deve fallire, non restituire {}
const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  } // null = errore
};

// Ogni upsert deve:
// 1. Fare backup prima di scrivere: backupFile(file)
// 2. Scrivere atomicamente: writeFileSync(tmp) + renameSync(tmp, target)
// 3. Se parseJson restituisce null, ABORTIRE con errore, non sovrascrivere
```

**Verifica:** `pnpm test` + test manuale: `node bin/rule-mcp.js install --agent claude --force --dry-run` non deve corrompere file corrotti.

### 7.2 — `skills install --all` non-interattivo (`src/cli/skills-install.js`)

**Problema:** `--all` chiama `setRawMode()` anche quando stdin non è TTY → crash. `copySkill()` duplica i path perché `parentPath` è già assoluto su Node 24.

**Fix:**

```js
// Se !process.stdin.isTTY && selectAll → installazione batch, no UI
// copySkill: usare entry.parentPath ?? source (parentPath è già assoluto)
```

### 7.3 — Rimuovere raccolta API key dall'installer shell (`scripts/install.sh`)

**Problema:** L'installer shell raccoglie API key OpenAI/Anthropic, le scrive in `.bashrc`/`.zshrc` senza escaping, e salva copia in `~/.config/rule-mcp/openai-key` senza `chmod 600`.

**Fix:** Rimuovere completamente la Phase 5 (Model Provider Configuration) da `scripts/install.sh`. Il server MCP non usa chiavi API. Se servono per l'utente, usare `read -s` (silent) e keychain.

### 7.4 — Uninstaller path matching (`src/cli/uninstall.js`, `src/cli/install.js`)

**Problema:** L'uninstaller usa mapping generici che non coincidono con i path/config speciali usati dall'installer (es. VS Code usa `servers` non `mcpServers`, Codex ha path diversi).

**Fix:** Verificare che ogni agente abbia install/uninstall/test round-trip coerente. I 23 agenti devono sopravvivere a `install → reinstall → uninstall` senza perdere configurazioni preesistenti.

---

## Comandi di verifica

```bash
# Smoke test
pnpm test

# Installer test (esistente)
node test/agent-commands-install.test.mjs

# Test round-trip manuale per ogni agente
node bin/rule-mcp.js install --agent claude --force
node bin/rule-mcp.js install --agent claude --force  # reinstall idempotente
node bin/rule-mcp.js uninstall --agent claude
```

---

## Pitfalls

- Non toccare `src/cli/install.js` funzioni `installPi`, `installCodex` — sono usate dall'installer automatico
- `backupFile` restituisce il path del backup, non scrive automaticamente
- Su macOS, `~/.claude.json` è il file config di Claude Desktop, non Claude Code
- L'installer `--global` richiede `rule-mcp` installato globalmente
