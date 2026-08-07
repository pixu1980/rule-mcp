# Handoff Phase 10 - Documentation, skills and maintenance

**To:** deepseek-v4-flash  
**From:** gpt-5.6-sol (audit + remediation phases 1-6)  
**Date:** 2026-07-15  
**Files affected:** `skills/pix-data-*/SKILL.md`, `docs/`, `README.md`, `src/core/guardrail-defs.js`, `src/tools/handoff.js`, `src/tools/adr.js`, `src/cli/doctor.js`, `package.json`

---

## Context (what was already resolved)

- ✅ `package.json`: self-dependency removed, "Zero npm dependencies" description removed
- ✅ `server.json`: source=github, version=1.0.0
- ✅ `LICENSE` added
- ✅ prompt template: "mandatory/enforced" → "recommended/advisory"
- ✅ Enforcement contract: "ENFORCEMENT" → "WORKFLOW REMINDER"

---

## What to do

### 10.1 - `See also` in missing skills (3 files, ~5 min)

The skills `pix-data-duckdb`, `pix-data-indexed-db`, `pix-data-sqlite` don't have a `## See also` section. This breaks `test/skills-docs.test.mjs`.

**Fix:** Add to the end of each `SKILL.md`:

```markdown
## See also

- [pix-data-sql](../pix-data-sql/SKILL.md) - SQL fundamentals
- [pix-data-postgresql](../pix-data-postgresql/SKILL.md) - PostgreSQL reference
```

Files to modify:

- `skills/pix-data-duckdb/SKILL.md`
- `skills/pix-data-indexed-db/SKILL.md`
- `skills/pix-data-sqlite/SKILL.md`

**Verification:**

```bash
node test/skills-docs.test.mjs  # must pass
```

### 10.2 - Obsolete documentation (32 token names, ~30 min)

`docs/01-product-architecture.md` and `docs/02-tools-operations.md` contain ~32 references to obsolete tool names:

- `pix_react` → `pix_tool_frontend_react`
- `pix_vue` → `pix_tool_frontend_vue`
- `pix_angular` → `pix_tool_frontend_angular`
- `pix_svelte` → `pix_tool_frontend_svelte`
- `pix_docker` → `pix_tool_devops_docker`
- `pix_tool_testing` → `pix_tool_devops_testing`
- ...and 26 more

**Fix:** Bulk replacement with sed or manual editing.

**Verification:**

```bash
# Extract references and verify against the current registry
HOME=/tmp/pix-audit-home PIX_DISABLE_AUTO_ADR=1 NODE_ENV=test \
  node -e 'import{loadAllSkills}from"./src/core/skills.js";import{listTools}from"./src/tools/router.js";await loadAllSkills();const t=new Set(listTools().map(x=>x.name));const fs=require("fs");for(const f of["docs/01-product-architecture.md","docs/02-tools-operations.md"]){const c=fs.readFileSync(f,"utf8");for(const m of c.matchAll(/\bpix_[a-z0-9_]+\b/g)){if(!t.has(m[0]))console.log(f,m[0])}}'
# Output must be empty
```

### 10.3 - Add `annotations` to tools (~10 min)

No tool has `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`).

**Fix:** In `src/tools/router.js` `registerTool()`, add support for `annotations`. Then in each `registerTool` call:

```js
// Read-only tools:
registerTool({ name: "pix_tool_search", ..., annotations: { readOnlyHint: true } });
// Destructive tools:
registerTool({ name: "pix_tool_fix", ..., annotations: { destructiveHint: true } });
```

### 10.4 - Fix handoff (`src/tools/handoff.js`, ~15 min)

**Problem:** Uses `process.cwd()` for project name even when `projectDir` points elsewhere. Git diff doesn't include untracked files.

**Fix:**

```js
// Use projectDir as cwd for execSync
execSync("git log ...", { cwd: projectDir });
// Include untracked: git status --porcelain
execSync("git status --porcelain", { cwd: projectDir });
```

### 10.5 - Auto-ADR opt-in (`src/tools/adr.js:327`, ~5 min)

**Problem:** Wildcard hook `addAfterToolHook("*", autoLog)` creates ADR automatically for every tool call.

**Fix:**

```js
// Disable by default. Enable only if PIX_AUTO_ADR=1
if (process.env.PIX_AUTO_ADR === "1") {
  addAfterToolHook("*", autoLog);
}
```

### 10.6 - `test:all` fixed (`package.json`, ~5 min)

Already done in Phase 3.2 but verify that `pnpm run ci` passes:

```bash
pnpm run ci
# Must run smoke + ai + detector + framework-routing + skills-docs + docs-architect + daemon-wrapper + doctor-ui + cli-tui
# skills-docs and docs-architect must pass after fixes 10.1 and 9.3
```

### 10.7 - `doctor` improved (`src/cli/doctor.js`, ~10 min)

`doctor` returns `ok: true` even with invalid MCP prompts or broken build.

**Fix:** Add checks for:

- `prompts/get` valid response (internal MCP call)
- `skills/` contains at least 60 SKILL.md
- `LICENSE` exists

### 10.8 - Cyclic dependencies (`src/tools/router.js` ↔ `src/core/skills.js`)

Identify and break import cycles. Low priority (P2), doesn't block release.

---

## Final verification commands

```bash
pnpm test
pnpm run ci
node test/skills-docs.test.mjs
node test/docs-architect.test.mjs
pnpm audit --prod
```
