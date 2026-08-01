# Product and architecture

Project mission, architecture, migration notes, and roadmap. This file consolidates the previous analysis/architecture/roadmap docs without dropping source content.

## Source preservation

Every source document below is preserved verbatim under its own heading so no project knowledge is lost during consolidation.

## Preserved source: `ANALYSIS.md`

> Original path: `docs/ANALYSIS.md`  
> SHA-256: `b75589534e7ca82579c14a1a3b749bf0c262a1da701ac9376d4b2d204425bc10`

# rule-mcp — Analysis

> Comprehensive analysis of current state, architecture gaps, and migration plan to official MCP SDK.  
> **Vanilla JS throughout** — no TypeScript compilation. SDK consumed as published ESM.

---

## 1. Project Overview

**Name:** rule-mcp  
**Version:** 0.1.0  
**Ecosystem:** MCP server for rule-* skill ecosystem  
**Stack:** Pure Node.js (currently zero pnpm dependencies)  
**Language:** JavaScript (ESM)

### Mission

Serve rule-* skill rules, styleguides, component templates, and framework best practices directly to AI coding agents via MCP — without leaving the editor. Bypass the LLM for well-defined patterns; enrich context when LLM reasoning is needed.

### Current Tools (14)

| Tool | Purpose | LLM-free? |
|------|---------|-----------|
| `pix_tool` | Route prompt to best skill | ✅ Yes (keyword matching) |
| `rule_tool_styleguide` | HTML/CSS/JS/a11y/naming rules | Partial |
| `rule_tool_frontend_vanilla_reactive` | Vanilla JS reactive pattern rules | Partial |
| `rule_tool_frontend_react` | React 18+ rule best practices | Partial |
| `rule_tool_frontend_vue` | Vue 3 Composition API rule rules | Partial |
| `rule_tool_frontend_svelte` | Svelte 5 runes rule rules | Partial |
| `rule_tool_frontend_solidjs` | SolidJS fine-grained reactivity rules | Partial |
| `rule_tool_frontend_angular` | Angular standalone component rules | Partial |
| `rule_tool_frontend_astro` | Astro islands architecture rules | Partial |
| `rule_tool_platform_desktop` | Electron app patterns | Partial |
| `rule_tool_search` | Full-text search across ALL skills | ✅ Yes (local grep) |
| `rule_tool_component` | Component template generation | ✅ Yes (template engine) |
| `rule_tool_architect` | Project architecture & agent infrastructure; scaffold .agents/, .context/, SDD docs; context interview wizard | ✅ Yes (template engine + context server) |
| `rule_tool_check` | Guardrail code validation (17 shared + 8 architect) | ✅ Yes (pure functions) |
| `rule_tool_scaffold` | Project config file generation | ✅ Yes (template engine) |

### Current Resources (6)

| URI | Purpose |
|-----|---------|
| `rule://skills` | JSON index of all skills |
| `rule://templates` | Component template catalog |
| `rule://ai` | rule skill full content |
| `rule://a11y` | A11y testing guide |
| `rule://a11y/test-basic` | Basic a11y test template |
| `rule://a11y/test-forms` | Forms a11y test template |

### Current Prompts (24)

| Name | Purpose |
|------|---------|
| `rule-a11y-audit` | Audit a11y end-to-end: WCAG 2.2 AA review + Playwright/axe-core tests |
| `rule-ai` | AI agent integrations |
| `rule-architect` | Context packs, interview flows (CLI + web), scaffolding |
| `rule-architect-scaffold` | Scaffold project with .agents/ + .context/ |
| `rule-backend` | Node, Express, Fastify, Hono, NestJS, GraphQL, API design, security |
| `rule-caveman` | Compressed communication, commits, reviews |
| `rule-code-review` | Review code against rule styleguides |
| `rule-data` | PostgreSQL, MySQL, SQLite, MongoDB, DuckDB, IndexedDB, SQL |
| `rule-devops` | Docker, GitLab CI, observability, testing, versioning |
| `rule-frontend` | React, Vue, Svelte, Angular, Solid, Astro, Next, Nuxt, Remix, vanilla |
| `rule-grill` | Structured questioning (grill-me, grill-with-docs) |
| `rule-handoff` | Compressed context handoff for a new session |
| `rule-meta` | Dispatcher/action toolset (gateway, apply, search, check, scaffold…) |
| `rule-new-feature` | Feature end-to-end with TDD + a11y + commit scope |
| `rule-platform` | Web, desktop, Expo, agent, library |
| `rule-process` | Code review, feature workflow, documentation, ADR, handoff, BMAD |
| `rule-pull-request` | Prepare PR: review + a11y + security + ADR + commit scope |
| `rule-setup-project` | Bootstrap project end-to-end (detect → scaffold → toolchain → architect context) |
| `rule-skills` | Skill discovery (find-skills) |
| `rule-styleguide` | a11y, CSS, HTML, JS, JSON, Markdown, naming, patterns, validation |
| `rule-tdd` | Test-driven development workflow |
| `rule-toolchain` | Vite, pnpm, Turborepo, Rspack, Parcel, TypeScript, ESLint, Biome, Husky, commits |
| `rule-ui` | UI design-system work |
| `rule-write-tests` | Write TDD + a11y + devops tests |

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
- No transport abstraction — stdio only (daemon mode spawns `serve` as child process)
- No Zod/type validation — schemas are plain objects without enforcement
- No proper error codes (all errors get `-32603`)
- No capability negotiation beyond `{ tools: {}, resources: {}, prompts: {} }`
- Protocol version hardcoded as `"2025-12-11"`

### Strengths

1. **Zero dependencies** — truly pure Node.js
2. **Local-first** — all skills live on filesystem, no network calls
3. **LLM-free tools** — `rule_tool_component`, `rule_tool_check`, `rule_tool_scaffold`, `rule_tool_search` work without any AI
4. **Guardrail engine** — 17 testable assertions for code quality, extensible per-framework
5. **15 agent installers** — Claude, Codex, Cursor, Copilot, Gemini, VSCode, Cline, Roo, Zed, etc.
6. **Embedded + overridable skills** — bundled at build time, can be overridden by `~/.agents/skills/`

### Weaknesses

1. **No official MCP SDK** — hand-rolled protocol breaks if MCP spec evolves
2. **No Zod validation** — `inputSchema` is documentation-only, no runtime enforcement
3. **No SSE transport** — daemon is just a spawned child process, not a real HTTP server
4. **No logging infrastructure** — `process.stderr.write` only
5. **No tool call cancellation** — no abort support
6. **No streaming results** — all results are single `{ content: [...] }` blocks
7. **No notification support** (e.g. `notifications/initialized`)
8. **No proper error taxonomy** — all errors are `-32603` (Internal error)
9. **No standardized test framework** — single smoke test, no unit tests
10. **Skill embedding at build time** — requires `node scripts/embed-skills.mjs` before every release
11. **CI not exhaustive** — no linting, no test coverage, no audit

---

## 3. Gap Analysis: Official MCP SDK (`@modelcontextprotocol/sdk`)

### SDK is published as ESM+CJS — works with vanilla JS out of the box

```
pnpm add @modelcontextprotocol/sdk zod
```

No TypeScript compilation needed. The SDK ships JavaScript with `.d.ts` declarations for those who want IDE hints, but the runtime is plain JS.

### What the SDK provides vs current custom impl

| Feature | Current (hand-rolled) | `@modelcontextprotocol/sdk` |
|---------|----------------------|---------------------------|
| Protocol version negotiation | Hardcoded `"2025-12-11"` | Automatic via `Server` class |
| Transport | Custom stdio line parser | `StdioServerTransport` (battle-tested) |
| SSE/HTTP transport | ❌ (hand-rolled child process) | `SSEServerTransport` (full HTTP server) |
| Tool registration | `[]push({ name, handler })` | `server.setRequestHandler(ListToolsRequestSchema, ...)` |
| Input schema | Plain object (doc only) | Zod schemas with runtime validation |
| Resource templates | ❌ | `ResourceTemplate` with URI pattern matching |
| Streaming results | ❌ | `CallToolResultSchema` + streaming support |
| Error codes | `-32603` for everything | Proper `McpError` + typed error codes |
| Capability negotiation | `{ tools: {}, resources: {}, prompts: {} }` | Declared via `server.registerCapabilities()` |
| Logging | `process.stderr.write` | Built-in `logging/setLevel` notifications |
| Ping/health | ❌ | `ping` request handler |
| Cancellation | ❌ | `notifications/cancelled` support |
| Progress notifications | ❌ | `notifications/progress` support |
| Roots support | ❌ | `roots/list` capability |
| Sampling support | ❌ | `sampling/createMessage` capability |
| Completion support | ❌ | `completions/complete` for dynamic arg suggestions |
| MCP spec updates | Manual sync required | SDK tracks spec automatically |

### Migration Complexity

- **Code volume:** ~1,800 lines hand-rolled protocol + tools → ~1,200 lines with SDK
- **API surface preserved:** All 14 tools, 6 resources, 4 prompts remain exactly the same
- **Breaking changes:** None for MCP clients (protocol is backward-compatible)
- **New capabilities unlocked:** SSE, streaming, completion, logging, cancellation
- **Dependencies added:** 2 (`@modelcontextprotocol/sdk` + `zod`)
- **Build step:** Still zero — `node src/index.js serve` just works

---

## 4. Skills Analysis

### 9 rule-* skills available

| Skill | Files | Lines | Maturity |
|-------|-------|-------|----------|
| rule-styleguide | 8 (.md) | ~2,500 | ✅ Mature |
| rule-frontend-vanilla-reactive | 3 (md + patterns + tests) | ~1,200 | ✅ Mature |
| rule-frontend-react | 4 (md + checklists + knowledge) | ~800 | ✅ Stable |
| rule-frontend-vue | 4 | ~700 | ✅ Stable |
| rule-frontend-angular | 4 | ~700 | ✅ Stable |
| rule-frontend-svelte | 4 | ~650 | ✅ Stable |
| rule-frontend-solidjs | 4 | ~600 | ✅ Stable |
| rule-frontend-astro | 4 | ~550 | ✅ Stable |
| rule-architect | 20+ (md + knowledge + assets + checklists + prompts + templates) | ~3,500 | ✅ Mature |
| rule-electron | 4 | ~800 | ✅ Stable |
| rule | 1 (SKILL.md) | ~200 | ✅ Mature |

### Content types per skill

- `SKILL.md` — Main documentation + quick reference
- `checklists/` — Per-task checklists for code review
- `examples/` — Code examples showing rule principles
- `knowledge/` — Deep-dive knowledge base files
- `prompts/` — Reusable prompt templates
- `templates/` — File templates for scaffolding

---

## 5. Token-Saving Opportunities

### Already implemented (LLM-free)

| Tool | Saves tokens by |
|------|----------------|
| `rule_tool_component button react` | Returns full React button code directly — no LLM prompt needed |
| `rule_tool_check skill=rule-frontend-react` | Validates code against 17 guardrails — no LLM needed for review |
| `rule_tool_scaffold file=.prettierrc` | Returns exact file content — no LLM context needed |
| `rule_tool_search query="component naming"` | Greps skill files — no LLM search needed |

### Planned improvements

| Enhancement | Tokens saved | Implementation |
|-------------|-------------|----------------|
| **Context-aware routing** | ~200/task | `pix_tool` returns only RELEVANT skill sections, not full files |
| **Template engine** | ~500/component | Generate complete files with variable interpolation (name, props, etc.) |
| **Project detector** | ~300/session | Auto-detect framework from `package.json`, return only relevant tools |
| **Code generator** | ~1000/component | Full file generation (component + CSS + barrel + test) from single call |
| **Checklist executor** | ~400/review | Return only failed checklist items as context, not full checklist |
| **Semantic search** | ~200/query | BM25 search on skill content, return only matching sections |
| **Multi-file scaffold** | ~800/project | Generate entire project structure in one call |
| **Cache layer** | ~100/call | Cache skill reads in memory, re-scan only on `skills reload` |

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

| Priority | Change | Rationale |
|----------|--------|-----------|
| **P0** | Port to `@modelcontextprotocol/sdk` | Protocol compliance, transport abstraction, SSE, proper types |
| **P0** | Add Zod validation | Catch invalid args before execution |
| **P1** | Implement SSE transport | Replace hand-rolled daemon with real HTTP server |
| **P1** | Add streaming results | Long-running tools (search, check) can stream progress |
| **P1** | Improve token-saving tools | Context-aware routing, BM25 search, multi-file generation |
| **P2** | Add Docker support | Containerized deployment |
| **P2** | Add Windows packaging | MSI installer, Winget |
| **P2** | Add macOS packaging | .pkg, Homebrew cask |
| **P2** | Improve CI/CD | Linting, vitest, audit, automated versioning |
| **P3** | Add telemetry (opt-in) | Usage patterns for prioritization |
| **P3** | Add plugin system | Third-party skill support |

### Key architectural decision: Vanilla JS, no TypeScript

The official `@modelcontextprotocol/sdk` publishes JavaScript (ESM + CJS) with embedded `.d.ts` types. We consume it as plain ESM. Type safety comes from:
- **Runtime validation**: Zod schemas on every tool input
- **Documentation**: JSDoc on all public functions
- **IDE hints**: Editors use the SDK's `.d.ts` files automatically

No `tsconfig.json`, no `tsc` build step, no `.ts` files. The project stays as JavaScript, gaining SDK protocol compliance without losing its zero-compile, instant-iterate workflow.

## Preserved source: `ARCHITECTURE.md`

> Original path: `docs/ARCHITECTURE.md`  
> SHA-256: `ff26dcc6d43deceb60d6c5ef1b1f2df1360140acc2a27906f9286e0cad6d47c5`

# rule-mcp — Architecture

> Target architecture with `@modelcontextprotocol/sdk` (vanilla JS).  
> A local-first MCP server for the rule-* skill ecosystem — zero-dependency frontend rules, templates, and guardrails delivered at the speed of the filesystem.

---

## 1. Architecture Principles

1. **Local-first** — everything runs on the user's machine. No cloud, no API keys, no telemetry (opt-in only). Skills live at `~/.agents/skills/`.
2. **LLM-free by default** — well-defined patterns (templates, guardrails, scaffolding) serve responses without any model call. LLM is only consulted for novel/unstructured tasks.
3. **MCP-native** — full compliance with the MCP specification via the official TypeScript SDK. Supports stdio (agents) and SSE (IDEs, web UIs).
4. **Framework-agnostic** — 10+ rule-* skills served through a unified interface. Adding a new skill = adding a directory.
5. **Stateless** — no database, no state files beyond daemon PID. Skill content is read from disk on every request (with in-memory LRU cache).
6. **Vanilla JS** — pure Node.js ESM. No TypeScript compilation step. JSDoc for documentation. SDK consumed as plain ESM.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Client (Agent)                        │
│           Claude / Codex / Cursor / Copilot / Gemini / etc.      │
└──────────────────────┬──────────────────────────────────────────┘
                       │ MCP Protocol (JSON-RPC 2.0)
                       │ stdio or SSE transport
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     rule-mcp Server                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            MCP SDK (@modelcontextprotocol/sdk)            │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ Server Class │  │ Transport    │  │ Capabilities   │  │   │
│  │  │ (tool/res/   │  │ StdioServer  │  │ tools: {}      │  │   │
│  │  │  prompt reg) │  │ SSEServer    │  │ resources: {}  │  │   │
│  │  └─────────────┘  └──────────────┘  │ prompts: {}    │  │   │
│  │                                      │ logging: {}    │  │   │
│  │                                      └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Tool Handlers                           │   │
│  │  ┌─────────────┐ ┌──────────┐ ┌───────────┐ ┌─────────┐  │   │
│  │  │ rule         │ │ pix_*    │ │ rule_tool_check │ │ pix_    │  │   │
│  │  │ (router)    │ │ (skills) │ │(blocking) │ │ search  │  │   │
│  │  └─────────────┘ └──────────┘ └───────────┘ └─────────┘  │   │
│  │  ┌─────────────┐ ┌──────────┐ ┌───────────┐ ┌─────────┐  │   │
│  │  │ pix_        │ │ pix_     │ │ pix_      │ │ pix_    │  │   │
│  │  │ architect   │ │ component│ │ scaffold  │ │ detect  │  │   │
│  │  │(scaffold +  │ │          │ │           │ │(future) │  │   │
│  │  │ interview)  │ │          │ │           │ │         │  │   │
│  │  └─────────────┘ └──────────┘ └───────────┘ └─────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Core Services                          │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐   │   │
│  │  │ Skills      │ │ Guardrails   │ │ Template Engine  │   │   │
│  │  │ Loader      │ │ Engine       │ │ (25 patterns)   │   │   │
│  │  │ (FS + cache)│ │ (25 checks)  │ │                  │   │   │
│  │  └─────────────┘ └──────────────┘ └──────────────────┘   │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐   │   │
│  │  │ Semantic    │ │ Project      │ │ Installer        │   │   │
│  │  │ Search      │ │ Detector     │ │ (15 agents)      │   │   │
│  │  │ (BM25)      │ │ (package.json)│ │                  │   │   │
│  │  └─────────────┘ └──────────────┘ └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
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
│   ├── rule-architect/             ← Project architecture & agent infrastructure
│   ├── rule-styleguide/
│   ├── rule-frontend-react/
│   ├── rule-frontend-vue/
│   ├── rule-frontend-svelte/
│   ├── rule-frontend-solidjs/
│   ├── rule-frontend-angular/
│   ├── rule-frontend-astro/
│   ├── rule-electron/
│   ├── rule-frontend-vanilla-reactive/
│   └── rule/
│
├── scripts/
│   ├── embed-skills.mjs          ← Copy ~/.agents/skills/rule-* → skills/
│   └── postinstall.mjs           ← Auto-embed on pnpm install
│
├── test/
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
const server = new Server(
  { name: "rule-mcp", version: "0.2.0" },
  { capabilities: { tools: {}, resources: {}, prompts: {}, logging: {} } }
);

// Zod validates input at runtime — no TS needed
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
                         ┌─────────────────────┐
                         │   User prompt        │
                         │  "React button"      │
                         └──────────┬──────────┘
                                    │
                          MCP calls `pix_tool`
                                    │
                                    ▼
┌──────────────────────────────────────────────────────┐
│  rule (router)                                   │
│  • Prompt → keyword analysis                          │
│  • Score skills by keyword match                      │
│  • Return top-3 ranked skills + confidence scores     │
│  • Result: ["rule-frontend-react (92%)", "rule_tool_component (88%)"] │
└───────────────────────┬──────────────────────────────┘
                        │
            MCP calls `rule_tool_frontend_react` + `rule_tool_component`
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  rule_tool_frontend_react (skill tool)                                │
│  • mode=full → full SKILL.md                           │
│  • mode=summary → first 30 lines                       │
│  • mode=search → grep matching lines                   │
│  • mode=guardrails → list checkable assertions          │
│  • mode=check → validate code against guardrails        │
└───────────────────────┬──────────────────────────────┘
                        │
            MCP calls `rule_tool_component`
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  rule_tool_component (LLM-free generator)                   │
│  • component=button, framework=react                   │
│  • Returns: JSX + CSS code blocks                     │
│  • Zero LLM context consumed                           │
│  • ~200 tokens saved per call                          │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  Agent generates final code                           │
│  • Uses React skill rules as context                  │
│  • Uses component template as base                    │
│  • Applies guardrails via rule_tool_check                   │
│  • Iterates: generate → check → fix → until pass      │
└──────────────────────────────────────────────────────┘
```

---

## 6. Token-Saving Architecture

### LLM-Free Execution Paths

These tools return complete responses without ANY LLM call:

| Tool | Response Type | Avg Tokens Saved |
|------|--------------|-----------------|
| `rule_tool_component` | Full component code (JSX + CSS) | ~500/call |
| `rule_tool_check` | Guardrail pass/fail with fix suggestions | ~400/call |
| `rule_tool_scaffold` | Complete config file content | ~200/call |
| `rule_tool_search` | Grep results from skill files | ~150/call |
| `pix_tool` | Ranked skill suggestions | ~100/call |
| `rule_tool_detect` (future) | Project framework analysis | ~300/session |

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

Used by: Claude, Codex, Cursor, Cline, Roo, Zed, Windsurf, OpenCode, etc.

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

We use the official `@modelcontextprotocol/sdk` **as published** — it ships as JavaScript (ESM + CJS) with `.d.ts` declaration files. No need for a separate vanilla-js fork.

| Aspect | Approach |
|--------|----------|
| **SDK usage** | Import as ESM: `import { Server } from "@modelcontextprotocol/sdk/server/index.js"` |
| **Validation** | `zod` at runtime: `z.object({...}).parse(args)` |
| **Documentation** | JSDoc for all public functions, types in `@param` / `@returns` tags |
| **Build step** | None (`node src/index.js` directly) |
| **Test** | `vitest` with `--experimental-vm-modules` or `node --test` |
| **Declaration** | No `.d.ts` needed — Zod + JSDoc cover documentation |

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
- **No telemetry by default** — opt-in `doctor` report only
- **No code execution** — tools read files and match text patterns
- **No user data collection**
- **No external API keys**

All data stays on the filesystem. The MCP server is a read-only/validate-only service for skill content.

---

## 13. Platform Support

| Platform | Package | Method |
|----------|---------|--------|
| macOS | Homebrew | `brew install rule/tap/rule-mcp` |
| macOS | pnpm | `pnpm add -g rule-mcp` |
| Linux | pnpm | `pnpm add -g rule-mcp` |
| Linux | Docker | `docker pull rule-mcp/rule-mcp` |
| Windows | pnpm | `pnpm add -g rule-mcp` |
| Windows | Winget | `winget install rule/rule-mcp` |
| All | Direct download | GitHub Releases `.tgz` |
| All | pnpx | `pnpx rule-mcp serve` |


## Preserved source: `ROADMAP.md`

> Original path: `docs/ROADMAP.md`  
> SHA-256: `4d8bb2ac194f3520775d0a8dd66a998d7082021c71b1adbba5d992633f47ab86`

# rule-mcp — Roadmap

> Execution plan for porting to `@modelcontextprotocol/sdk` (vanilla JS),  
> building a release pipeline matching tokensave standards,  
> and maximizing LLM-free tool execution.

---

## Phase 0: Foundation — Port to MCP SDK

**Goal:** Replace hand-rolled MCP protocol with official SDK.  
**Effort:** High (restructure entire MCP layer)  
**Risk:** Medium (protocol must remain backward-compatible)  
**Dependencies:** None

### Steps

- [x] **0.1** Add SDK + Zod dependencies
      - `@modelcontextprotocol/sdk ^1.29.0`, `zod ^4.4.3`
      - SDK works as ESM (`import { Server } from "@modelcontextprotocol/sdk/server/index.js"`)

- [x] **0.2** Implement SDK Server bootstrap (`src/server.js`)
      - `Server` instance with `rule-mcp` name + version
      - Capabilities: `tools`, `resources`, `prompts`, `logging`
      - `StdioServerTransport` (default)
      - `SetLevelRequest` handled automatically by SDK when `logging: {}` capability declared
      - `createServer()` exported for reuse by SSE transport

- [x] **0.3** Port tool system (`src/tools/`)
      - `ToolRegistry` in `src/tools/router.js` with `registerTool`, `listTools`, `callTool`
      - All 15 tools have Zod input schemas with runtime validation
      - Tools registered via SDK `setRequestHandler` in `src/server.js`
      - Ported 15 tools:
        - `pix_tool`, `pix_*` (10 skill tools), `rule_tool_search`, `rule_tool_component`,
          `rule_tool_architect`, `rule_tool_check`, `rule_tool_scaffold`

- [x] **0.4** Port resource system (`src/resources/`)
      - All `rule://*` URIs via SDK's `ReadResourceRequestSchema`
      - Dynamic `rule://<skill-name>/summary` (first 30 lines)
      - 6+ resources: `skills`, `templates`, `ai`, `a11y`, `a11y/test-basic`, `a11y/test-forms`, plus per-skill URIs

- [x] **0.5** Port prompt system (`src/prompts/`)
      - All 4 prompts via SDK's `GetPromptRequestSchema`
      - Plus `rule-architect-scaffold` (5 total)

- [x] **0.6** Remove obsolete files
      - `src/mcp/protocol.js` — deleted
      - `src/mcp/stdio.js` — deleted (replaced by `StdioServerTransport`)
      - `src/tools/router.js` — kept as ToolRegistry (rename in P1)
      - `src/cli.js` → `src/cli/commands.js` + `src/index.js` (Phase 1)

### Deliverables
- [x] All 15 tools work identically via SDK
- [x] All 6+ resources resolvable
- [x] All 5 prompts available
- [x] CLI commands unchanged: `serve`, `daemon` (upgraded in P2), `install`, `uninstall`, `tools`, `doctor`, `skills reload`
- [x] `rule-mcp doctor` reports SDK version (`1.29.0`)
- [x] Same modules, better SDK
- [x] Zero build step — `node src/index.js serve` works instantly

---

## Phase 1: Refactor Core Into Cleaner Modules

**Goal:** Split monolithic files (`skills.js`, `cli.js`) into focused, testable modules.  
**Effort:** Medium (mechanical refactor)  
**Risk:** Low (preserves all behavior)

### Steps

- [x] **1.1** Split `src/cli.js` → `src/cli/commands.js` + `src/index.js`
      - `commands.js`: 164 lines, named exports for every command
      - `index.js`: 106 lines, CLI entry → parse args → call command
      - `src/cli.js` — deleted

- [x] **1.2** Split `src/core/skills.js` → `src/core/skills.js` + `src/tools/skill.js` + `src/tools/architect.js`
      - `core/skills.js`: 289 lines — `loadAllSkills()`, LRU cache, YAML frontmatter parsing
      - `tools/skill.js`: 270 lines — dynamic tool registration (`registerSkillTool`, `registerSearchTool`, etc.)
      - `tools/architect.js`: 111 lines — context interview server

- [x] **1.3** Extract CLI commands into `src/cli/`
      - `doctor.js` — 84 lines, `runDoctor()` + `getSdkVersion()`
      - `install.js` — 194 lines (existing)
      - `uninstall.js` — 196 lines, actual removal logic for all 15 agents

- [x] **1.4** Add Zod schemas to ALL tools
      - Every tool has Zod `object({...})` with proper types, defaults, descriptions
      - Schema errors return user-friendly messages

### Deliverables
- [x] Each module ≤300 lines (all 13 modules pass)
- [x] All existing behavior preserved
- [x] Zod validation on all tool inputs
- [x] `node src/index.js serve` works instantly

---

## Phase 2: SSE Transport & Daemon Mode

**Goal:** Replace hand-rolled daemon (child process spawn) with proper HTTP/SSE server.  
**Effort:** Medium  
**Risk:** Low (SDK provides `SSEServerTransport`)

### Steps

- [x] **2.1** Implement SSE transport (`src/transport/sse.js` — 209 lines)
      - Pure Node.js `http` module (no Express)
      - `GET /sse` — SSE stream via `SSEServerTransport`
      - `POST /message` — MCP message handler
      - `GET /health` — Health check endpoint
      - CORS headers on all endpoints

- [x] **2.2** Replace daemon command
      - `rule-mcp daemon start` → spawns `serve --transport sse` on port 37999
      - `rule-mcp daemon stop` → graceful shutdown via `SIGTERM`
      - PID file management preserved
      - Child process stdout/stderr captured to daemon.log

- [x] **2.3** Add optional HTTPS support
      - `--ssl-cert <path>` / `--ssl-key <path>` flags
      - Auto-generates self-signed certs via OpenSSL (`src/transport/cert.js`)
      - `GET /health` works over HTTPS

### Sandbox / Resilience Layer (`src/utils/sandbox.js`)
- [x] `safeJsonParse` — never throws on malformed JSON
- [x] `withTimeout` — async timeout guard for all handlers
- [x] `trySafe` — wraps any function to never throw
- [x] `wrapRequestHandler` — HTTP handler with timeout, error recovery, connection cleanup
- [x] `installProcessErrorHandlers` — catches `uncaughtException` + `unhandledRejection`
- [x] Integrated into SSE transport (`wrapRequestHandler` on all endpoints)
- [x] Integrated into process startup (`src/index.js`)

### Deliverables
- [x] `rule-mcp daemon start` works with SSE transport (port 37999)
- [x] `GET /health` returns `{ ok: true }`
- [x] `GET /sse` establishes SSE connection with sessionId
- [x] `POST /message?sessionId=XXX` accepts MCP messages
- [x] HTTPS support with auto-generated self-signed certs
- [x] Backward-compatible: stdio is still the default (`rule-mcp serve`)
- [x] Sandbox prevents crashes from uncaught errors and timeouts
- [x] All agents keep working (stdio unchanged)

---

## Phase 3: Token-Saving Tools

**Goal:** Maximize LLM-free execution — tools should handle as much as possible without model calls.  
**Effort:** Medium  
**Risk:** Low (all code, no model dependency)

### Steps

- [x] **3.1** Context-aware skill routing
      - `pix_tool` returns structured JSON with `route`, `confidence`, `sections`, `next_tools`
      - Section-level keyword scoring with stopword filtering and framework-name bonus
      - Multi-skill queries (e.g. "React accessibility" → rule-frontend-react + rule-styleguide)
      - Up to 5 alternatives returned with scores

- [x] **3.2** Project framework auto-detector (`src/core/detector.js`)
      - `rule_tool_detect` tool reads `package.json` → detects React/Vue/Svelte/Angular/Astro/Solid/Electron/vanilla
      - Detects TypeScript via `tsconfig.json` or `typescript` dep
      - Detects build tool: vite, webpack, esbuild, angular-cli, sveltekit, next, nuxt, parcel, tsup, tsc
      - Returns project profile JSON with suggested skills and tools

- [x] **3.3** Template engine — multi-file generation
      - `rule_tool_component mode=multi` generates: `_Component.jsx` + `_Component.css` + `index.js`
      - Variable interpolation: component name → PascalCase, kebab-case
      - Framework-aware output: React (.jsx), Vue (.vue SFC), Svelte (.svelte), Vanilla (.js + .css)
      - Barrel file (
      - Example:
        ```
        Generated 3 files:
          src/components/PrimaryButton/_PrimaryButton.jsx
          src/components/PrimaryButton/_PrimaryButton.css
          src/components/PrimaryButton/index.js
        ```

- [x] **3.4** Semantic search with BM25
      - New `src/core/bm25.js` module with full BM25 scoring
      - Tokenized sections (170 sections, 2414 unique terms)
      - Ranked results with relevance scores
      - In-memory inverted index, rebuilt on `skills reload`
      - `rule_tool_search` returns scored, section-level results

- [x] **3.5** Smart guardrail iteration
      - `rule_tool_check` accepts `previousPassed` array
      - Skipped guardrails shown separately
      - Returns `previousPassed` list for easy re-check
      - Suggested code fixes included in each failure

### Deliverables
- [x] `rule_tool_detect` tool reports project framework (react/vue/svelte/angular/solid/astro/electron/vanilla + TS + build tool)
- [x] `rule_tool_component` generates multi-file output (React .jsx, Vue .vue, Svelte .svelte, vanilla .js+.css+barrel)
- [x] `rule_tool_search` returns BM25-ranked results (170 sections, 2414 unique terms)
- [x] `rule_tool_check` iterates efficiently (skip passed checks via `previousPassed`)
- [x] At least 60% of common frontend queries answered without LLM (routing + BM25 + templates)

---

## Phase 4: CI/CD & Release Pipeline

**Goal:** Release pipeline matching tokensave standards — automated, multi-platform, provenance-verified.  
**Effort:** Medium  
**Risk:** Low

### Steps

- [x] **4.1** Upgrade CI (`ci.yml`)
      - ESLint + Prettier config files (`.eslintrc.json`, `.prettierrc`, `.editorconfig`, `.nvmrc`)
      - CI workflow: lint job (syntax check, ESLint, Prettier) + test job (OS×Node matrix) + audit job
      - Node.js 20 + 22 in matrix, across ubuntu/macos/windows
      - `pnpm audit --prod` in dedicated audit job
      - `pnpm install --frozen-lockfile` for reproducible builds

- [x] **4.2** Upgrade release pipeline (`release.yml`)
      - pnpm publish with provenance (kept)
      - Docker build + push to GHCR (linux/amd64 + linux/arm64)
      - Homebrew formula update (kept)
      - GitHub Release with assets (kept)
      - Tests run before publish

- [x] **4.3** Add Docker support
      - `Dockerfile` — multi-stage, `node:22-alpine`, embedded skills, no build step
      - `docker-compose.yml` — IDE integration via SSE on port 37999
      - CI pushes to `ghcr.io/rule/rule-mcp` with semver + sha tags

- [x] **4.4** Add Windows package manager support
      - Winget manifest: `.github/winget/rule.rule-mcp.yaml`
      - Scoop manifest: `.github/scoop/rule-mcp.json`

- [x] **4.5** Add CHANGELOG + conventional commits
      - `CHANGELOG.md` with initial entries following Keep a Changelog
      - `.github/semantic.yml` — enforce conventional commit types on PR titles

### Deliverables
- [x] CI passes on every PR (lint + test + audit)
- [x] Tag `v*` triggers: pnpm publish + Homebrew + Docker + GitHub Release
- [x] `rule-mcp --version` returns correct version
- [x] README badges: CI status, npm version, Docker pulls

---

## Phase 5: IDE & Platform Compatibility

**Goal:** Works with every MCP-compatible IDE and model provider.  
**Effort:** Low  
**Risk:** Very low (all compatibility via MCP protocol)

### Steps

- [x] **5.1** Verify all 15 agent installers
      - All 16 agents have installer functions with JSON/TOML/INI config format detection
      - `installed.md` manifest written to `~/.local/share/rule-mcp/installed.md` after install
      - `rule-mcp doctor` reports which agents are configured (scans 15 common config file locations)

- [x] **5.2** Add `rule://project` resource
      - Reads CWD → detects framework + TypeScript + build tool via `detectProject()`
      - Returns JSON with framework, node version, suggested skills, suggested tools

- [x] **5.3** Add MCP completion support
      - `CompleteRequestSchema` handler registered in server.js
      - Completions: `component` → [button, card, modal, ...], `framework` → [react, vue, svelte, ...],
        `skill` → [rule_tool_frontend_react, rule_tool_frontend_vue, ...], `rule.framework` → [react, vue, svelte, ...]

- [x] **5.4** Cross-platform testing
      - CI matrix already tests ubuntu-latest, macos-latest, windows-latest with Node 20 + 22
      - Docker image supports linux/amd64 + linux/arm64

### Deliverables
- [x] All 16 agents installable with `installed.md` manifest
- [x] Completion support for component, framework, skill tool arguments (via SDK `CompleteRequestSchema`)
- [x] Cross-platform CI artifacts (`.tgz` via pnpm pack, Docker via GHCR, Homebrew formula)

---

## Phase 6: Documentation & Polish

**Goal:** Production-ready documentation, examples, and troubleshooting.  
**Effort:** Low  
**Risk:** Very low

### Steps

- [x] **6.1** Consolidate documentation for unreleased package
      - No migration guide is needed before first release
      - Documentation lives in the consolidated numbered handbook under `docs/`

- [x] **6.1a** rule-architect correctly routed: `pix_tool` → architecture query → rule-architect 100%
- [x] **6.1b** rule-architect guardrails verified: `rule_tool_check` for rule-architect returns 8 architect-specific checks
- [x] **6.1c** rule_tool_architect tool registered with full mode support (interview, scaffold, check)
- [x] **6.2** Troubleshooting guide (`docs/TROUBLESHOOTING.md`)
      - Per-agent issues: Claude, Cursor, VS Code, Copilot, Pi
      - Daemon, Docker, Skills troubleshooting
      - General debugging table with common symptoms and fixes

- [x] **6.3** Performance benchmarks (`docs/BENCHMARKS.md`)
      - Response times: all tools <15ms P95
      - Token savings: 94-99.5% vs LLM-only
      - LLM-free hit rate: ∼85% of common queries
      - Cache performance metrics

- [x] **6.4** Architecture Decision Records (`docs/adr/`)
      - 001: Vanilla JS over TypeScript
      - 002: SDK over hand-rolled protocol
      - 003: File-based skill loading over database

- [x] **6.5** Example integration guide (`docs/EXAMPLES.md`)
      - React project: create Vite app, generate components via MCP
      - Vue 3 project: detect framework, generate form field
      - A11y project: generate Playwright config + test templates + guardrails
      - CI integration and VS Code + Docker setup

### Deliverables
- [x] README updated with badges, quick start, troubleshooting, architecture diagram, docs table
- [x] Example integration guide (`docs/EXAMPLES.md`) with React, Vue, a11y walkthroughs
- [x] ADRs documented for 3 key decisions (`docs/adr/NNN-*`)

---

## Phase 7: Future — Plugin System & Community

**Goal:** Allow anyone to create rule-* skills without modifying the MCP server.  
**Effort:** High  
**Risk:** Medium (design complexity)

### Steps

- [x] **7.1** Define plugin detection
      - `getSkillNames()` detects any directory with SKILL.md (not just `rule-*` prefix)
      - `isPluginSkill()` / `hasPluginJs()` / `loadPluginJs()` in router.js
      - `registerSkillTool()` handles plugin names without `rule-` prefix
      - `mergePluginGuardrails()` in guardrails.js — plugins inject custom guardrails
      - `plugin.js` dynamically imported, guardrails merged into guardrails engine
      - `docs/PLUGINS.md` — complete plugin authoring guide with examples

- [x] **7.2** Add community skill discovery
      - `rule://community` resource — lists installed plugins + known community skills
      - Auto-detects all plugins in `~/.agents/skills/` with SKILL.md
      - Tool `pix_<plugin-name>` auto-registered for each plugin

- [x] **7.3** Add opt-in telemetry
      - `rule-mcp doctor --telemetry` adds anonymous usage stats to report
      - Collects: version, node version, platform, arch, tool count, agent count, timestamp
      - Controlled by `--telemetry` flag — never sent without explicit opt-in

### Deliverables
- [x] Plugin detection documented with examples (`docs/PLUGINS.md`)
- [x] Community skill index via `rule://community` resource (auto-discovers installed plugins)
- [x] Opt-in telemetry via `rule-mcp doctor --telemetry`

---

## Summary Timeline

| Phase | What | Effort | Duration |
|-------|------|--------|----------|
| Phase | What | Effort | Status |
|-------|------|--------|--------|
| **P0** | Port to MCP SDK | High | ✅ Complete |
| **P1** | Core refactor | Medium | ✅ Complete |
| **P2** | SSE Transport + HTTPS + Sandbox | Medium | ✅ Complete |
| **P3** | Token-Saving Tools | Medium | ✅ Complete |
| **P4** | CI/CD Pipeline | Medium | ✅ Complete |
| **P5** | IDE Compatibility | Low | ✅ Complete |
| **P6** | Documentation | Low | ✅ Complete |
| **P7** | Plugins (future) | High | ✅ Complete |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SDK API changes | Low | High (pinned dep) | Pin SDK version, lockfile, test before release |
| Backward compat break | Low | High | Smoke test against all 15 agents |
| Skill content migration | Low | Medium | Skills are markdown — zero changes needed |
| Windows path issues | Medium | Medium | CI on Windows, normalize with `node:path` |
| Zod validation too strict | Low | Low | Schema errors return clear messages via `McpError` |
| User needs TS | Very low | Very low | SDK ships `.d.ts` — editors get autocomplete anyway |
