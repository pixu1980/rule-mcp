# rule-mcp - Product and architecture

Project mission, architecture, migration notes, and roadmap.

> Comprehensive analysis of current state, architecture gaps, and migration plan to official MCP SDK.  
> **Vanilla JS throughout** - no TypeScript compilation. SDK consumed as published ESM.

## 1. Project Overview

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

- **Skills** -> [`docs/06-skills.md`](./08-skills.md)
- **Tools (all LLM-free, deterministic)** -> [`docs/07-tools.md`](./09-tools.md)
- **Prompts** -> [`docs/08-prompts.md`](./10-prompts.md)
- **Instructions / agent command surface** -> [`docs/09-instructions.md`](./11-instructions.md)
- **CLI reference (commands, options, arguments)** -> [`docs/10-cli.md`](./12-cli.md)
- **Personas** -> [`docs/11-personas.md`](./13-personas.md)
- **Guardrails** -> [`docs/12-guardrails.md`](./14-guardrails.md)
- **Resources** -> [`docs/13-resources.md`](./15-resources.md)

Tool-family counts for this document: the generated snapshot at the end of
this file.

---

## 2. Current Architecture

```
bin/rule-mcp.js     → CLI entry
src/cli.js                → CLI dispatcher (parse args → route)
├─ src/mcp/
│   ├── stdio.js          → Raw stdin parse (Content-Length framing)
│   └── protocol.js       → Custom JSON-RPC handler (hand-rolled MCP protocol)
├─ src/tools/
│   └── router.js         → Tool registry ([] of {name, description, inputSchema, handler})
├─ src/core/
│   ├── skills.js         → Load skills → register MCP tools
│   ├── guardrails.js     → 17 check functions for code validation
│   └── templates.js      → Component template definitions
├─ src/cli/
│   ├── install.js        → Agent/IDE config writer (15 agents)
│   └── paths.js          → Runtime path resolution
```

### Protocol Implementation

The current MCP protocol is **hand-rolled**:

- `stdio.js`: Custom line-buffered parser for `Content-Length: N\r\n\r\n<body>` framing
- `protocol.js`: Manual JSON-RPC dispatch for methods: `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`, `prompts/list`, `prompts/get`
- No transport abstraction - stdio only (daemon mode spawns `serve` as child process)
- No Zod/type validation - schemas are plain objects without enforcement
- No proper error codes (all errors get `-32603`)
- No capability negotiation beyond `{ tools: {}, resources: {}, prompts: {} }`
- Protocol version hardcoded as `"2025-12-11"`

### Strengths

1. **Zero dependencies** - truly pure Node.js
2. **Local-first** - all skills live on filesystem, no network calls
3. **LLM-free tools** - `rule_tool_component`, `rule_tool_check`, `rule_tool_scaffold`, `rule_tool_search` work without any AI
4. **Guardrail engine** - 17 testable assertions for code quality, extensible per-framework
5. **15 agent installers** - Claude, Codex, Cursor, Copilot, Gemini, VSCode, Cline, Roo, Zed, etc.
6. **Embedded + overridable skills** - bundled at build time, can be overridden by `~/.agents/skills/`

### Weaknesses

1. **No official MCP SDK** - hand-rolled protocol breaks if MCP spec evolves
2. **No Zod validation** - `inputSchema` is documentation-only, no runtime enforcement
3. **No SSE transport** - daemon is just a spawned child process, not a real HTTP server
4. **No logging infrastructure** - `process.stderr.write` only
5. **No tool call cancellation** - no abort support
6. **No streaming results** - all results are single `{ content: [...] }` blocks
7. **No notification support** (e.g. `notifications/initialized`)
8. **No proper error taxonomy** - all errors are `-32603` (Internal error)
9. **No standardized test framework** - single smoke test, no unit tests
10. **Skill embedding at build time** - requires `node scripts/build/embed-skills/index.mjs` before every release
11. **CI not exhaustive** - no linting, no test coverage, no audit

---

## 3. Gap Analysis: Official MCP SDK (`@modelcontextprotocol/sdk`)

### SDK is published as ESM+CJS - works with vanilla JS out of the box

```
pnpm add @modelcontextprotocol/sdk zod
```

No TypeScript compilation needed. The SDK ships JavaScript with `.d.ts` declarations for those who want IDE hints, but the runtime is plain JS.

### What the SDK provides vs current custom impl

| Feature                      | Current (hand-rolled)                       | `@modelcontextprotocol/sdk`                             |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| Protocol version negotiation | Hardcoded `"2025-12-11"`                    | Automatic via `Server` class                            |
| Transport                    | Custom stdio line parser                    | `StdioServerTransport` (battle-tested)                  |
| SSE/HTTP transport           | ❌ (hand-rolled child process)              | `SSEServerTransport` (full HTTP server)                 |
| Tool registration            | `[]push({ name, handler })`                 | `server.setRequestHandler(ListToolsRequestSchema, ...)` |
| Input schema                 | Plain object (doc only)                     | Zod schemas with runtime validation                     |
| Resource templates           | ❌                                          | `ResourceTemplate` with URI pattern matching            |
| Streaming results            | ❌                                          | `CallToolResultSchema` + streaming support              |
| Error codes                  | `-32603` for everything                     | Proper `McpError` + typed error codes                   |
| Capability negotiation       | `{ tools: {}, resources: {}, prompts: {} }` | Declared via `server.registerCapabilities()`            |
| Logging                      | `process.stderr.write`                      | Built-in `logging/setLevel` notifications               |
| Ping/health                  | ❌                                          | `ping` request handler                                  |
| Cancellation                 | ❌                                          | `notifications/cancelled` support                       |
| Progress notifications       | ❌                                          | `notifications/progress` support                        |
| Roots support                | ❌                                          | `roots/list` capability                                 |
| Sampling support             | ❌                                          | `sampling/createMessage` capability                     |
| Completion support           | ❌                                          | `completions/complete` for dynamic arg suggestions      |
| MCP spec updates             | Manual sync required                        | SDK tracks spec automatically                           |

### Migration Complexity

- **Code volume:** ~1,800 lines hand-rolled protocol + tools → ~1,200 lines with SDK
- **API surface preserved:** All 14 tools, 6 resources, 4 prompts remain exactly the same
- **Breaking changes:** None for MCP clients (protocol is backward-compatible)
- **New capabilities unlocked:** SSE, streaming, completion, logging, cancellation
- **Dependencies added:** 2 (`@modelcontextprotocol/sdk` + `zod`)
- **Build step:** Still zero - `node src/index.js serve` just works

---

## 4. Skills Analysis

### 9 rule-* skills available

| Skill                         | Files                           | Lines  | Maturity  |
| ----------------------------- | ------------------------------- | ------ | --------- |
| rule-styleguide                | 8 (.md)                         | ~2,500 | ✅ Mature |
| rule-frontend-vanilla-reactive | 3 (md + patterns + tests)       | ~1,200 | ✅ Mature |
| rule-frontend-react            | 4 (md + checklists + knowledge) | ~800   | ✅ Stable |
| rule-frontend-vue              | 4                               | ~700   | ✅ Stable |
| rule-frontend-angular          | 4                               | ~700   | ✅ Stable |
| rule-frontend-svelte           | 4                               | ~650   | ✅ Stable |
| rule-frontend-solidjs          | 4                               | ~600   | ✅ Stable |
| rule-frontend-meta-astro       | 4                               | ~550   | ✅ Stable |
| rule-electron                  | 4                               | ~800   | ✅ Stable |
| rule                           | 1 (SKILL.md)                    | ~200   | ✅ Mature |

### Content types per skill

- `SKILL.md` - Main documentation + quick reference
- `checklists/` - Per-task checklists for code review
- `examples/` - Code examples showing rule principles
- `knowledge/` - Deep-dive knowledge base files
- `prompts/` - Reusable prompt templates
- `templates/` - File templates for scaffolding

---

## 5. Token-Saving Opportunities

### Already implemented (LLM-free)

| Tool                                       | Saves tokens by                                                 |
| ------------------------------------------ | --------------------------------------------------------------- |
| `rule_tool_component button react`          | Returns full React button code directly - no LLM prompt needed  |
| `rule_tool_check skill=rule-frontend-react`  | Validates code against 17 guardrails - no LLM needed for review |
| `rule_tool_scaffold file=.prettierrc`       | Returns exact file content - no LLM context needed              |
| `rule_tool_search query="component naming"` | Greps skill files - no LLM search needed                        |

### Planned improvements

| Enhancement               | Tokens saved    | Implementation                                                          |
| ------------------------- | --------------- | ----------------------------------------------------------------------- |
| **Context-aware routing** | ~200/task       | `pix_tool` returns only RELEVANT skill sections, not full files         |
| **Template engine**       | ~500/component  | Generate complete files with variable interpolation (name, props, etc.) |
| **Project detector**      | ~300/session    | Auto-detect framework from `package.json`, return only relevant tools   |
| **Code generator**        | ~1000/component | Full file generation (component + CSS + barrel + test) from single call |
| **Checklist executor**    | ~400/review     | Return only failed checklist items as context, not full checklist       |
| **Semantic search**       | ~200/query      | BM25 search on skill content, return only matching sections             |
| **Multi-file scaffold**   | ~800/project    | Generate entire project structure in one call                           |
| **Cache layer**           | ~100/call       | Cache skill reads in memory, re-scan only on `skills reload`            |

### LLM-required vs LLM-free decision tree

```
User prompt
    │
    ▼
Is it a known pattern?
    │
    ├── ✅ YES (component template, config file, guardrail check, scaffold)
    │       └── Serve directly → ZERO tokens consumed
    │
    ├── 🔶 PARTIAL (skill knowledge, code review, search)
    │       └── Server returns curated context → LLM uses MINIMAL tokens
    │
    └── ❌ NO (novel code, complex logic, user-specific requirements)
            └── Server returns FULL skill context + suggests next tool
```

---

## 6. Release Pipeline (Current)

### CI (`.github/workflows/ci.yml`)

- ✅ Matrix: ubuntu, macos, windows
- ✅ Node 20
- ✅ Syntax check on all `.js` files
- ✅ Smoke test
- ❌ **No linting** (eslint)
- ❌ **No unit tests** (vitest)
- ❌ **No spell check**
- ❌ **No dependency audit**
- ❌ **No coverage reporting**

### Release (`.github/workflows/release.yml`)

- ✅ pnpm publish with provenance
- ✅ Homebrew formula generation
- ✅ GitHub release with assets
- ❌ **No Docker image**
- ❌ **No Winget/Scoop support**
- ❌ **No Windows MSI installer**
- ❌ **No macOS .pkg installer**
- ❌ **No automated version bump**

---

## 7. Recommendations Summary

| Priority | Change                              | Rationale                                                     |
| -------- | ----------------------------------- | ------------------------------------------------------------- |
| **P0**   | Port to `@modelcontextprotocol/sdk` | Protocol compliance, transport abstraction, SSE, proper types |
| **P0**   | Add Zod validation                  | Catch invalid args before execution                           |
| **P1**   | Implement SSE transport             | Replace hand-rolled daemon with real HTTP server              |
| **P1**   | Add streaming results               | Long-running tools (search, check) can stream progress        |
| **P1**   | Improve token-saving tools          | Context-aware routing, BM25 search, multi-file generation     |
| **P2**   | Add Docker support                  | Containerized deployment                                      |
| **P2**   | Add Windows packaging               | MSI installer, Winget                                         |
| **P2**   | Add macOS packaging                 | .pkg, Homebrew cask                                           |
| **P2**   | Improve CI/CD                       | Linting, vitest, audit, automated versioning                  |
| **P3**   | Add telemetry (opt-in)              | Usage patterns for prioritization                             |
| **P3**   | Add plugin system                   | Third-party skill support                                     |

### Key architectural decision: Vanilla JS, no TypeScript

The official `@modelcontextprotocol/sdk` publishes JavaScript (ESM + CJS) with embedded `.d.ts` types. We consume it as plain ESM. Type safety comes from:

- **Runtime validation**: Zod schemas on every tool input
- **Documentation**: JSDoc on all public functions
- **IDE hints**: Editors use the SDK's `.d.ts` files automatically

No `tsconfig.json`, no `tsc` build step, no `.ts` files. The project stays as JavaScript, gaining SDK protocol compliance without losing its zero-compile, instant-iterate workflow.

## Preserved source: `ARCHITECTURE.md`

> Original path: `docs/ARCHITECTURE.md`  
> SHA-256: `ff26dcc6d43deceb60d6c5ef1b1f2df1360140acc2a27906f9286e0cad6d47c5`

# rule-mcp - Architecture

> Target architecture with `@modelcontextprotocol/sdk` (vanilla JS).  
> A local-first MCP server for the rule-* skill ecosystem - zero-dependency frontend rules, templates, and guardrails delivered at the speed of the filesystem.

---

## 1. Architecture Principles

1. **Local-first** - everything runs on the user's machine. No cloud, no API keys, no telemetry (opt-in only). Skills live at `~/.agents/skills/`.
2. **LLM-free by default** - well-defined patterns (templates, guardrails, scaffolding) serve responses without any model call. LLM is only consulted for novel/unstructured tasks.
3. **MCP-native** - full compliance with the MCP specification via the official TypeScript SDK. Supports stdio (agents) and SSE (IDEs, web UIs).
4. **Framework-agnostic** - 10+ rule-* skills served through a unified interface. Adding a new skill = adding a directory.
5. **Stateless** - no database, no state files beyond daemon PID. Skill content is read from disk on every request (with in-memory LRU cache).
6. **Vanilla JS** - pure Node.js ESM. No TypeScript compilation step. JSDoc for documentation. SDK consumed as plain ESM.

---

## 2. High-Level Architecture

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

---

## 3. Module Tree (Target)

```
rule-mcp/
├── package.json                  ← + @modelcontextprotocol/sdk, zod
├── src/
│   ├── index.js                  ← CLI entry point
│   ├── server.js                 ← MCP Server bootstrap (SDK Server class)
│   ├── config.js                 ← Runtime config (paths, versions)
│   │
│   ├── transport/
│   │   ├── stdio.js              ← StdioServerTransport (SDK)
│   │   └── sse.js                ← SSEServerTransport (SDK) for IDE daemon
│   │
│   ├── tools/
│   │   ├── index.js              ← Tool registration & barrel
│   │   ├── ai.js                ← rule router tool
│   │   ├── skill.js              ← pix_<skill> dynamic tool factory
│   │   ├── component.js          ← rule_tool_component template generator
│   │   ├── check.js              ← rule_tool_check guardrail validator
│   │   ├── scaffold.js           ← rule_tool_scaffold project scaffolder
│   │   └── search.js             ← rule_tool_search full-text search
│   │
│   ├── resources/
│   │   ├── index.js              ← Resource registration
│   │   └── skills.js             ← rule://* resource handlers
│   │
│   ├── prompts/
│   │   ├── index.js              ← Prompt registration
│   │   └── templates.js          ← Template prompt definitions
│   │
│   ├── core/
│   │   ├── enforcement.js       ← mandatory pre/postprocessing boundary
│   │   ├── skills.js             ← Skill file loader + LRU cache
│   │   ├── guardrails.js         ← 17 guardrail check functions
│   │   ├── templates.js          ← Component + test template definitions
│   │   ├── search.js             ← BM25/substring search engine
│   │   └── detector.js           ← Project framework detector
│   │
│   ├── cli/
│   │   ├── commands.js           ← CLI command handlers
│   │   ├── install.js            ← Agent config installer
│   │   └── doctor.js             ← Health check
│   │
│   └── utils/
│       ├── paths.js              ← Path resolution
│       └── cache.js              ← LRU cache for skill content
│
├── skills/                       ← Embedded at build time
│   ├── rule-styleguide/
│   ├── rule-frontend-react/
│   ├── rule-frontend-vue/
│   ├── rule-frontend-svelte/
│   ├── rule-frontend-solidjs/
│   ├── rule-frontend-angular/
│   ├── rule-frontend-meta-astro/
│   ├── rule-electron/
│   ├── rule-frontend-vanilla-reactive/
│   └── rule/
│
├── scripts/
│   ├── embed-skills.mjs          ← Copy ~/.agents/skills/rule-* → skills/
│   └── postinstall.mjs           ← Auto-embed on pnpm install
│
├── tests/
│   ├── unit/
│   │   ├── guardrails.test.js
│   │   ├── templates.test.js
│   │   ├── skills.test.js
│   │   └── search.test.js
│   ├── integration/
│   │   ├── mcp-tools.test.js     ← MCP protocol integration test
│   │   └── mcp-resources.test.js
│   └── smoke.test.js
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ANALYSIS.md
│   └── ROADMAP.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml                ← Lint, test
│       └── release.yml           ← pnpm, Homebrew, Docker, GitHub Release
│
└── server.json                   ← MCP registry manifest
```

---

## 4. MCP SDK Integration

### Server Initialization (`src/server.js`)

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
const server = new Server({ name: "rule-mcp", version: "0.2.0" }, { capabilities: { tools: {}, resources: {}, prompts: {}, logging: {} } });

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

---

## 5. Data Flow

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

---

## 6. Token-Saving Architecture

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

---

## 7. Transport Layer

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

---

## 8. Skill Loading & Priority

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

---

## 9. Resource URI Scheme

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

---

## 10. Dependencies (Target)

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.8.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0"
  }
}
```

Just 2 runtime deps (SDK + Zod). No TypeScript, no compilation step. Pure ESM.

---

## 11. Vanilla JS Approach

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

---

## 12. Security Model

- **No network calls** (except SSE daemon mode, which is opt-in)
- **No telemetry by default** - opt-in `doctor` report only
- **No code execution** - tools read files and match text patterns
- **No user data collection**
- **No external API keys**

All data stays on the filesystem. The MCP server is a read-only/validate-only service for skill content.

---

## 13. Platform Support

| Platform | Package          | Method                                     |
| -------- | ---------------- | ------------------------------------------ |
| macOS    | Homebrew         | `brew install pixu1980/tap/rule-mcp` |
| macOS    | Clone + launcher | `git clone` + `./scripts/install.sh`       |
| Linux    | Clone + launcher | `git clone` + `./scripts/install.sh`       |
| Linux    | Docker           | `docker pull pixu1980/rule-mcp`      |
| Windows  | Clone + launcher | `git clone` + `./scripts/install.ps1`      |
| Windows  | Winget           | `winget install pixu1980.rule-mcp`   |
| All      | Direct download  | GitHub Releases `.tgz`                     |
| All      | pnpx             | `pnpx rule-mcp serve`                |

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
| MCP tools                 | 110   | `src/tools/*` via `src/tools/router/index.js` |
| - action tools            | 19    | one per module, registered explicitly         |
| - skill tools             | 91    | one per catalog skill, generated              |
| MCP resources             | 190   | `src/resources/index.js`                      |
| MCP prompts               | 153   | `src/prompts/index.js`                        |
| - reusable                | 96    | workflow and area prompts                     |
| - persona                 | 57    | 19 active roles x 3 operations                |
| Skills                    | 91    | `skills/rule-*/SKILL.md`                       |
| Review personas           | 19    | `src/core/review/roles/index.js`              |
| Guardrail rules           | 8     | `src/core/guardrails/index.js`                |
| Agent slash commands      | 246   | `src/core/agents/commands/index.js`           |
| Agent/IDE command targets | 13    | `src/core/agents/command-targets/index.js`    |
| CLI commands              | 23    | `src/cli/_program.js`                         |
| Hook events               | 3     | `src/core/agents/_hooks.js`                   |
| Architecture decisions    | 108   | [`docs/adr/ADR.md`](adr/ADR.md)               |

Regenerate with `pnpm census`. The inventories themselves are
[`08-skills.md`](08-skills.md) through [`15-resources.md`](15-resources.md).

<!-- census:end:surface-counts -->
