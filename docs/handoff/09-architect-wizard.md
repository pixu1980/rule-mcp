# Handoff Phase 9 - Architect and wizard

**To:** deepseek-v4-flash  
**From:** gpt-5.6-sol (audit + remediation phases 1-6)  
**Date:** 2026-07-15  
**Files affected:** `skills/pix-architect/`, `skills/pix-architect-cli/`, `skills/pix-architect-web/`, `src/tools/architect.js`

---

## Context (what already happened)

The working tree underwent a partial architect wizard migration:

- `skills/pix-architect/assets/context-server/` was **deleted** (38 files deleted)
- New **untracked** files appeared: `skills/pix-architect-cli/`, `skills/pix-architect-web/`, `skills/pix-architect/generator.mjs`, `skills/pix-architect/validators.mjs`, `skills/pix-architect/wizard-spec.json`, `skills/pix-architect/placeholders.json`, `skills/pix-architect/templates.json`
- The `pix_tool_architect` tool still points to the old `context-server.mjs` (no longer exists)
- `pix_tool_architect check` is the only mode that crashes in the 402-call matrix

**⚠️ IMPORTANT:** Do not delete or overwrite the author's untracked files. Complete the migration or document the state.

---

## What to do

### 9.1 - Complete the wizard migration

Two options:

**Option A - Complete the new wizard (recommended):**

1. Hook `src/tools/architect.js` to the new `pix-architect-cli` (CLI) or `pix-architect-web` (browser)
2. Update `pix_tool_architect` tool in all modes (full, summary, search, guardrails, check, tldr)
3. Remove references to the old `context-server.mjs`

**Option B - Restore the old wizard:**

1. `git checkout HEAD -- skills/pix-architect/assets/`
2. Remove the untracked files of the new wizard

**In both cases:** the `pix_tool_architect` tool must work in all 6 modes.

### 9.2 - Sanitize the web wizard (`skills/pix-architect-web/`)

If Option A is chosen, the web wizard has blocking security issues:

**Issues found by audit (P1-09):**

- `innerHTML` without escaping → XSS
- Inline `onclick`/`oninput` (violates pix principles)
- Inline `style=` (violates pix principles)
- `server.listen(PORT)` without host → listens on all interfaces
- CORS `*`
- No body limit
- No authentication

**Minimum fixes:**

```js
// server.mjs: loopback binding
server.listen(PORT, "127.0.0.1", () => { ... });

// interview.js: sanitize before innerHTML
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}
// Use textContent for data, innerHTML only for trusted templates

// Replace onclick/oninput with addEventListener
```

### 9.3 - Update tests

- `test/docs-architect.test.mjs` → crashes because `templates.json` no longer exists. Update for the new wizard.
- `test/architect-ui.test.mjs` → Playwright test, update for the new web wizard.

---

## Verification commands

```bash
# Verify pix_tool_architect works in all modes
HOME=/tmp/pix-audit-home PIX_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node -e 'import{loadAllSkills}from"./src/core/skills.js";import{callTool}from"./src/tools/router.js";await loadAllSkills();
  for(const m of["full","summary","search","guardrails","check","tldr"]){
    const r=await callTool("pix_tool_architect",{mode:m,query:"test"});
    console.log(m,r.isError?"FAIL":"PASS");
  }'

# Existing tests must pass (after fixes)
node test/docs-architect.test.mjs
npx playwright test test/architect-ui.test.mjs
```

---

## Files NOT to touch (author's modifications)

- `skills/pix-architect/generator.mjs`
- `skills/pix-architect/validators.mjs`
- `skills/pix-architect/wizard-spec.json`
- `skills/pix-architect/placeholders.json`
- `skills/pix-architect/templates.json`
- `skills/pix-architect/knowledge/wizard-reborn-plan.md`
- All of `skills/pix-architect-cli/`
- All of `skills/pix-architect-web/`

These are the author's work-in-progress. They should be integrated, not deleted.
