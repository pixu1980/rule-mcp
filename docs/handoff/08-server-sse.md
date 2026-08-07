# Handoff Phase 8 - Server, SSE and runtime security

**To:** deepseek-v4-flash  
**From:** gpt-5.6-sol (audit + remediation phases 1-6)  
**Date:** 2026-07-15  
**Files affected:** `src/transport/sse.js`, `src/cli/commands.js`, `src/index.js`, `src/utils/sandbox.js`

---

## Context (what was already resolved in Phase 1.2)

- ✅ Bearer token generated at startup, printed to stderr (`src/transport/sse.js:generateToken`)
- ✅ `/health` public, `/sse` and `/message` require `Authorization: Bearer <token>`
- ✅ CORS deny-by-default (only origins in `ALLOWED_ORIGINS`)
- ✅ 1MB body limit on POST `/message`
- ✅ `--port` CLI flag forwarded to `startSseServer`
- ✅ Cross-origin blocked with 403

**What remains to do:**

---

## 8.1 - Sandbox timeout with AbortController (`src/utils/sandbox.js`)

**Problem:** `withTimeout` returns an error to the caller but the underlying Promise continues execution. A write can complete after the timeout.

**Fix:**

```js
// src/utils/sandbox.js
export function withTimeout(promise, ms, signal) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        signal?.abort?.(); // notify the Promise to stop
        reject(new Error(`Timeout after ${ms}ms`));
      }, ms);
      // cleanup
      promise.finally(() => clearTimeout(timer));
    }),
  ]);
}
```

For mutating tools (`rule_tool_fix`, `rule_tool_process_adr`): accept `AbortSignal`, respect it, prevent partial writes after abort.

**Verification:**

```bash
node test/sandbox.test.mjs  # must pass without regressions
```

---

## 8.2 - Consistent resource list/read for plugins (`src/resources/index.js`)

**Problem:** `listResources()` publishes URIs for plugin skills (e.g. `rule://caveman`) but `readResource()` rejects them because the regex only accepts names starting with `pix_tool`.

**Fix:** Two options:

1. **Option A (recommended):** `listResources()` doesn't publish plugin skills. Only official skills.
2. **Option B:** `readResource()` also accepts plugin skills.

```js
// In listResources(): filter getSkillNames() to exclude plugins
for (const name of getSkillNames()) {
  if (name === "rule" || isPluginSkill(name)) continue;
  // ...
}
```

Additionally, `rule://skills` exposes absolute filesystem paths. Use relative paths:

```js
// resources/index.js ~line 80: use relative(root, sp) instead of sp
```

**Verification:**

```bash
# Verify plugin resources are not advertised
HOME=/tmp/rule-audit-home RULE_MCP_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node -e 'import{loadAllSkills}from"./src/core/skills.js";import{listResources}from"./src/resources/index.js";await loadAllSkills();const r=listResources();console.log(r.filter(x=>x.uri.includes("caveman")).length)' # must be 0
```

---

## 8.3 - Idempotent reload (`src/core/skills.js`, `src/tools/router.js`)

**Problem:** `loadAllSkills(force=true)` doesn't clear `_tools`. A second call doubles the registry: 76 → 152 tools.

**Fix:**

```js
// src/tools/router.js - clearTools must be called at the start of loadAllSkills(force=true)
export function clearTools() {
  _tools.length = 0;
}

// src/core/skills.js - already calls skillCache.clear(), add clearTools()
export async function loadAllSkills(force = false) {
  if (loaded && !force) return;
  if (force) {
    skillCache.clear();
    clearTools(); // ← add this line
  }
  // ...
}
```

**Verification:** Call `loadAllSkills()` twice → same number of tools.

---

## Verification commands

```bash
pnpm test
node test/sandbox.test.mjs
node test/sse.test.mjs
node test/https.test.mjs

# Verify idempotent reload
HOME=/tmp/rule-audit-home RULE_MCP_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node -e 'import{loadAllSkills}from"./src/core/skills.js";import{listTools}from"./src/tools/router.js";await loadAllSkills();console.log(listTools().length);await loadAllSkills(true);console.log(listTools().length)' # must be equal
```
