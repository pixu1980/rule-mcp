# Handoff Phase 7 - Installer, uninstaller, configurations

**To:** deepseek-v4-flash  
**From:** gpt-5.6-sol (audit + remediation phases 1-6)  
**Date:** 2026-07-15  
**Files affected:** `src/cli/install.js`, `src/cli/skills-install.js`, `scripts/install.sh`

---

## Context (what was already resolved)

In phases 1-6 the following were fixed: file-system safety, SSE auth, MCP protocol, build/CI, guardrail parser, domain-aware router, deterministic gateway, compliant templates.

**The installer was NOT touched.** All bugs reported in the audit are still present.

---

## What to do

### 7.1 - Lossless and idempotent installer (`src/cli/install.js`)

**Problem:** `parseJson()` at line 137 transforms malformed JSON into `{}`, silently wiping user configuration. `backupFile()` exists but is never called.

**Fix:**

```js
// src/cli/install.js - parseJson must fail, not return {}
const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  } // null = error
};

// Every upsert must:
// 1. Backup before writing: backupFile(file)
// 2. Write atomically: writeFileSync(tmp) + renameSync(tmp, target)
// 3. If parseJson returns null, ABORT with error, don't overwrite
```

**Verification:** `pnpm test` + manual test: `node bin/rule-mcp.js install --agent claude --force --dry-run` must not corrupt corrupted files.

### 7.2 - `skills install --all` non-interactive (`src/cli/skills-install.js`)

**Problem:** `--all` calls `setRawMode()` even when stdin is not a TTY → crash. `copySkill()` duplicates paths because `parentPath` is already absolute on Node 24.

**Fix:**

```js
// If !process.stdin.isTTY && selectAll → batch install, no UI
// copySkill: use entry.parentPath ?? source (parentPath is already absolute)
```

### 7.3 - Remove API key collection from shell installer (`scripts/install.sh`)

**Problem:** The shell installer collects OpenAI/Anthropic API keys, writes them to `.bashrc`/`.zshrc` without escaping, and saves a copy in `~/.config/rule-mcp/openai-key` without `chmod 600`.

**Fix:** Completely remove Phase 5 (Model Provider Configuration) from `scripts/install.sh`. The MCP server doesn't use API keys. If needed by the user, use `read -s` (silent) and keychain.

### 7.4 - Uninstaller path matching (`src/cli/uninstall.js`, `src/cli/install.js`)

**Problem:** The uninstaller uses generic mappings that don't match the special paths/configs used by the installer (e.g. VS Code uses `servers` not `mcpServers`, Codex has different paths).

**Fix:** Verify that every agent has a consistent install/uninstall/test round-trip. All 23 agents must survive `install → reinstall → uninstall` without losing pre-existing configurations.

---

## Verification commands

```bash
# Smoke test
pnpm test

# Installer test (existing)
node test/agent-commands-install.test.mjs

# Manual round-trip test for each agent
node bin/rule-mcp.js install --agent claude --force
node bin/rule-mcp.js install --agent claude --force  # idempotent reinstall
node bin/rule-mcp.js uninstall --agent claude
```

---

## Pitfalls

- Don't touch `src/cli/install.js` functions `installPi`, `installCodex` - they're used by the auto-installer
- `backupFile` returns the backup path, doesn't write automatically
- On macOS, `~/.claude.json` is Claude Desktop's config file, not Claude Code
- The `--global` installer requires `rule-mcp` installed globally
