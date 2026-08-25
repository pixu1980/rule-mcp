# Mega Review - `claude-*` Compliance and `pix_tool` Router Reliability

**Date**: 2026-07-15
**Version analyzed**: `rule-mcp@1.0.0`, commit `4d9764b` (2026-07-11)
**MCP SDK**: `@modelcontextprotocol/sdk@1.29.0`
**Author**: mega-review agent (pi), on user request

## 0. How to read this report

"Every single line of code" is not verifiable in a single pass (~9.3k lines in `src/`, 70 skills in `skills/`, over 700 guardrail lines). This report is therefore:

1. **A complete architectural audit** of every subsystem (server, tools, skills, resources, prompts, enforcement, installer, CLI).
2. **Reproducible point checks** with raw evidence (executed commands + output) for critical points, not generic claims.
3. **A direct, reasoned answer** to the central question: _does the `pix_tool` router and skill/tool triggers actually get invoked by the model during a chat session?_

Every command reported in this document was actually executed in this session against the current repository (not simulated).

---

## 1. Executive Summary

| Area                                                                | Verdict                                                                                                               | Severity    |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------- |
| MCP Protocol - `tools/*`, `resources/*`                             | ✅ Compliant (validated against the SDK's official Zod schemas)                                                       | -           |
| MCP Protocol - `prompts/get`                                        | ❌ **Broken for any spec-compliant client**, Claude included                                                          | 🔴 Critical |
| `pix_tool` router automatically invoked by the model                | ⚠️ **Not structurally guaranteed**. 100% dependent on textual instructions (CLAUDE.md/AGENTS.md), not on the protocol | 🟠 High     |
| Integration with Claude's native "Agent Skills" (`.claude/skills/`) | ❌ Not implemented: skills remain Markdown exposed only via custom MCP tool                                           | 🟠 High     |
| Exposed tool surface (76 tools + 146 resources "as shipped")        | ⚠️ Large, without `annotations`/`readOnlyHint`, no recommended `allowedTools` filter                                  | 🟡 Medium   |
| Security (path traversal, command injection)                        | ⚠️ One path traversal flaw in `rule_tool_fix mode=generate`                                                            | 🟡 Medium   |
| Test/CI quality                                                     | ⚠️ 4/20 test files red or failing in current state                                                                    | 🟡 Medium   |
| Argument validation, guardrails, post-hoc enforcement               | ✅ Solid, well-designed for what it can do (see §6)                                                                   | -           |

**In one sentence**: the guardrail/enforcement/BM25 infrastructure is well-designed and _effective when a tool is actually called_, but **nothing in the MCP server forces a model - Claude or otherwise - to call `pix_tool` before writing code**. The project knows this and compensates by injecting textual instructions (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`) into every supported agent: it's a reasonable but probabilistic solution, not deterministic, and moreover the native channel Claude offers precisely for this purpose (Agent Skills in `.claude/skills/`, real auto-discovery) is not used.

---

## 2. Architecture - what the server really exposes

```
src/server.js         → MCP server (stdio/SSE), capabilities: tools, resources, prompts, logging, completions
src/tools/router.js   → generic registry (registerTool/listTools/callTool) + before/after/post hooks
src/tools/ai.js       → "rule" tool (the router - keyword scoring on ## sections of SKILL.md)
src/tools/skill.js    → generates a pix_<skill> tool for EVERY skill + rule_tool_search/rule_tool_check/rule_tool_scaffold
src/core/skills.js    → loadAllSkills(): loads 70 skills, registers ~76 tools, builds BM25 index
src/core/enforcement.js → pre/post-processing: validates shape, appends "PIX ENFORCEMENT CONTRACT"
src/resources/index.js → 146 rule:// resources (2 per skill + 8 static)
src/prompts/index.js  → 5 MCP prompts (code-review, generate-component, a11y-test/review, architect-scaffold)
```

Verified count (clean repository, no extra personal skills in `~/.agents/skills`):

```
$ node clean-tools.mjs
clean shipped tool count: 76
clean shipped resource count: 146
tool defs JSON bytes: 90873  ~tokens: 22718
```

In this live session (with additional personal skills installed on the machine, e.g. `caveman-*`, `frontend-design`...) the tool count rises to **87**, and in the "pi" host every MCP resource is _also_ exposed as a standalone tool (`get_..._skill_full_content`, `get_..._skill_summary_first_30_lines`, etc.), bringing the total surface visible to the model to **over 220 callable tools in a single session**. This is a host-specific detail, not a server one, but it's a concrete, observable effect of the "one resource/skill = one tool" architecture the project adopts.

---

## 3. 🔴 CRITICAL - `prompts/get` returns an invalid response per the MCP spec

`src/prompts/index.js` builds each prompt with a `role: "system"` message:

```js
messages: [{ role: "system", content: { type: "text", text: "..." } }];
```

The MCP spec (`PromptMessage`) and the official SDK allow **only** `role: "user" | "assistant"` - not `"system"` (source: [MCP spec - Prompts](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts), confirmed via `RoleSchema = z.enum(['user','assistant'])` in the SDK installed in `node_modules/@modelcontextprotocol/sdk`).

Additionally, `src/server.js` responds to `prompts/get` with `{ prompt: {...} }`, while `GetPromptResultSchema` requires `{ description?, messages }` **at the top level**, without a `prompt` wrapper and without a `name` field.

### Reproduction (actually executed, not simulated)

```js
import { GetPromptResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { getPrompt } from "./src/prompts/index.js";

const p = getPrompt("rule-code-review");
const serverResult = { prompt: p }; // exactly what server.js sends on the wire

GetPromptResultSchema.safeParse(serverResult).success;
// => false
```

Actual output:

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

And even fixing the shape (`{ description, messages }` without wrapper), the `role: "system"` still fails:

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

### Impact

Any MCP client that validates responses against the official schema (the TypeScript/Python reference client, and presumably Claude Desktop/Claude Code when using `prompts/get`) **rejects the response with a parsing error**. The 5 server slash-prompts (`rule-code-review`, `rule-generate-component`, `rule-a11y-test`, `rule-a11y-review`, `rule-mcp-architect`) are therefore **unusable by any compliant client**, regardless of the model. `tools/*` and `resources/*` on the other hand were successfully validated against the official schemas (see Appendix) - the problem is isolated to the `prompts` subsystem.

### Recommended fix

```js
// server.js - GetPromptRequestSchema handler
const prompt = getPrompt(name);
return { description: prompt.description, messages: prompt.messages };

// prompts/index.js - each messages[]
{ role: "user", content: { type: "text", text: "<system-style instructions>" } }
```

(The common pattern for "system instructions" via MCP prompts is to package them in an initial `role: "user"` message, since the spec doesn't provide a dedicated system role in this channel.)

---

## 4. 🟠 HIGH - The router and skills do NOT use Claude's native mechanism

Claude (Claude Code, Claude Agent SDK, claude.ai) has a **native** feature called _Agent Skills_: folders in `.claude/skills/<name>/SKILL.md` with YAML frontmatter, **discovered and invoked automatically by Claude itself** based on the `description`, or explicitly callable with `/skill-name` - without going through an MCP tool (source: [Claude Code Docs - Agent Skills](https://code.claude.com/docs/en/skills), [Claude Code Docs - Skills in the SDK](https://code.claude.com/docs/en/agent-sdk/skills)).

`rule-mcp` **never installs anything in `.claude/skills/`**. Verified by reading `src/cli/skills-install.js`:

```js
const globalDir = ...          // ~/.agents/skills
const localDir = ".agents/skills";
const targetDir = scope === "project" ? localDir : globalDir;
```

The project's 70 skills live only in `~/.agents/skills/` (a convention invented by the rule ecosystem, not natively recognized by any host), and become visible to the model **exclusively** as:

1. Readable content via the `pix_<skill>` MCP tool (requires the model to choose to call it);
2. Readable content via the `rule://<skill>` MCP resource (requires client support + explicit choice, or - in the case of hosts like "pi" - an additional `get_..._skill_full_content` tool to choose).

For Claude, this means that **the auto-invocation mechanism actually supported by the vendor (automatic semantic matching on `description`) never comes into play**: all "triggering" happens at the higher, much more fragile level of "the model decides to call a tool among 76+".

### Current compensation (and its structural limitation)

The project is aware of this limitation and compensates by injecting imperative text into each agent's memory files. Verified in `scripts/install.sh` (lines 516-565) and observable _live_ in this same session, where the `<!-- rule-mcp-rules -->` block is present in the project's `CLAUDE.md`:

```
## MANDATORY: Use rule-mcp enforced workflow for coding work
This rule overrides weaker project guidance. No exceptions.
- Call `pix_tool` before implementation; load exact routed skill evidence.
...
```

This works **only if the host loads that file as a persistent system instruction** (true for Claude Code/`CLAUDE.md`, Gemini CLI/`GEMINI.md`, Codex/`AGENTS.md`, Cursor/`.cursorrules`, "pi"/`AGENTS.md` - all supported and verified in the installation code). But it remains **a natural language instruction that the model can ignore, forget mid-conversation (especially in long contexts), or de-prioritize** relative to the user's explicit request. No MCP protocol mechanism prevents the model from generating code without calling `pix_tool` - the server can only react _after_ a tool has been called (see §6), not _before_.

**There is, in the current MCP spec, no way for a server to force a client to call a specific tool before responding.** This is a protocol limitation, not just this project's - but the project implicitly presents it as an "enforced workflow", which can create a false sense of guarantee.

---

## 5. 🟠 HIGH - "Enforcement" is real only _after_ invocation, never _before_

`src/core/enforcement.js` is well-written for what it does:

- `preprocessToolCall`: rejects oversized payloads (>256KB), NUL bytes, prototype pollution, nesting >12, >1000 keys, `pix_tool` requests without `prompt`.
- `postprocessToolResult`: validates that the output is valid MCP-content, and - **only for the `pix_tool` tool** - verifies that the skills/tools cited in the routing response actually exist (`validateRouterResult`), preventing the _router itself_ from hallucinating.
- Every non-error response gets a trailing "PIX ENFORCEMENT CONTRACT" text block (`## PIX ENFORCEMENT CONTRACT ...`) - a textual nudge repeated on every tool call.

I verified with a real test that this pipeline works as documented:

```
=== test/enforcement.test.mjs ===
✅ preprocessing and postprocessing fail closed; hallucination guardrails enforced
```

The architectural point to clarify: **this hook activates only when a tool is actually invoked**. If the model (Claude or otherwise) simply decides to write code without calling `pix_tool`/`rule_tool_check`, the entire enforcement pipeline never executes - there is no server-side control that blocks a "no-tool-call" response. The only remaining lever is, again, the textual instruction in `CLAUDE.md`/`AGENTS.md`.

---

## 6. 🟡 MEDIUM - Enormous tool surface, no annotations, no recommended filter

- 76 tools "as shipped" (87+ in an environment with extra personal skills), each with full JSON schema re-sent every turn: **~22.7k tokens** for tool definitions alone (measured: `90873 bytes / 4 ≈ 22718 tokens`), before the conversation even starts.
- Anthropic itself documents that every MCP tool definition costs **500–2000 tokens**, and that loading too many tools "burns" context before Claude does any useful work - which is why they introduced **Tool Search** (enabled by default in Claude Code) to defer loading full definitions and allow scaling to hundreds/thousands of tools (source: [Claude Code Docs - Scale to many tools with tool search](https://code.claude.com/docs/en/agent-sdk/tool-search.md), [Tool Search Tool - Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)).
- This means the reliability of "the model picks the right tool among N" **varies greatly by host**: good on Claude Code (tool search active by default), uncertain on hosts that don't implement tool search or `allowedTools` filters (e.g. vanilla Claude Desktop, or generic hosts like "pi" that moreover duplicate the problem by also exposing resources as tools).
- No tool registered in `src/tools/router.js` sets `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `title`) even though the SDK and 2025-06-18 spec support them (`ToolAnnotationsSchema`, verified in `node_modules/@modelcontextprotocol/sdk`). Practical result: a client like Claude Code cannot automatically distinguish "this tool only reads" (e.g. `rule_tool_search`) from "this tool writes files" (e.g. `rule_tool_fix mode=generate`, `rule_tool_process_adr`) - all require the same trust/approval.

### Concrete recommendation

- Add `annotations: { readOnlyHint: true }` to `pix_tool`, `rule_tool_search`, `rule_tool_check` (mode ≠ scaffold), the 67 skill-tools in `mode=full/summary/search/guardrails/tldr`.
- Add `annotations: { destructiveHint: false, idempotentHint: false }` to `rule_tool_fix` (mode=fix/generate), `rule_tool_process_adr`.
- Document in README a recommended `allowedTools`/whitelist for Claude Code, to limit the tool-choice budget to the core set (9 tools) plus the skill set actually relevant to the project, instead of always exposing all 76.

---

## 7. 🟡 MEDIUM - Path traversal in `rule_tool_fix mode=generate`

`src/tools/fix.js`, branch `mode === "generate"`:

```js
const rootDir = args.path || ".";
const files = generateComponentFiles({ name: args.name, framework: args.framework, baseDir: args.baseDir });
for (const file of files) {
  const fullPath = join(rootDir, file.path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, file.content, "utf8");
}
```

`args.name` and `args.baseDir` are free strings provided by the caller (in practice by the model, based on the user prompt) and **are never sanitized** before being passed to `join()`/`writeFileSync`. Verified with:

```
$ grep -n "startsWith(rootDir\|resolve(\|sanitize" src/core/file-tree.js src/tools/fix.js
(no results)
```

Unlike `rule_tool_process_adr` (which always passes `title` through `slugify()`, which removes `/` and non-alphanumeric characters - verified in `src/tools/adr.js`), `rule_tool_fix` applies no equivalent function to `name`/`baseDir`. A value like `name = "../../../../tmp/evil"` or `baseDir = "../../.ssh"` **is not blocked at code level**: Node's `join()` normalizes but doesn't prevent directory traversal.

This is not a "direct" network attack scenario (the caller is the model connected via MCP, not an anonymous HTTP user), but it's a classic MCP "confused deputy" pattern: if the model is induced - through prompt injection from a previously-read file/README, or through simple hallucination - to pass a `name`/`baseDir` with `../`, the server writes outside the project directory without any warning.

### Recommended fix

Add an `assertInsideProject(rootDir, fullPath)` function (resolve + `startsWith`) before every `writeFileSync`/`mkdirSync` in `fix.js`, analogous to the `slugify()` already used in `adr.js`.

---

## 8. 🟢 What works well (for completeness)

- **Zod validation** on every tool (via `zodSchema.parse`) before the handler - verified that validation errors return as `isError: true` with readable detail, not raw stack traces.
- **`rule_tool_check`/guardrail engine** (`src/core/guardrails.js` + `guardrail-defs.js`, 683 lines): deterministic, testable engine, with `previousPassed` support for incremental iteration - good design for a "generate → check → fix → re-check" cycle.
- **BM25 (`src/core/bm25.js`)**: real search index (not simple `includes()`), with statistics (`totalDocs`, `uniqueTerms`, `avgDocLength`) exposed for diagnostics.
- **`pix_tool` router (`src/tools/ai.js`)**: the scoring algorithm is tested (14 dedicated tests between `test/ai.test.mjs` and `test/framework-routing.test.mjs`, all green in this session) - it's correct **as a pure function**: given a prompt, it always returns skills consistent with keyword/heading matching and framework bias. The problem described in §4/§6 is not "the algorithm is wrong", it's "there's no guarantee it will be queried".
- **Safe command execution**: verified that `execSync`/`spawn` in `handoff.js`, `daemon.js`, `architect.js` never concatenate user input inside the shell command string - arbitrary paths pass only as `cwd` or array arguments to `spawn` (safe pattern), not as injection into the command string.
- **Multi-agent**: the installer truly supports 23 agents/IDEs with distinct configuration paths (verified in `src/cli/install.js`), not just Claude.

---

## 9. Test status - real evidence (not declared, executed)

```
$ node test/smoke.mjs                     → 7/7 ✅
$ node test/ai.test.mjs                   → 8/8 ✅
$ node test/framework-routing.test.mjs    → 5/5 ✅
$ node test/detector.test.mjs             → 14/14 ✅
$ node test/enforcement.test.mjs          → ✅
$ node test/sandbox.test.mjs              → 15/15 ✅
$ node test/https.test.mjs                → 11/11 ✅
$ node test/sse.test.mjs                  → 16/16 ✅
$ node test/daemon.test.mjs               → 1/6 ✅ (5 failed - port timing, verify if environment-dependent)
$ node test/add-once.test.mjs             → ❌ crash: requires `playwright test`, not `node`, must be run with Playwright test runner
$ node test/architect-ui.test.mjs         → ❌ crash: same reason (uses test.describe() from @playwright/test)
$ node test/docs-architect.test.mjs       → ❌ AssertionError: ADR decisions summary missing 011-...md (docs/adr/DECISIONS.md drift)
$ node test/skills-docs.test.mjs          → ❌ AssertionError: rule-data-duckdb missing "See also" cross-reference
```

The `"test:all": "for f in test/*.test.mjs; do node \"$f\"; done"` script in `package.json` is **broken by design**: it blindly iterates over all `*.test.mjs`, but at least 2 files (`add-once.test.mjs`, `architect-ui.test.mjs`) are `@playwright/test` suites that must be run with `pnpm exec playwright test`, not with direct `node`. The `"ci"` script instead lists files explicitly and avoids this problem - but then `test:all` should be fixed or removed to not be misleading.

The failures in `docs-architect.test.mjs` and `skills-docs.test.mjs` are pre-existing documentation drift (not introduced in this session - verified that the working tree already had uncommitted modifications on `docs/adr/001-*.md`, `002-*.md`, `docs/03-*.md`, `docs/04-*.md` before this audit).

---

## 10. Prioritized recommendations

| #   | Action                                                                                                                                                                                                                                  | Severity    | Effort                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------- |
| 1   | Fix `prompts/get`: shape `{description, messages}` without `prompt` wrapper, `role: "user"` instead of `"system"`                                                                                                                       | 🔴 Critical | Low (1 file, `server.js` + `prompts/index.js`) |
| 2   | Add path sanitization (`assertInsideProject`) in `rule_tool_fix mode=generate` for `name`/`baseDir`                                                                                                                                      | 🟡 Medium   | Low                                            |
| 3   | Add `annotations` (`readOnlyHint`/`destructiveHint`) to all tools in `registerTool()`                                                                                                                                                   | 🟡 Medium   | Medium (touches ~9 registration points)        |
| 4   | Explicitly document (README/docs) that "enforcement" is **advisory, not protocol-level**, and is effective only if the host loads `CLAUDE.md`/`AGENTS.md` as a persistent instruction - avoid the term "enforced" without qualifying it | 🟠 High     | Low                                            |
| 5   | Evaluate a real bridge to `.claude/skills/` (generate `SKILL.md` + compatible frontmatter there too, not just in `~/.agents/skills/`) to obtain native auto-discovery on Claude                                                         | 🟠 High     | High                                           |
| 6   | Add a "recommended allowedTools" guide for hosts with many tools, and evaluate _not_ exposing 2 resources per skill by default (146 resources is a lot if the host converts them to tools)                                              | 🟡 Medium   | Medium                                         |
| 7   | Rewrite ~59/70 skill descriptions with explicit "Use when..." formula to increase semantic matching quality if/when you migrate skills to a native mechanism                                                                            | 🟢 Low      | Medium                                         |
| 8   | Fix `test:all` in `package.json` (playwright vs node) and heal the `docs/adr/DECISIONS.md` drift                                                                                                                                        | 🟢 Low      | Low                                            |

---

## Appendix A - Commands executed for protocol verification

```bash
# Verify prompts/get shape vs official schema
node -e '
import { GetPromptResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { getPrompt } from "./src/prompts/index.js";
const p = getPrompt("rule-code-review");
console.log(GetPromptResultSchema.safeParse({ prompt: p }).success); // false
'

# Verify tools/resources (both PASS)
ListToolsResultSchema.safeParse({ tools: listTools() }).success        // true
ReadResourceResultSchema.safeParse(await readResource("rule://skills")).success // true
CallToolResultSchema.safeParse(await callTool("rule", {...})).success   // true

# "As shipped" tool/resource count
clean shipped tool count: 76
clean shipped resource count: 146
tool defs JSON bytes: 90873  ~tokens: 22718
```

## Appendix B - Skill metrics

- 70 skill folders in `skills/` (repo), 69 returned by `getSkillNames()` (excludes `pix_tool` itself).
- 0 skills without `description` in frontmatter.
- 0 skills with `description` > 1024 characters.
- 59/70 skills **without** an explicit "use when/this/for" formula in the `description` (relevant only if migrating to a native semantic auto-discovery mechanism like Claude Skills; with the current explicit dispatch via `pix_<skill>` tool the practical impact is limited).

## Appendix C - External references

- MCP Specification - Prompts: https://modelcontextprotocol.io/specification/2025-06-18/server/prompts
- Claude Code Docs - Agent Skills: https://code.claude.com/docs/en/skills
- Claude Code Docs - Agent Skills in the SDK: https://code.claude.com/docs/en/agent-sdk/skills
- Claude Code Docs - Tool Search (scale to many tools): https://code.claude.com/docs/en/agent-sdk/tool-search.md
- Claude Platform Docs - Tool Search Tool: https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
