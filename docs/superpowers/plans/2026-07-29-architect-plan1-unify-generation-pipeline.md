# Architect Consolidation — Phase 1: Unify the Generation Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `skills/rule-architect/generator.mjs` the single source of `.context/` generation, consumed by the CLI and **both** web servers — deleting the two inline duplicate copies — with zero change to generated output.

**Architecture:** Today the `.context/` generation logic exists in three places: `generator.mjs` (imported by the CLI) and byte-identical inline copies in `rule-architect-web/server.mjs` and `rule-architect/assets/context-server.mjs`. This phase collapses them to one import. It is a pure refactor: a characterization test locks the generator's current output first, then each server is switched to the shared function and asserted to produce identical files. This is the prerequisite for later phases (rename/wire, de-overfit, entry-points) so those edits happen in one place.

**Tech Stack:** Node.js ESM (`.mjs`), `node:test` + `node:assert` (repo's test convention — see `test/*.test.mjs`), zero runtime dependencies.

## Global Constraints

- Zero new runtime dependencies. Servers stay zero-dep; front-end stays framework-free (rule-frontend-vanilla-reactive).
- Generated output MUST be byte-identical before/after this phase (pure refactor — no template, key, or format changes here).
- Tests use `node:test` / `node:assert` and run via `node ./test/<name>.test.mjs` (match existing suites).
- `detectProjectValues` de-overfit and spec/interview/UI changes are OUT OF SCOPE for this phase (later plans).
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Work on branch `feat/architect-context-pack`.

---

### Task 1: Characterization test locking the canonical generator

**Files:**
- Create: `test/architect-generator.test.mjs`

**Interfaces:**
- Consumes: `generateContextContent(answers, spec)` and `generateContext(answers, spec, targetDir)` from `skills/rule-architect/generator.mjs` (existing exports). `generateContextContent` returns `Array<{ path: string, content: string, filled: number, unfilled: number }>`; it reads `templates.json` internally, so `spec` may be `null`.
- Produces: a golden behavior contract the two server refactors (Tasks 2–3) assert against.

- [ ] **Step 1: Write the characterization test**

```js
// test/architect-generator.test.mjs
// Locks the canonical .context/ generator behavior before the servers are
// switched to import it (Phase 1 refactor is output-preserving).
import test from "node:test";
import assert from "node:assert/strict";
import { generateContextContent } from "../skills/rule-architect/generator.mjs";

const FIXTURE = { PROJECT_NAME: "AcmeApp" };

test("generator returns one entry per template with the documented shape", () => {
  const files = generateContextContent(FIXTURE, null);
  assert.ok(Array.isArray(files));
  assert.equal(files.length, 23, "expected 23 generated files");
  for (const f of files) {
    assert.equal(typeof f.path, "string");
    assert.equal(typeof f.content, "string");
    assert.equal(typeof f.filled, "number");
    assert.equal(typeof f.unfilled, "number");
  }
});

test("known placeholder is filled; no bare [KEY] survives; unfilled are bolded", () => {
  const files = generateContextContent(FIXTURE, null);
  const all = files.map((f) => f.content).join("\n");
  assert.ok(all.includes("AcmeApp"), "PROJECT_NAME value should appear");
  assert.doesNotMatch(all, /\[[A-Z_0-9]+\](?!\*)/, "no unbolded bare [KEY] should remain");
  assert.match(all, /\*\*\[[A-Z_0-9]+\]\*\*/, "unfilled placeholders should be bolded **[KEY]**");
});
```

- [ ] **Step 2: Run it and confirm it passes (characterization, not red)**

Run: `node ./test/architect-generator.test.mjs`
Expected: PASS (generator already implements this behavior). If it fails, STOP — the generator differs from assumption; reconcile before refactoring.

- [ ] **Step 3: Commit**

```bash
git add test/architect-generator.test.mjs
git commit -m "test(architect): characterize canonical generator before pipeline unification

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Switch `rule-architect-web/server.mjs` to the shared generator

**Files:**
- Modify: `skills/rule-architect-web/server.mjs` (add import ~line 18; delete inline `generateContext` ~48–89 and `generateContextContent` ~92–118; update `/api/generate` ~508 and `/api/download` ~531 call sites)
- Test: `test/architect-web-generator-parity.test.mjs` (create)

**Interfaces:**
- Consumes: `generateContext`, `generateContextContent` from `../rule-architect/generator.mjs`.
- Produces: server output identical to `generateContextContent` from Task 1.

- [ ] **Step 1: Write the parity test (red)**

```js
// test/architect-web-generator-parity.test.mjs
// Guards that server.mjs no longer carries its own generator: its exported
// generation must be the shared one. We assert by importing the module's
// generation indirectly is not possible (server has no exports), so instead
// assert the source no longer defines an inline generator.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../skills/rule-architect-web/server.mjs", import.meta.url), "utf-8");

test("architect-web server imports the canonical generator", () => {
  assert.match(SRC, /from\s+["']\.\.\/rule-architect\/generator\.mjs["']/);
});

test("architect-web server has no inline generator copy", () => {
  assert.doesNotMatch(SRC, /function\s+generateContextContent\s*\(/, "inline generateContextContent must be removed");
  assert.doesNotMatch(SRC, /function\s+generateContext\s*\(/, "inline generateContext must be removed");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node ./test/architect-web-generator-parity.test.mjs`
Expected: FAIL (server still defines the inline functions).

- [ ] **Step 3: Add the import**

At the top of `skills/rule-architect-web/server.mjs`, after the `import http from "node:http";` line (~18):

```js
import { generateContext, generateContextContent } from "../rule-architect/generator.mjs";
```

- [ ] **Step 4: Delete the two inline functions**

Remove the inline `function generateContext(values, templates, target) { … }` (the `/** Generate .context/ files from user values */` block, ~47–89) and `function generateContextContent(values, templates) { … }` (~91–118). Leave `detectProjectValues` and `loadData` intact.

- [ ] **Step 5: Update the `/api/generate` and `/api/download` call sites**

The imported `generateContext(answers, spec, targetDir)` reads `templates.json` itself and writes to `targetDir/.context`; `generateContextContent(answers, spec)` returns the file array. Update the handlers so they call the imported functions and stop passing a `templates` array:

```js
// /api/generate  (~508): write to disk
const generated = generateContext(values || {}, wizardSpec, targetDir);
// /api/download  (~531): in-memory
const files = generateContextContent(values || {}, wizardSpec);
```

(`wizardSpec` comes from `loadData()`; the generator ignores it, but passing it keeps the call self-documenting. If the handler previously destructured `templates` only for generation, keep `templates` if still used by `/api/templates`, otherwise drop the unused binding.)

- [ ] **Step 6: Run the parity test — verify it passes**

Run: `node ./test/architect-web-generator-parity.test.mjs`
Expected: PASS.

- [ ] **Step 7: Smoke-run the server and diff one generated file against the generator**

```bash
node skills/rule-architect-web/server.mjs /tmp/arch-smoke --port 37021 &
sleep 1
curl -s -X POST http://localhost:37021/api/download -H 'Content-Type: application/json' \
  -d '{"values":{"PROJECT_NAME":"AcmeApp"},"tier":"standard"}' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const readme=(j.files||[]).find(f=>f.path==="README.md");console.log(readme&&readme.content.includes("AcmeApp")?"OK: filled":"FAIL");})'
kill %1
```
Expected: `OK: filled` (server output matches generator behavior).

- [ ] **Step 8: Commit**

```bash
git add skills/rule-architect-web/server.mjs test/architect-web-generator-parity.test.mjs
git commit -m "refactor(architect-web): use shared generator.mjs, drop inline copy

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Switch `context-server.mjs` to the shared generator

**Files:**
- Modify: `skills/rule-architect/assets/context-server.mjs` (add import; delete inline `generateContext` ~47 and `generateContextContent` ~91; keep `detectProjectValues` ~120; update `/api/generate` ~490 and `/api/download` ~513 call sites)
- Test: `test/context-server-generator-parity.test.mjs` (create)

**Interfaces:**
- Consumes: `generateContext`, `generateContextContent` from `./context-server/../../generator.mjs` → i.e. `../generator.mjs` relative to `assets/` (path: `skills/rule-architect/generator.mjs`). From `context-server.mjs` (in `assets/`), the import is `"../generator.mjs"`.
- Produces: context-server output identical to the generator.

- [ ] **Step 1: Write the parity test (red)**

```js
// test/context-server-generator-parity.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../skills/rule-architect/assets/context-server.mjs", import.meta.url), "utf-8");

test("context-server imports the canonical generator", () => {
  assert.match(SRC, /from\s+["']\.\.\/generator\.mjs["']/);
});

test("context-server has no inline generator copy", () => {
  assert.doesNotMatch(SRC, /function\s+generateContextContent\s*\(/);
  assert.doesNotMatch(SRC, /function\s+generateContext\s*\(/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node ./test/context-server-generator-parity.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Add the import**

Near the other imports at the top of `skills/rule-architect/assets/context-server.mjs`:

```js
import { generateContext, generateContextContent } from "../generator.mjs";
```

- [ ] **Step 4: Delete the two inline functions**

Remove inline `generateContext` (~47–89) and `generateContextContent` (~91–118). **Keep** `detectProjectValues` (~120) and all endpoint code.

- [ ] **Step 5: Update call sites**

```js
// /api/generate (~490)
const generated = generateContext(values || {}, null, targetDir);
// /api/download (~513)
const files = generateContextContent(values || {}, null);
```
(The `templates` local previously passed in is no longer needed for generation; keep the `templates` load only if `/api/templates` still uses it.)

- [ ] **Step 6: Run the parity test — verify it passes**

Run: `node ./test/context-server-generator-parity.test.mjs`
Expected: PASS.

- [ ] **Step 7: Run the existing UI suite against context-server (no regression)**

```bash
node skills/rule-architect/assets/context-server.mjs /tmp/ctx-smoke --port 19000 &
sleep 1
node_modules/.bin/playwright test test/architect-ui.test.mjs -g "keeps focus|repeatable|generate creates" --reporter=line
kill %1
```
Expected: the focus, repeatable, and generate tests PASS (the two stale step-count tests remain pre-existing failures — out of scope).

- [ ] **Step 8: Commit**

```bash
git add skills/rule-architect/assets/context-server.mjs test/context-server-generator-parity.test.mjs
git commit -m "refactor(context-server): use shared generator.mjs, drop inline copy

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Register the new tests and green the suite

**Files:**
- Modify: `package.json` (`test:all` / `ci` scripts — append the three new suites)

**Interfaces:**
- Consumes: the three test files created above.
- Produces: CI coverage of the unified generator.

- [ ] **Step 1: Add the suites to the `test:all` and `ci` scripts**

Append to both scripts in `package.json`:

```
&& node test/architect-generator.test.mjs && node test/architect-web-generator-parity.test.mjs && node test/context-server-generator-parity.test.mjs
```

- [ ] **Step 2: Run the three suites together**

Run: `node test/architect-generator.test.mjs && node test/architect-web-generator-parity.test.mjs && node test/context-server-generator-parity.test.mjs`
Expected: all PASS.

- [ ] **Step 3: Lint the changed server files**

Run: `pnpm exec eslint skills/rule-architect-web/server.mjs skills/rule-architect/assets/context-server.mjs`
(If `skills/` is outside the lint globs, run `node --check` on both files instead.)
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "test(architect): register generator unification suites in test:all + ci

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage (this phase):** Covers the S1 sub-goal "one shared generator" and the S6 "CLI parity by construction" foundation. Does NOT cover spec unification (S1b), interview unification (S1c), rename (S2), templates (S3), entry-points (S4), UI (S5) — those are later phases (see roadmap).
- **Placeholder scan:** No TBD/TODO; every step has concrete code or a concrete command. Line numbers are approximate (`~`) and named anchors are exact.
- **Type consistency:** `generateContextContent(answers, spec) → Array<{path,content,filled,unfilled}>` and `generateContext(answers, spec, targetDir)` are used identically in Tasks 1–3.
- **Risk:** the only behavioral risk is a signature mismatch at a call site; Step 7 smoke tests in Tasks 2 and 3 catch it.

## Roadmap — remaining phases (each its own plan, written when its predecessor lands)

- **Phase 2 — Unify the spec (S1b):** one canonical wizard spec; CLI (`spec.steps`), architect-web (`/api/placeholders` transform), and context-server (`placeholders.json`) all read one source; drift check in CI. Also unify `detectProjectValues` into one shared, de-overfit module.
- **Phase 3 — Unify the interview UI (S1c):** merge the two `interview.js` into one shared file served by both web servers.
- **Phase 4 — Rename + compose (S2):** rename wizard keys to template placeholders; list-composition normalizer; ≥95% coverage gate.
- **Phase 5 — Templates: conditional + lean (S3):** conditional domain specs; kill `**[KEY]**` noise (omit / explicit TODO); lead with the entry doc.
- **Phase 6 — Cross-harness entry-points (S4):** canonical `AGENTS.md` + symlinks/wrappers for Claude/Cursor/Copilot/Gemini/Windsurf/Cline/Pi.
- **Phase 7 — UI: Summary • Files toggle (S5).**
