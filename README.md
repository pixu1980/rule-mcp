# rule-mcp

**rule-mcp** is an [MCP](https://modelcontextprotocol.io) server that puts 92 modular skills
(styleguides, component templates, framework practices, design patterns) inside your AI coding
agent as tools, resources, and prompts - so a free-text request routes to the right skill, and
generated code is validated against guardrails before it reaches you. It never calls an LLM
itself, so it behaves identically behind Claude, GPT, Gemini, Llama, or Qwen, and everything
runs on your machine with no build step.

Node ≥ 20 · [MIT license](LICENSE) · MCP SDK 1.30.0 (from package.json).

> **Runtime deps:** `@modelcontextprotocol/sdk` + `zod` only. No build step needed.  
> **Local-first:** everything runs on your machine, skills live in `~/.agents/skills/`.

---

## Table of Contents

- [Quick start](#quick-start)
- [What is rule-mcp](#what-is-rule-mcp)
- [Architecture overview](#architecture-overview)
- [Tool reference](#tool-reference)
  - [All 110 tools (normal mode)](#all-110-tools-normal-mode)
  - [Minimal tool surface (10 tools)](#minimal-tool-surface-10-tools)
  - [Gateway deterministic mode](#gateway-deterministic-mode)
- [MCP Resources (186)](#mcp-resources-186)
- [MCP Prompts (76)](#mcp-prompts-76)
- [Guardrail engine](#guardrail-engine)
- [CLI reference](#cli-reference)
- [Daemon & services](#daemon--services)
- [Docker](#docker)
- [Project structure](#project-structure)
- [Further reading](#further-reading)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [Governance](#governance)
- [Security](#security)
- [Sponsors](#sponsors)
- [Roadmap](./ROADMAP.md)
- [License](#license)

---

## Project status

Deterministic MCP server for the rule skill ecosystem. Live surface (enforced by
`tests/docs/docs-accuracy.test.mjs` - the README and reality cannot drift):

| Surface   | Count | Notes                                                                                                       |
| --------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| Tools     | 106   | per-skill tools + dispatcher/action tools                                                                   |
| Resources | 186   | rule:// per-skill index + summary + template URIs                                                            |
| Prompts   | 76    | rule-area-* areas + one-shot workflow + 54 review-persona commands (rule-plan-* / rule-audit-* / rule-review-*) |
| Skills    | 90    | frontend, backend, data, devops, toolchain, styleguide, process, platform, ai                               |
| Tests     | 1211  | `pnpm test:all` green (incl. installer + PTY TUI)                                                           |

Architecture decisions live in [`docs/adr/`](docs/adr/ADR.md) (86 records:
installer self-heal, architect split, doc-accuracy guard, v1.0.0 release).
The former architect wizard now lives in the standalone
[`rule-mcp-architect`](https://github.com/pixu1980/rule-mcp-architect) web
app + SDK repo.

## Quick start

See **[`docs/01-getting-started.md`](./docs/01-getting-started.md)** for step-by-step installation:

- Global CLI from a clone
- pnpx ephemeral (no install, once published)
- Local development clone
- Docker
- Agent integration (23 supported agents)
- mcp.json configuration

```bash
# TL;DR - clone and go
git clone https://github.com/pixu1980/rule-mcp.git
cd rule-mcp
./scripts/install.sh
rule-mcp doctor
```

Verify a release tarball (every GitHub Release attaches both files):

```bash
curl -fsSLO https://github.com/pixu1980/rule-mcp/releases/download/<tag>/SHA256SUMS
shasum -a 256 -c SHA256SUMS
```

---

## What is rule-mcp

rule-mcp is an [MCP](https://modelcontextprotocol.io) server that exposes **110 tools**, **190 resources**, and **155 prompts** to any MCP-compatible AI coding agent. Because the server never calls an LLM (every output is deterministic), it is **model-agnostic** - it behaves identically behind Claude, GPT, Gemini, Llama, Qwen, or any other model. It provides:

- **92 modular skills** covering frontend, backend, database, devops, toolchain, styleguide, process, platform, and ai domains
- **BM25 full-text search** across all skill content
- **Guardrail engine** with 18 shared rules + framework/backend/database/devops-specific checks
- **Deterministic gateway** (`pix_gateway` + `pix_apply`) with receipt-based validation
- **Minimal tool surface** (`RULE_MCP_MINIMAL_TOOLS=1`, off by default) collapsing the surface to 10 dispatcher/action tools - for clients that cap MCP tool counts (Cursor, GitHub Copilot) and to cut per-turn token cost on every model

### Supported agents

Claude Code, Cursor, Cline, Roo Code, Copilot, Gemini CLI, Codex CLI, Devin (formerly Windsurf), OpenCode, Pi, and any MCP-compatible host.

> **Transport support tiers.** **stdio** is the universally-tested path and works with every MCP host - prefer it. **Daemon / HTTP+SSE** is verified end-to-end for **Pi** and **VS Code**; the other agents receive a best-effort standard `mcpServers` config (correct shape, but not each individually interop-tested) and may need a manual tweak.

---

## Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│                    AI Coding Agent                           │
│  (Claude Code / Cursor / Pi / Gemini CLI / etc.)             │
└──────────────┬──────────────────────────────┬────────────────┘
               │ MCP protocol (tools/list,     │
               │ tools/call, resources/read,    │
               │ prompts/get, completion)       │
               ▼                                ▼
┌──────────────────────────────┬───────────────────────────────┐
│      STDIO Transport         │       SSE Transport           │
│  (default, for agents)       │  (optional, for IDE/HTTP)     │
└──────────────┬───────────────┴──────────────┬────────────────┘
               ▼                               ▼
┌───────────────────────────────────────────────────────────────┐
│                    MCP Server (SDK)                           │
│  src/server.js - handler registration                         │
│  src/transport/sse.js - SSE HTTP server                       │
│  src/transport/cert.js - self-signed TLS cert generation      │
├───────────────────────────────────────────────────────────────┤
│  Tool Registry              │  Resources Registry             │
│  src/tools/router.js        │  src/resources/index.js         │
│  110 tools                  │  190 resources                  │
├──────────────────┬───────────┴────────────────┬───────────────┤
│  Orchestration   │  Skills & BM25            │  Guardrails    │
│  pix_gateway     │  90 skill dirs            │  18 shared     │
│  pix_apply       │  src/core/bm25.js         │  + framework   │
│  receipt system  │  src/core/skills.js        │  + backend    │
│                  │                            │  + database   │
│                  │                            │  + devops     │
├──────────────────┴────────────────────────────┴───────────────┤
│  CLI                         │  Installer                     │
│  src/cli/commands.js         │  src/cli/setup/  (Ink wizard)  │
│  src/cli/daemon.js           │  src/cli/install.js            │
│  src/cli/doctor.js           │  23 agents supported           │
│                              │  scripts/*.sh|.ps1 bootstraps  │
└──────────────────────────────┴────────────────────────────────┘
```

**Key files:**

| File                         | Purpose                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| `src/server.js`              | MCP server bootstrap, handler registration                               |
| `src/tools/router.js`        | Generic tool registry (`registerTool`, `listTools`, `callTool`)          |
| `src/tools/ai.js`            | Router tool `pix_tool` (BM25 keyword scoring + framework bias)           |
| `src/tools/gateway.js`       | Gateway orchestrator `pix_gateway` + receipt system                      |
| `src/tools/apply.js`         | Write tool `pix_apply` with receipt validation                           |
| `src/tools/skill.js`         | Skill-tool generator + `pix_search`, `pix_check`, `pix_scaffold`         |
| `src/core/guardrails.js`     | Guardrail engine (check runner + report)                                 |
| `src/core/guardrail-defs.js` | All guardrail definitions (shared, framework, backend, database, devops) |
| `src/core/enforcement.js`    | Pre/post processing (advisory - policy tag: `advisory`)                  |
| `src/core/bm25.js`           | BM25 full-text search index                                              |
| `src/core/detector.js`       | Project framework detection                                              |

**Modes:**

| Mode                                       | Tools exposed   | Use case                                                                                                          |
| ------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Normal (default)                           | 90              | Full access to all skills, tools, and features                                                                    |
| Minimal (`RULE_MCP_MINIMAL_TOOLS=1`) | 10              | Dispatcher + action tools only - fits client tool caps (Cursor/Copilot), cheaper context, safe for untrusted code |
| Allowed-tools filter                       | 8 (recommended) | Via `mcp.json` `allowedTools` - reduce token consumption                                                          |

---

## Tool reference

### All 110 tools (normal mode)

#### Deterministic tools (9)

| Tool                  | Description                                                                                  | Read-only |
| --------------------- | -------------------------------------------------------------------------------------------- | --------- |
| `rule`                 | Route a prompt to the correct rule skill via BM25 keyword scoring + framework bias            | ✅        |
| `pix_gateway`         | **Single-entry orchestrator:** routes → loads evidence → checks guardrails → returns receipt | ✅        |
| `pix_apply`           | Write files to disk, requires valid receipt from `pix_gateway`                               | ❌        |
| `pix_search`          | BM25 full-text search across all 89 skills                                                   | ✅        |
| `pix_check`           | Run guardrail checks on code against any rule skill                                           | ✅        |
| `pix_scaffold`        | Generate project config files (`.prettierrc`, `.editorconfig`, `.gitignore`, etc.)           | ✅        |
| `pix_detect`          | Auto-detect project framework and suggest relevant skills/tools                              | ✅        |
| `pix_component`       | Generate component templates (button, card, modal, form, list, nav) for 7 frameworks         | ✅        |
| `pix_process_handoff` | Generate compressed LLM handoff for cross-session recovery                                   | ✅        |

#### Skill tools (67)

Each skill directory under `skills/` becomes a tool `pix_<skill-name>`. All support 6 modes: `full`, `summary`, `search`, `guardrails`, `check`, `tldr`.

| Tool                            | Skill name                    | Lines | Domain     |
| ------------------------------- | ----------------------------- | ----- | ---------- |
| `pix_backend`                   | rule-backend                   | 61    | Backend    |
| `pix_backend_api_design`        | rule-backend-api-design        | 158   | Backend    |
| `pix_backend_express`           | rule-backend-express           | 147   | Backend    |
| `pix_backend_fastify`           | rule-backend-fastify           | 82    | Backend    |
| `pix_backend_hono`              | rule-backend-hono              | 91    | Backend    |
| `pix_backend_nestjs`            | rule-backend-nestjs            | 94    | Backend    |
| `pix_backend_node`              | rule-backend-node              | 214   | Backend    |
| `pix_backend_security`          | rule-backend-security          | 174   | Backend    |
| `pix_data`                      | rule-data                      | 39    | Data       |
| `pix_data_duckdb`               | rule-data-duckdb               | 234   | Data       |
| `pix_data_indexed_db`           | rule-data-indexed-db           | 317   | Data       |
| `pix_data_mongodb`              | rule-data-mongodb              | 743   | Data       |
| `pix_data_mysql`                | rule-data-mysql                | 595   | Data       |
| `pix_data_postgresql`           | rule-data-postgresql           | 649   | Data       |
| `pix_data_sql`                  | rule-data-sql                  | 632   | Data       |
| `pix_data_sqlite`               | rule-data-sqlite               | 242   | Data       |
| `pix_devops`                    | rule-devops                    | 42    | DevOps     |
| `pix_devops_docker`             | rule-devops-docker             | 128   | DevOps     |
| `pix_devops_gitlab_ci`          | rule-devops-gitlab-ci          | 75    | DevOps     |
| `pix_devops_testing`            | rule-devops-testing            | 300   | DevOps     |
| `pix_devops_version`            | rule-devops-version            | 161   | DevOps     |
| `pix_frontend`                  | rule-frontend                  | 61    | Frontend   |
| `pix_frontend_angular`          | rule-frontend-angular          | 504   | Frontend   |
| `pix_meta_astro`                | rule-meta-astro                | 526   | Frontend   |
| `pix_meta_next`                 | rule-meta-next                 | 201   | Frontend   |
| `pix_meta_nuxt`                 | rule-meta-nuxt                 | 181   | Frontend   |
| `pix_meta_remix`                | rule-meta-remix                | 224   | Frontend   |
| `pix_frontend_react`            | rule-frontend-react            | 688   | Frontend   |
| `pix_frontend_solidjs`          | rule-frontend-solidjs          | 532   | Frontend   |
| `pix_frontend_svelte`           | rule-frontend-svelte           | 508   | Frontend   |
| `pix_frontend_vanilla_reactive` | rule-frontend-vanilla-reactive | 640   | Frontend   |
| `pix_frontend_vue`              | rule-frontend-vue              | 522   | Frontend   |
| `pix_platform`                  | rule-platform                  | 43    | Platform   |
| `pix_platform_agent`            | rule-platform-agent            | 294   | Platform   |
| `pix_platform_desktop`          | rule-platform-desktop          | 542   | Platform   |
| `pix_platform_expo`             | rule-platform-expo             | 254   | Platform   |
| `pix_platform_library`          | rule-platform-library          | 259   | Platform   |
| `pix_platform_web`              | rule-platform-web              | 241   | Platform   |
| `pix_process`                   | rule-process                   | 43    | Process    |
| `pix_process_bmad`              | rule-process-bmad              | 422   | Process    |
| `pix_process_documentation`     | rule-process-documentation     | 201   | Process    |
| `pix_process_feature_workflow`  | rule-process-feature-workflow  | 121   | Process    |
| `pix_process_tdd`               | rule-process-tdd               | 205   | Process    |
| `pix_styleguide`                | rule-styleguide                | 58    | Styleguide |
| `pix_styleguide_a11y`           | rule-styleguide-a11y           | 514   | Styleguide |
| `pix_styleguide_css`            | rule-styleguide-css            | 488   | Styleguide |
| `pix_styleguide_html`           | rule-styleguide-html           | 339   | Styleguide |
| `pix_styleguide_javascript`     | rule-styleguide-javascript     | 553   | Styleguide |
| `pix_styleguide_json`           | rule-styleguide-json           | 132   | Styleguide |
| `pix_styleguide_markdown`       | rule-styleguide-markdown       | 132   | Styleguide |
| `pix_styleguide_naming`         | rule-styleguide-naming         | 228   | Styleguide |
| `pix_styleguide_patterns`       | rule-styleguide-patterns       | 183   | Styleguide |
| `pix_styleguide_validation`     | rule-styleguide-validation     | 472   | Styleguide |
| `pix_toolchain`                 | rule-toolchain                 | 69    | Toolchain  |
| `pix_toolchain_biome`           | rule-toolchain-biome           | 101   | Toolchain  |
| `pix_toolchain_eslint`          | rule-toolchain-eslint          | 81    | Toolchain  |
| `pix_toolchain_husky`           | rule-toolchain-husky           | 116   | Toolchain  |
| `pix_toolchain_parcel`          | rule-toolchain-parcel          | 120   | Toolchain  |
| `pix_toolchain_pnpm`            | rule-toolchain-pnpm            | 114   | Toolchain  |
| `pix_toolchain_project`         | rule-toolchain-project         | 217   | Toolchain  |
| `pix_toolchain_turborepo`       | rule-toolchain-turborepo       | 108   | Toolchain  |
| `pix_toolchain_typescript`      | rule-toolchain-typescript      | 132   | Toolchain  |
| `pix_toolchain_vite`            | rule-toolchain-vite            | 93    | Toolchain  |
| `pix_ui`                        | rule-ui                        | 79    | UI         |
| `pix_ui_design_system`          | rule-ui-design-system          | 214   | UI         |

#### Mutating tools (2)

| Tool              | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| `pix_fix`         | File tree lint, fix, and component generation (sandboxed in Phase 1) |
| `pix_process_adr` | Architecture Decision Record creation (auto-log disabled by default) |

### Minimal tool surface (10 tools)

Set `RULE_MCP_MINIMAL_TOOLS=1` (off by default) to expose only the dispatcher + action tools. Skill-specific tools (`pix_backend_express`, `pix_frontend_react`, etc.) and mutation tools (`pix_fix`, `pix_process_adr`) are hidden - their guidance is reached through `pix_gateway` and `rule://` resources. Use this for clients that cap MCP tool counts (Cursor, GitHub Copilot) or to cut per-turn token overhead on any model. The set is enforced as a hard allowlist, so it stays fixed regardless of future additions.

```bash
RULE_MCP_MINIMAL_TOOLS=1 rule-mcp serve
```

Exposed tools: `rule`, `pix_update`, `pix_gateway`, `pix_apply`, `pix_search`, `pix_check`, `pix_scaffold`, `pix_detect`, `pix_process_handoff`, `pix_component`.

### Gateway deterministic mode

`pix_gateway` and `pix_apply` form a deterministic write path:

1. **Call `pix_gateway`** with `{ prompt, code? }` → routes to correct skill, loads evidence, runs guardrails
2. **If all guardrails pass**, a **receipt** (HMAC-SHA256 tied to code hash) is returned
3. **Call `pix_apply`** with `{ files: [...], receipt }` → validates receipt, writes files atomically
4. **If code is modified** after the gateway call, the receipt is **invalid** and `pix_apply` rejects the write

```json
{
  "receipt": "abc123...",
  "route": "rule-backend-express",
  "checkResult": { "allPass": true, "total": 22 }
}
```

See [ADR 053](./docs/adr/053-gateway-as-the-single-entrypoint-with-server-side-receipts-backend-data-devops-g.md) for the full design.

---

## MCP Resources (186)

196 resources accessible via the MCP `resources/read` protocol.

### Static resources (8)

| URI                     | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `rule://skills`          | Index of all 95 skills with paths and sizes                    |
| `rule://templates`       | Design system component template catalog                       |
| `rule://project`         | Project analysis: detected framework + suggested tools/ skills |
| `rule://community`       | Community / plugin rule skills index                            |
| `rule://ai`              | rule skill full content                                         |
| `rule://a11y`            | A11y testing guide (Playwright + axe-core)                     |
| `rule://a11y/test-basic` | Basic a11y test template                                       |
| `rule://a11y/test-forms` | Form a11y test template                                        |

### Skill resources (188 = 94 × 2)

Each skill (except `rule` itself) has two resources:

| URI                          | Description        |
| ---------------------------- | ------------------ |
| `rule://<skill-name>`         | Full skill content |
| `rule://<skill-name>/summary` | First 30 lines     |

---

## MCP Prompts (76)

73 prompts accessible via the MCP `prompts/get` protocol. The 12 `rule-area-*` commands and the
54 review-persona commands (18 roles x plan/audit/review) are grouped in a row each; the one-shot
workflow prompts are listed individually. The same registry drives the clean `/rule-*` agent
commands (pinned by the `/rule` router), so every prompt takes a **single free-form argument** and
supports `help` (or `--help` / `-h`) as its value to print the usage list, e.g. `/rule-area-frontend
help` - help is returned as a ready-made assistant message and displayed instantly, without
invoking the model.

| Prompt                                        | Description                                                                                                                                                                                                                                                                                               | Arguments                                                                                                                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rule` (router)                                | Route a request through the rule workflow (`/rule-mcp` became `/rule`)                                                                                                                                                                                                                                | `<request>` (required)                                                                                                                                                               |
| `rule-area-*` (12)                             | Area specialists: `ai`, `backend`, `data`, `devops`, `frontend`, `meta`, `platform`, `process`, `skills`, `styleguide`, `toolchain`, `ui`                                                                                                                                                                 | `request` (required, free text)                                                                                                                                                      |
| `rule-handoff`                                 | Compressed context handoff (ADR + git) for a new session; commits pending work first, and archives completed audits/reviews/plans as ADRs                                                                                                 | `options` (optional: `handoff` \| `close-session`, `compress` \| `no-compress` (default: compress), `full` \| `brief` \| `minimal`, `no-*`, `no-archive`, `max=<n>`, `help`; empty = all defaults) |
| `rule-adr`                                     | Record an architecture decision: context, decision, alternatives, consequences                                                                                                                                                                                                                            | `decision` (required)                                                                                                                                                                |
| `rule-flight`                                  | Read the flight recorder: what this server cost and what to do about it                                                                                                                                                                                                                                   | `options` (optional: export \| show <file> \| prune \| redact)                                                                                                                       |
| `rule-handon`                                  | Resume: verify the last handoff against the repository as it is now                                                                                                                                                                                                                                       | `options` (optional: list \| file=<path>)                                                                                                                                            |
| `rule-init`                                    | Prepare a project for rule-mcp: recorder dir + tokensave                                                                                                                                                                                                                                            | `options` (optional: no-tokensave)                                                                                                                                                   |
| `rule-process-check`                           | Validate code against the rule guardrails and fix what fails (`rule-check` became `rule-process-check`)                                                                                                                                                                                                      | `target` (optional; default: current diff)                                                                                                                                           |
| `rule-update`                                  | Apply an available server update explicitly, and report what changed                                                                                                                                                                                                                                      | `options` (optional: check \| apply)                                                                                                                                                 |
| `rule-plan-*` / `rule-audit-*` / `rule-review-*` | 54 review-persona commands: one per operation (plan/audit/review) per active role (architect, simplicity, docs, backend, security, auth, supply-chain, privacy, qa, performance, ai, devx, a11y, design-system, frontend, i18n, data, devops); each routes through `rule_tool_plan` + `rule_tool_plan_docs` | `topic` (optional)                                                                                                                                                                   |

---

## Guardrail engine

The guardrail engine runs deterministic checks against code and returns structured pass/fail results.

### Shared guardrails (18 rules - apply to ALL skills)

| ID                              | Label                | Description                                                       |
| ------------------------------- | -------------------- | ----------------------------------------------------------------- |
| `no-css-classes`                | Zero CSS classes     | No `.class` selectors (including pseudo-classes, combinators)     |
| `no-inline-styles`              | Zero inline styles   | No `style=""` or `style={{}}` in JSX                              |
| `semantic-html`                 | Semantic HTML        | No `<div>` where `<section>`, `<article>`, `<header>`, etc. exist |
| `external-css`                  | External CSS         | CSS via `adoptedStyleSheets`, `import`, or framework-native       |
| `barrel-file-tree`              | Barrel pattern       | `index.js` re-exports public API                                  |
| `file-naming`                   | File naming          | `_PascalCase.ext` for component files                             |
| `data-part-naming`              | data-part attribute  | Child elements use `data-part="name"`                             |
| `jsdoc-required`                | JSDoc on exports     | Every exported symbol has `/** */`                                |
| `css-comments-required`         | CSS file comments    | CSS files start with `/* FILE: ... */`                            |
| `a11y-test-required`            | A11y tests           | Playwright + axe-core tests exist                                 |
| `no-placeholder-implementation` | No placeholders      | No `TODO`, `FIXME`, placeholder code                              |
| `no-suppressed-errors`          | No suppressed errors | No `@ts-ignore`, `eslint-disable` without reason                  |
| `verified-dependencies-only`    | Verified deps        | Imports must exist in manifest                                    |
| `react-no-classname`            | No className         | React uses `data-part` not `className`                            |
| `react-hooks-rules`             | Hooks rules          | Hooks called at top level only                                    |
| `component-folder-barrel`       | Folder barrel        | Component folder has `index.js`                                   |
| `component-file-prefix`         | File prefix          | Component files start with `_`                                    |
| `barrel-exports-match-files`    | Barrel matches files | `index.js` exports match actual files                             |

### Framework-specific guardrails

Applied in addition to shared rules when checking code for a specific framework:

| Framework | Guardrails                                    |
| --------- | --------------------------------------------- |
| React     | `REACT_GUARDRAILS` + `FILE_TREE_GUARDRAILS`   |
| Vue       | `VUE_GUARDRAILS` + `FILE_TREE_GUARDRAILS`     |
| Angular   | `ANGULAR_GUARDRAILS` + `FILE_TREE_GUARDRAILS` |
| Svelte    | `SVELTE_GUARDRAILS` + `FILE_TREE_GUARDRAILS`  |
| Solid     | `FILE_TREE_GUARDRAILS`                        |

### Backend guardrails (6 checks)

Applied when `pix_check` targets a `rule-backend-*` skill:

| ID                 | Description                                                                        |
| ------------------ | ---------------------------------------------------------------------------------- |
| `sql-injection`    | No string concatenation in SQL queries                                             |
| `error-exposure`   | No stack traces or error details in HTTP responses                                 |
| `input-validation` | Zod/Joi/class-validator present when handling request input                        |
| `cors-explicit`    | CORS with explicit origin list, no wildcard `*`                                    |
| `rate-limiting`    | Rate limiter configured (express-rate-limit, @fastify/rate-limit, ThrottlerModule) |
| `helmet-headers`   | Security headers via helmet or framework equivalent                                |

### Database guardrails (4 checks)

Applied when targeting a `rule-data-*` skill:

| ID                      | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `migration-safety`      | DDL uses `IF NOT EXISTS` / `IF EXISTS`                 |
| `parameterized-queries` | All queries use placeholders, not string concatenation |
| `transaction-safety`    | Multiple mutations wrapped in a transaction            |
| `connection-pool`       | Server code uses connection pool, not direct client    |

### DevOps guardrails (4 checks)

Applied when targeting a `rule-devops-*` skill:

| ID                   | Description                                 |
| -------------------- | ------------------------------------------- |
| `docker-non-root`    | Container runs as non-root user             |
| `docker-healthcheck` | `HEALTHCHECK` instruction present           |
| `secret-detection`   | No hardcoded passwords, API keys, or tokens |
| `env-gitignore`      | `.env` listed in `.gitignore`               |

### How to use guardrails

```bash
# Check code against a skill's guardrails
rule-mcp tools call pix_check --json '{
  "skill": "rule-frontend-react",
  "code": "export function Button() { return <button>Click</button> }",
  "fileName": "_Button.tsx",
  "isComponent": true
}'

# Check backend code
rule-mcp tools call pix_check --json '{
  "skill": "rule-backend-express",
  "code": "app.get(\"/users\", (req,res) => { db.query(\"SELECT * FROM users WHERE id = \" + req.params.id) })",
  "framework": "express"
}'
```

The guardrail engine is defined in:

- [`src/core/guardrail-defs.js`](./src/core/guardrail-defs.js) - all 30+ guardrail checks
- [`src/core/guardrails.js`](./src/core/guardrails.js) - engine (runner, reporter, merge)

---

## CLI reference

```bash
# Server
# --transport: stdio (default) | http (Streamable HTTP, current MCP spec) | sse (legacy HTTP+SSE)
# --port defaults to 37999 (or $RULE_MCP_PORT); bind host via $RULE_MCP_HOST (default 127.0.0.1)
rule-mcp serve [--transport stdio|http|sse] [--port PORT] [--ssl-cert FILE --ssl-key FILE]

# Self-update (git-clone installs)
rule-mcp update

# Daemon (background process)
rule-mcp daemon start|stop|status|logs
rule-mcp daemon install|uninstall|enable|disable

# Agent integration
rule-mcp install --agent <name> [--mode stdio|daemon|docker] [--global] [--dry-run] [--force]
rule-mcp uninstall --agent <name> [--dry-run]

# Tools (MCP tool calls from CLI)
rule-mcp tools list [--json]
rule-mcp tools call <name> --json '{...}'

# Health
rule-mcp doctor [--json] [--json-out FILE] [--telemetry]

# Skills
rule-mcp skills install [--scope global|project] [--all]
rule-mcp skills reload
rule-mcp skills list [--json]

# File tree
rule-mcp fix [--mode lint|fix|generate] [--name NAME] [--framework <fw>] [--path DIR] [--dry-run]

# ADR
rule-mcp adr new "<title>" [--status proposed|accepted|deprecated|superseded] [--tags a,b,c]

# Handoff
rule-mcp handoff [--mode handoff|close-session] [--compress] [--format full|brief|minimal] [--no-archive]

# Config
rule-mcp config [--mode stdio|daemon|docker] [--global]
rule-mcp completions --shell zsh|bash|fish

# Help
rule-mcp help
rule-mcp <command> --help
```

---

## Forced self-update

On git-clone installs the server keeps itself current automatically. Every
tool invocation kicks a background check - the actual `git fetch` runs at most
once per `RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS` (default 60s) - and
fast-forwards if behind, hot-reloads skills, and restarts when server code
changed. The check never blocks the tool call (fire-and-forget); a
`🔄 Updating MCP server` banner is prepended to a later result.

- **Safe**: fast-forward only (never discards local commits/changes); skipped
  when the working tree has tracked changes, HEAD is detached, or no upstream is
  configured. Offline/timeout fails open on the current version.
- **Scope**: git clones only. npm/npx and Docker installs get a one-line hint
  with the correct manual update command.
- **On demand**: `rule-mcp update`, or the `pix_update` MCP tool.
- **Opt-out**: `RULE_MCP_NO_AUTOUPDATE=1` disables the check;
  `RULE_MCP_NO_AUTORESTART=1` keeps the process alive on code changes
  (you restart/reconnect manually). `RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS`
  tunes the throttle (default 60; `0` = check on every tool call).

---

## Daemon & services

The daemon runs the SSE server as a background process or system service (LaunchAgent on macOS, systemd on Linux, Windows Service).

```bash
# Process-level (cross-platform, no reboot persistence)
rule-mcp daemon start     # Fork background SSE process
rule-mcp daemon stop      # Stop the process
rule-mcp daemon status    # Check if running + PID
rule-mcp daemon logs      # View daemon log

# Service-level (persists across reboots)
rule-mcp daemon install   # Install native service (Login Items on macOS)
rule-mcp daemon uninstall # Remove native service
rule-mcp daemon enable    # Load/activate service
rule-mcp daemon disable   # Unload/deactivate service
```

The daemon always listens on `127.0.0.1:37999` over SSE. Health endpoint: `http://127.0.0.1:37999/health`.

### Security

- Bearer token auth required for `/sse` and `/message`; the local daemon keeps an owner-only token at `~/.rule-mcp/state/sse-token` across restarts
- `/health` is public (no auth)
- CORS deny-by-default (only explicit origins allowed)
- 1 MB max POST body size
- Loopback-only binding (`127.0.0.1`)

---

## Docker

```bash
# Build
docker build -t rule-mcp .

# Stdio (MCP agents)
docker run -i rule-mcp

# SSE (Pi or VS Code integration)
RULE_MCP_SSE_TOKEN="$(cat ~/.rule-mcp/state/sse-token)" \
  docker run -e RULE_MCP_SSE_TOKEN -p 37999:37999 \
  rule-mcp node src/index.js serve --transport sse

# With docker-compose (after `rule-mcp install --agent pi --mode docker`)
RULE_MCP_SSE_TOKEN="$(cat ~/.rule-mcp/state/sse-token)" \
  docker compose up -d
# → authenticated SSE: http://localhost:37999/sse
```

The Docker image uses `node:22-alpine`, has no build step, and runs the server directly.

---

## Project structure

```
.
├── bin/rule-mcp.js          ← CLI entrypoint
├── src/
│   ├── server.js                  ← MCP server bootstrap (SDK)
│   ├── transport/
│   │   └── sse.js                 ← SSE HTTP server
│   ├── tools/
│   │   ├── router.js              ← Tool registry
│   │   ├── ai.js                  ← rule router (BM25)
│   │   ├── gateway.js             ← pix_gateway orchestrator + receipts
│   │   ├── apply.js               ← pix_apply write tool
│   │   ├── skill.js               ← Skill tool generator + check/search/scaffold
│   │   ├── adr.js                 ← Architecture Decision Records
│   │   ├── fix.js                 ← File tree lint/fix/generate
│   │   └── handoff.js             ← Context handoff
│   ├── core/
│   │   ├── skills.js              ← Skill loading + minimal tool surface + frontmatter parser
│   │   ├── guardrails.js          ← Guardrail engine (runner)
│   │   ├── guardrail-defs.js      ← All guardrail definitions
│   │   ├── enforcement.js         ← Pre/post processing (advisory)
│   │   ├── bm25.js                ← Full-text search index
│   │   ├── detector.js            ← Framework detection
│   │   ├── templates.js           ← Template generation engine
│   │   └── template-data.js       ← Template strings per component/framework
│   ├── cli/
│   │   ├── commands.js            ← CLI dispatch (serve, daemon, install, etc.)
│   │   ├── install.js             ← Multi-agent installer (23 agents)
│   │   ├── daemon.js              ← Daemon lifecycle
│   │   ├── doctor.js              ← Health check
│   │   └── skills-install.js      ← Interactive skill installer
│   ├── resources/index.js         ← MCP resource registry
│   ├── prompts/index.js           ← MCP prompt registry
│   └── index.js                   ← CLI entry handler
├── skills/                        ← 89 skill directories
├── prompts/                       ← System prompt templates
├── scripts/                       ← Install/build scripts
├── tests/                          ← 20 test files
└── docs/                          ← Architecture, guides, plans, decisions
```

---

## Further reading

| Document                                                               | Description                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------- |
| [`docs/01-getting-started.md`](./docs/01-getting-started.md)           | Step-by-step installation & agent integration           |
| [`docs/02-product-architecture.md`](./docs/02-product-architecture.md) | Full skill taxonomy and product architecture            |
| [`docs/04-operations.md`](./docs/04-operations.md)                     | Detailed tool operations reference                      |
| [`docs/07-engineering-guides.md`](./docs/07-engineering-guides.md)     | Engineering practices and conventions                   |
| [`docs/03-agent-instructions.md`](./docs/03-agent-instructions.md)     | Agent instruction templates (generated command surface) |
| [`docs/05-env-variables.md`](./docs/05-env-variables.md)               | Complete `RULE_MCP_*` environment variable reference         |
| [`docs/04-operations.md`](./docs/04-operations.md)                     | Operator handbook + generated census blocks             |
| [`docs/adr/ADR.md`](./docs/adr/ADR.md)                                 | Architecture Decision Records index                     |

---

## Test Evidence

- `pnpm test:foundations` - the unit batch is green over `src/`
- routing corpus pinned at 80/99 exact and 99/99 top-or-alternative (BM25
  scorer parity with the source, ADR 047 numbers reproduced on the union)
- lint zero errors, prettier clean, self-guardrails green over the whole `src/`
  tree, installer/transport suites green
- decisions recorded in the [ADR index](docs/adr/ADR.md)

## Credits & attribution

`src/core/text/` — the deterministic caveman output pipeline — is inspired by
[`caveman`](https://github.com/JuliusBrussee/caveman) and its
`caveman-compress` companion: the vocabulary tables, the classification guards
(`detect.py` → `_classify.js`) and the structural validator (`validate.py` →
`compress-guard/`) are ported, with a parity test that runs the real python
CLI when installed. The LLM compression step is deliberately not ported — an
LLM in the output path costs determinism, cacheability and the zero-dependency
contract (ADR 073). Every server→model surface is compressed (or documented as
deliberately not) — see the manifest in
[`src/core/text/_surfaces.js`](src/core/text/_surfaces.js) and the
"Compression surfaces" section of
[`docs/07-engineering-guides.md`](docs/07-engineering-guides.md); the list
surfaces joined the pipeline under [ADR 077](docs/adr/077-compress-every-server-model-list-surface-prompts-list-tools-list-resources-list.md),
agent command files at write time under ADR 078.

## Contributing

Small fixes need no ceremony; structural change needs an ADR first.
Start at [CONTRIBUTING.md](./CONTRIBUTING.md), then
[GOVERNANCE.md](./GOVERNANCE.md) for who decides,
[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for the standard of behavior, and
[SECURITY.md](./SECURITY.md) for reporting vulnerabilities, and
[ROADMAP.md](./ROADMAP.md) for where the project is going. The deeper
engineering material lives in [`docs/07-engineering-guides.md`](./docs/07-engineering-guides.md).

## Sponsors

rule-mcp is unfunded today. Sponsorship through [GitHub Sponsors](https://github.com/sponsors/pixu1980)
would go to hosting, release infrastructure, and maintainer time.
Sponsorship buys no roadmap priority.

## Code of Conduct

We follow the [Contributor Covenant 3.0](./CODE_OF_CONDUCT.md). Report conduct problems privately
as that file describes.

## Governance

Explicit BDFL with a documented path to co-maintainers - see [GOVERNANCE.md](./GOVERNANCE.md)
for who decides and how disputes escalate, and [MAINTAINERS.md](./MAINTAINERS.md) for who merges
today.

## Security

Report suspected vulnerabilities privately through the
[GitHub advisory form](https://github.com/pixu1980/rule-mcp/security/advisories/new) - never
a public issue. Details, SLAs, and supported versions: [SECURITY.md](./SECURITY.md).

## License

MIT - see [LICENSE](./LICENSE). The name is covered separately in
[TRADEMARK.md](./TRADEMARK.md).
