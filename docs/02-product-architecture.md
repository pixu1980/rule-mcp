# rule-mcp - Product and architecture

What this server is, how it is put together, and why. It describes what
the code does today; the decisions that got it here are in the ADRs.

## 1. Overview

**Name:** rule-mcp  
**Version:** 0.1.0  
**Ecosystem:** MCP server for rule-* skill ecosystem  
**Stack:** Pure Node.js (currently zero pnpm dependencies)  
**Language:** JavaScript (ESM)

### Mission

Serve rule-* skill rules, styleguides, component templates, and framework best practices directly to AI coding agents via MCP - without leaving the editor. Bypass the LLM for well-defined patterns; enrich context when LLM reasoning is needed.

### Current surface

The inventories live in one generated source - `scripts/reports/census/index.mjs`,
refreshed by `pnpm census` (on every build and every pre-commit) - and are
rendered into dedicated registry files that the docs link to instead of
re-listing:

- **Skills** -> [`docs/08-skills.md`](./08-skills.md)
- **Tools (all LLM-free, deterministic)** -> [`docs/09-tools.md`](./09-tools.md)
- **Prompts** -> [`docs/10-prompts.md`](./10-prompts.md)
- **Instructions / agent command surface** -> [`docs/11-instructions.md`](./11-instructions.md)
- **CLI reference (commands, options, arguments)** -> [`docs/12-cli.md`](./12-cli.md)
- **Personas** -> [`docs/13-personas.md`](./13-personas.md)
- **Guardrails** -> [`docs/14-guardrails.md`](./14-guardrails.md)
- **Resources** -> [`docs/15-resources.md`](./15-resources.md)

Tool-family counts for this document: the generated snapshot at the end of
this file.

## 2. Architecture principles

1. **Local-first** - everything runs on the user's machine. No cloud, no API keys, no telemetry (opt-in only). Skills live at `~/.agents/skills/`.
2. **LLM-free by default** - well-defined patterns (templates, guardrails, scaffolding) serve responses without any model call. LLM is only consulted for novel/unstructured tasks.
3. **MCP-native** - full compliance with the MCP specification via the official TypeScript SDK. Supports stdio (agents) and SSE (IDEs, web UIs).
4. **Framework-agnostic** - 10+ rule-* skills served through a unified interface. Adding a new skill = adding a directory.
5. **Stateless** - no database, no state files beyond daemon PID. Skill content is read from disk on every request (with in-memory LRU cache).
6. **Vanilla JS** - pure Node.js ESM. No TypeScript compilation step. JSDoc for documentation. SDK consumed as plain ESM.

## 3. High-level architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        MCP Client (Agent)                        │
│           Claude / Codex / Cursor / Copilot / Gemini / etc.      │
└──────────────────────┬───────────────────────────────────────────┘
                       │ MCP Protocol (JSON-RPC 2.0)
                       │ stdio or SSE transport
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     rule-mcp Server                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │            MCP SDK (@modelcontextprotocol/sdk)            │       │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │         │
│  │  │ Server Class │  │ Transport    │  │ Capabilities   │  │        │
│  │  │ (tool/res/   │  │ StdioServer  │  │ tools: {}      │  │        │
│  │  │  prompt reg) │  │ SSEServer    │  │ resources: {}  │  │        │
│  │  └─────────────┘  └──────────────┘  │ prompts: {}    │  │         │
│  │                                      │ logging: {}    │  │        │
│  │                                      └────────────────┘  │        │
│  └──────────────────────────────────────────────────────────┘        │
│                              │                                       │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │                    Tool Handlers                           │      │
│  │  ┌─────────────┐ ┌──────────┐ ┌───────────┐ ┌─────────┐  │        │
│  │  │ rule         │ │ pix_*    │ │ rule_tool_check │ │ pix_    │  │   │
│  │  │ (router)    │ │ (skills) │ │(blocking) │ │ search  │  │        │
│  │  └─────────────┘ └──────────┘ └───────────┘ └─────────┘  │        │
│  │  ┌─────────────┐ ┌──────────┐ ┌───────────┐ ┌─────────┐  │        │
│  │  │ pix_        │ │ pix_     │ │ pix_      │ │ pix_    │  │        │
│  │  │ architect   │ │ component│ │ scaffold  │ │ detect  │  │        │
│  │  │(scaffold +  │ │          │ │           │ │(future) │  │        │
│  │  │ interview)  │ │          │ │           │ │         │  │        │
│  │  └─────────────┘ └──────────┘ └───────────┘ └─────────┘  │        │
│  └──────────────────────────────────────────────────────────┘        │
│                              │                                       │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │                     Core Services                          │      │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐   │        │
│  │  │ Skills      │ │ Guardrails   │ │ Template Engine  │   │        │
│  │  │ Loader      │ │ Engine       │ │ (25 patterns)   │   │         │
│  │  │ (FS + cache)│ │ (25 checks)  │ │                  │   │        │
│  │  └─────────────┘ └──────────────┘ └──────────────────┘   │        │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐   │        │
│  │  │ Semantic    │ │ Project      │ │ Installer        │   │        │
│  │  │ Search      │ │ Detector     │ │ (15 agents)      │   │        │
│  │  │ (BM25)      │ │ (package.json)│ │                  │   │       │
│  │  └─────────────┘ └──────────────┘ └──────────────────┘   │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Enforcement boundary

Every `callTool()` crosses mandatory gates:

1. Zod argument schema validation.
2. `preprocessToolCall()` fail-closed checks: payload size, nesting depth, key count, prototype-pollution keys, NUL controls, normalized routing fields, non-blank `pix_tool` prompt.
3. Registered mandatory before hooks.
4. Deterministic handler execution.
5. Registered mandatory post hooks.
6. `postprocessToolResult()` validates MCP content shape/size and verifies `pix_tool` routes and `next_tools` against live registries.
7. Successful response receives `_meta.pixEnforcement` audit metadata and visible compliance contract.
8. Observational after hooks run asynchronously only after enforcement passes.

`rule_tool_check` failures use `isError: true`; downstream model cannot treat failed code as approved.

## 4. MCP SDK integration

### Server initialization (`src/server/index.js`)

```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/server/index.js";

/** @type {Server} */
const server = new Server({ name: "rule-mcp", version: pkg.version }, { capabilities: { tools: {}, resources: {}, prompts: {}, logging: {} } });

// Zod validates input at runtime - no TS needed
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: registry.getToolDefinitions(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return registry.execute(name, args ?? {});
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool Definition Pattern

```javascript
// Before (current): no validation at all
registerTool({
  name: "rule_tool_component",
  handler: async (args) => { ... }
});

// After (SDK + Zod): runtime-validated input
import { z } from "zod";

const ComponentArgs = z.object({
  component: z.enum(["button", "card", "modal", "formField", "list", "nav"]),
  framework: z.enum(["vanilla", "react", "vue", "svelte", "angular", "solid", "astro"]).default("vanilla"),
  mode: z.enum(["generate", "guardrails"]).default("generate"),
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "rule_tool_component") {
    const args = ComponentArgs.parse(request.params.arguments);
    // args is validated and typed via JSDoc + Zod
  }
});
```

## 5. Data flow

```
                         ┌──────────────────────┐
                         │   User prompt        │
                         │  "React button"      │
                         └──────────┬───────────┘
                                    │
                          MCP calls `pix_tool`
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  rule (router)                                                       │
│  • Prompt → keyword analysis                                        │
│  • Score skills by keyword match                                    │
│  • Return top-3 ranked skills + confidence scores                   │
│  • Result: ["rule-frontend-react (92%)", "rule_tool_component (88%)"] │
└───────────────────────┬─────────────────────────────────────────────┘
                        │
            MCP calls `rule_tool_frontend_react` + `rule_tool_component`
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│  rule_tool_frontend_react (skill tool)                                │
│  • mode=full → full SKILL.md                                         │
│  • mode=summary → first 30 lines                                     │
│  • mode=search → grep matching lines                                 │
│  • mode=guardrails → list checkable assertions                       │
│  • mode=check → validate code against guardrails                     │
└───────────────────────┬──────────────────────────────────────────────┘
                        │
            MCP calls `rule_tool_component`
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  rule_tool_component (LLM-free generator)                   │
│  • component=button, framework=react                       │
│  • Returns: JSX + CSS code blocks                          │
│  • Zero LLM context consumed                               │
│  • ~200 tokens saved per call                              │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  Agent generates final code                                │
│  • Uses React skill rules as context                       │
│  • Uses component template as base                         │
│  • Applies guardrails via rule_tool_check                   │
│  • Iterates: generate → check → fix → until pass           │
└────────────────────────────────────────────────────────────┘
```

## 6. Token-saving architecture

### LLM-Free Execution Paths

These tools return complete responses without ANY LLM call:

| Tool                       | Response Type                            | Avg Tokens Saved |
| -------------------------- | ---------------------------------------- | ---------------- |
| `rule_tool_component`       | Full component code (JSX + CSS)          | ~500/call        |
| `rule_tool_check`           | Guardrail pass/fail with fix suggestions | ~400/call        |
| `rule_tool_scaffold`        | Complete config file content             | ~200/call        |
| `rule_tool_search`          | Grep results from skill files            | ~150/call        |
| `pix_tool`                 | Ranked skill suggestions                 | ~100/call        |
| `rule_tool_detect` (future) | Project framework analysis               | ~300/session     |

### Context-Aware Routing (saves ~200 tokens/call)

Instead of returning full skill files, `pix_tool` returns:

```json
{
  "route": "rule-frontend-react",
  "confidence": 0.92,
  "sections": ["Component Patterns", "Hooks Rules", "Performance"],
  "next_tools": ["rule_tool_component(button, react)", "rule_tool_frontend_react(mode=search, query=useMemo)"]
}
```

This lets the LLM call only the relevant sections instead of loading entire skill files.

### Caching Strategy

```
Skill read → LRU Cache (TTL: 5 min, max: 50 items)
           → Cache hit: return immediately (zero I/O)
           → Cache miss: read from FS → cache → return
           → `rule-mcp skills reload` → flush cache
```

### Progressive Context Loading

```
1st call: rule("React button") → route + confidence
2nd call: rule_tool_frontend_react(mode=summary)    → skill overview (30 lines)
3rd call: rule_tool_frontend_react(mode=search, query="component") → relevant lines
4th call: rule_tool_component(button, react) → full template code
5th call: rule_tool_check(skill=rule-frontend-react, code=...) → guardrail results
```

Each step adds minimal context. The LLM only sees what it needs.

## 7. Transport layer

### stdio (default)

```
MCP Client               rule-mcp
    │                          │
    │── JSON-RPC request ─────→│ stdin
    │←── JSON-RPC response ────│ stdout
    │                          │
    │←── diagnostics ──────────│ stderr
```

Used by: Claude, Codex, Cursor, Cline, Roo, Zed, Devin, OpenCode, etc.

### SSE (daemon mode)

```
MCP Client               rule-mcp (HTTP server)
    │                          │
    │── POST /message ───────→│ SSE endpoint
    │←── SSE stream ──────────│ EventSource
    │                          │
    │←── GET /health ─────────│ Health check
```

Used by: VSCode, custom IDEs, web UIs, remote connections.

### Implementation (SDK, vanilla JS)

```javascript
// stdio
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
const transport = new StdioServerTransport();
await server.connect(transport);

// SSE
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
const app = express();
app.get("/sse", (req, res) => {
  const transport = new SSEServerTransport("/message", res);
  server.connect(transport);
});
app.post("/message", (req, res) => {
  transport.handlePostMessage(req, res);
});
```

## 8. Skill loading and priority

```
1. Embedded:  skills/<rule-*/SKILL.md>   (bundled at build/publish time)
2. Home:      ~/.agents/skills/<rule-*>/ (user overrides)

Home takes priority over embedded.
Reload: `rule-mcp skills reload` → flush LRU → re-scan both dirs.
```

### Skill Metadata (parsed from SKILL.md YAML frontmatter)

```yaml
---
name: rule-frontend-react
description: React 18+ best practices with rule principles
frameworks: [react]
tags: [react, jsx, hooks, component, frontend]
---
```

This metadata powers:

- `pix_tool` routing (keyword → skill matching)
- `rule_tool_search` indexing (tag-based + full-text)
- Auto-detection from project `package.json` → `pix_<detected-framework>`

## 9. Resource URI scheme

```
rule://skills                              → Skill index (JSON)
rule://templates                           → Template catalog (JSON)
rule://ai                                 → rule SKILL.md (MD)
rule://<skill-name>                        → Full skill (MD)
rule://<skill-name>/summary                → Skill summary (first 30 lines)
rule://<skill-name>/<section>              → Specific section (MD)
rule://a11y                                → A11y guide (MD)
rule://a11y/test-basic                     → Basic a11y test (code)
rule://a11y/test-forms                     → Forms a11y test (code)
rule://project/<path>                      → Project analysis (JSON)
```

Resource templates (SDK `ResourceTemplate`) enable dynamic URI patterns:

```javascript
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const match = uri.match(/^rule:\/\/(rule-\w+)(?:\/(\w+))?$/);
  if (match) {
    const [, skillName, section] = match;
    return readSkillResource(skillName, section);
  }
});
```

## 10. Vanilla JS approach

We use the official `@modelcontextprotocol/sdk` **as published** - it ships as JavaScript (ESM + CJS) with `.d.ts` declaration files. No need for a separate vanilla-js fork.

| Aspect            | Approach                                                                            |
| ----------------- | ----------------------------------------------------------------------------------- |
| **SDK usage**     | Import as ESM: `import { Server } from "@modelcontextprotocol/sdk/server/index.js"` |
| **Validation**    | `zod` at runtime: `z.object({...}).parse(args)`                                     |
| **Documentation** | JSDoc for all public functions, types in `@param` / `@returns` tags                 |
| **Build step**    | None (`node src/index.js` directly)                                                 |
| **Test**          | `vitest` with `--experimental-vm-modules` or `node --test`                          |
| **Declaration**   | No `.d.ts` needed - Zod + JSDoc cover documentation                                 |

```javascript
/**
 * @param {z.infer<typeof ComponentArgs>} args - Validated component args
 * @returns {Promise<CallToolResult>}
 */
async function handleComponent(args) {
  // args is fully typed via Zod inference + JSDoc
  const { component, framework } = args;
  // ...
}
```

## 11. Security model

- **No network calls** (except SSE daemon mode, which is opt-in)
- **No telemetry by default** - opt-in `doctor` report only
- **No code execution** - tools read files and match text patterns
- **No user data collection**
- **No external API keys**

All data stays on the filesystem. The MCP server is a read-only/validate-only service for skill content.

## 12. Platform support

| Platform | Package          | Method                                  |
| -------- | ---------------- | --------------------------------------- |
| macOS    | Homebrew         | `brew install rule/tap/rule-mcp`   |
| macOS    | Clone + launcher | `git clone` + `./scripts/install.sh`    |
| Linux    | Clone + launcher | `git clone` + `./scripts/install.sh`    |
| Linux    | Docker           | `docker pull rule-mcp/rule-mcp` |
| Windows  | Clone + launcher | `git clone` + `./scripts/install.ps1`   |
| Windows  | Winget           | `winget install rule/rule-mcp`     |
| All      | Direct download  | GitHub Releases `.tgz`                  |
| All      | pnpx             | `pnpx rule-mcp serve`             |

## 13. History and rationale

This document used to carry a second half: a gap analysis against the
official MCP SDK, a migration plan, and a recommendations list. All of it
shipped, so restating it here would describe a server nobody runs. The
decisions live where they can be dated and superseded:

- Replacing the hand-rolled JSON-RPC protocol with the official SDK: ADR 003 and ADR 014
- Vanilla JavaScript rather than TypeScript: ADR 002 and ADR 013
- File-based skill loading over a database: ADR 006 and ADR 016
- The folder-per-concern module tree and the 150-line ceiling: ADR 058
- The persona command surface: ADR 054

The release pipeline moved with them: it is documented beside the other
operational procedures in [02 tools and operations](./04-operations.md).

<!-- census:begin:family-counts -->

## Tools at a glance (generated census snapshot)

| Family                            | Count |
| --------------------------------- | ----- |
| Core tools                        | 16    |
| Per-skill tools (from `skills/*`) | 89    |
| `rule://` resources                | 184   |
| Skills (`skills/*/SKILL.md`)      | 89    |

Refresh with `pnpm census`; full inventories in `docs/07-` .. `docs/12-`.

<!-- census:end:family-counts -->

<!-- census:begin:surface-counts -->

## Surface at a glance

| Surface                   | Count | Defined in                                    |
| ------------------------- | ----- | --------------------------------------------- |
| MCP tools                 | 106   | `src/tools/*` via `src/tools/router/index.js` |
| - action tools            | 17    | one per module, registered explicitly         |
| - skill tools             | 89    | one per catalog skill, generated              |
| MCP resources             | 186   | `src/resources/index.js`                      |
| MCP prompts               | 76    | `src/prompts/index.js`                        |
| - reusable                | 19    | workflow and area prompts                     |
| - persona                 | 57    | 19 active roles x 3 operations                |
| Skills                    | 89    | `skills/rule-*/SKILL.md`                       |
| Review personas           | 19    | `src/core/review/roles/index.js`              |
| Guardrail rules           | 95    | `src/core/guardrails/index.js`                |
| Agent slash commands      | 77    | `src/core/agents/commands/index.js`           |
| Agent/IDE command targets | 13    | `src/core/agents/command-targets/index.js`    |
| CLI commands              | 22    | `src/cli/_program.js`                         |
| Hook events               | 3     | `src/core/agents/_hooks.js`                   |
| Architecture decisions    | 83    | [`docs/adr/ADR.md`](adr/ADR.md)               |

Regenerate with `pnpm census`. The inventories themselves are
[`08-skills.md`](08-skills.md) through [`15-resources.md`](15-resources.md).

<!-- census:end:surface-counts -->
