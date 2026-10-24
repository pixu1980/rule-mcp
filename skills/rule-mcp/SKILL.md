---
name: rule-mcp
description: >-
  Use when routing any coding request to the correct rule-mcp skill. Acts as the central dispatcher for all skill and tool selection.
tags:
  - index
  - dispatcher
  - orchestrator
  - router
  - taxonomy
  - tools
frameworks: [all]
---

# rule-mcp - Skill and tool dispatcher

`rule-mcp` is the canonical entry point for the full rule-mcp ecosystem. It routes user intent to the smallest set of specialized skills and MCP tools needed to complete the task without duplicating context.

## Dispatch contract

1. Classify the task by domain, framework, platform, toolchain, and lifecycle phase.
2. Select one primary skill; add secondary skills only for real cross-cutting concerns.
3. Prefer MCP tools for deterministic work: detection, search, templates, guardrails, scaffolding, ADRs, fixes, and handoff.
4. Keep context portable for all LLMs: use exact skill names, exact tool names, and linked references.
5. For UI code, always include `rule-mcp-styleguide` plus the framework/platform skill.
6. For implementation work, include `rule-mcp-devops-testing` and the relevant process skill.

## Mandatory anti-hallucination workflow

1. Treat routed skill text and deterministic MCP output as source of truth.
2. Never invent tools, skills, APIs, files, dependencies, requirements, or successful checks.
3. Missing evidence means unknown: call `rule_tool_search` or state uncertainty.
4. Server preprocessing rejects blank, unsafe, oversized, deeply nested, or malformed tool input before execution.
5. Server postprocessing validates result shape and verifies router skill/tool names before output reaches model.
6. Every successful tool result carries `_meta.ruleEnforcement` plus visible `PIX ENFORCEMENT CONTRACT`.
7. Generated code must pass `rule_tool_check`; failures are blocking tool errors. Fix and rerun until all pass.
8. Report only tests/typechecks actually executed and their real output.

## Fast routing tree

```text
Prompt
  ├─ unsure / broad / multi-domain      → rule-mcp + rule_tool_search
  ├─ architecture / SDD / plan          → rule-mcp-process-adr
  ├─ UI / component / page              → rule-mcp-frontend + framework skill + rule-mcp-styleguide
  ├─ meta-framework                     → rule-mcp-meta-* + base framework skill
  ├─ AI / agent / LLM application       → rule-mcp-ai + focused AI skill
  ├─ backend / REST / GraphQL / security → rule-mcp-backend + framework/security/API skill
  ├─ database / persistence             → rule-mcp-data + database skill
  ├─ Docker / CI / tests / observability / release → rule-mcp-devops + focused DevOps skill
  ├─ web / desktop / library / mobile   → rule-mcp-platform + platform skill
  ├─ docs / ADR / review / handoff / workflow → rule-mcp-process + process tool
  ├─ lint/build/package config          → rule-mcp-toolchain + focused toolchain skill
  ├─ commit / push / git discipline     → rule-mcp-styleguide-git
  └─ concrete component/test template   → the rulemcp://templates resource
```

## MCP tools

| Tool                                         | Role        | Use when                                                                                                                                 |
| -------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `rule-mcp`                                   | Router      | Route a prompt to the correct rule-mcp skill. Returns structured routing with relevant sections.                                         |
| `rule_tool_search`                           | Search      | Semantic search across ALL rule-mcp skills using BM25 ranking. Returns scored, relevant sections.                                        |
| `rule_tool_check`                            | Guardrails  | Run blocking guardrail checks against any rule-mcp skill. Pass `previousPassed` while iterating; finalize only when all checks pass.     |
| `rule_tool_styleguide`                       | Scaffold    | `mode=scaffold` generates project scaffolding files: one with `file=<name>`, or all of them.                                             |
| `rule_tool_detect`                           | Detection   | Detect project framework, TypeScript usage, and build tool from package.json.                                                            |
| `rule_tool_process_adr`                      | ADR         | Save an Architecture Decision Record (ADR) to docs/adr/. Auto-numbers, maintains index, uses Nygard template.                            |
| `/rule-area-styleguide` (request: file-tree) | Check + fix | Report the file tree with `rule_tool_check` and apply the mechanical guardrail fixes with `rule_tool_fix` (ADR 117: hub slash only).     |
| `rule_tool_handoff`                          | Handoff     | Generate a compressed LLM handoff summary from ADR logs and project context. Paste the output into a new chat to resume work seamlessly. |
| `rulemcp://templates`                        | Templates   | Component and test templates, served as resources.                                                                                       |
| `rule_tool_fix`                              | Fix         | Apply the deterministic guardrail fixes of every skill (blank lines, braces, ASCII typography, American spelling).                       |

### Skill tool naming

Every regular skill is also exposed as `rule_tool_` + skill name without `rule-mcp-` + hyphens converted to underscores. Example: `rule-mcp-frontend-react` -> `rule_tool_frontend_react`. Some process skills use dedicated action tools instead of generic skill tools: `rule-mcp-process-adr` -> `rule_tool_process_adr`, `rule-mcp-process-adr` -> `rule_tool_process_adr`; session handoff/handon -> `rule_tool_handoff` / `rule_tool_handon`.

## Complete skill inventory

### AI

Build AI agent repositories, providers, tools, registries, and tests.

| Skill                                  | Tool           | Frameworks | Use when                                                                                                            |
| -------------------------------------- | -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| [rule-mcp-ai](../rule-mcp-ai/SKILL.md) | `rule_tool_ai` | all        | Index of all AI/agent skills: agent scaffolding on `@rule-mcp/rule-mcp-core` and framework-agnostic agent guidance. |

### Architecture

Plan architecture, SDD, context, and scaffolding flow.

| Skill | Tool | Frameworks | Use when |
| ----- | ---- | ---------- | -------- |

### Backend

Design and implement APIs, runtime frameworks, security, and scaffolds.

| Skill                                                              | Tool                         | Frameworks         | Use when                                                                                                                  |
| ------------------------------------------------------------------ | ---------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| [rule-mcp-backend](../rule-mcp-backend/SKILL.md)                   | `rule_tool_backend`          | all                | Backend application development umbrella - routes REST, GraphQL, runtime, security, and database work to focused skills.  |
| [rule-mcp-backend-express](../rule-mcp-backend-express/SKILL.md)   | `rule_tool_backend_express`  | all                | Express.js 5+ best practices: middleware patterns, error handling, routing, performance optimization, security header...  |
| [rule-mcp-backend-fastify](../rule-mcp-backend-fastify/SKILL.md)   | `rule_tool_backend_fastify`  | all                | Fastify 5+ best practices: plugins, hooks, schema validation, serialization, lifecycle, logging, and performance tuni...  |
| [rule-mcp-backend-graphql](../rule-mcp-backend-graphql/SKILL.md)   | `rule_tool_backend_graphql`  | node, api, graphql | GraphQL API engineering: schema-first contracts, resolver boundaries, N+1 prevention, caching, and abuse controls.        |
| [rule-mcp-backend-hono](../rule-mcp-backend-hono/SKILL.md)         | `rule_tool_backend_hono`     | all                | Hono 4+ best practices: edge-compatible API framework, middleware patterns, RPC-style type sharing, Zod validation, a...  |
| [rule-mcp-backend-nestjs](../rule-mcp-backend-nestjs/SKILL.md)     | `rule_tool_backend_nestjs`   | all                | NestJS 10+ best practices: modular architecture, decorators, dependency injection, guards, interceptors, pipes, Graph...  |
| [rule-mcp-backend-node](../rule-mcp-backend-node/SKILL.md)         | `rule_tool_backend_node`     | node, api          | Scaffold a new rule-mcp backend-node repository. Use when creating Express + TypeScript backend structure, baseline co... |
| [rule-mcp-backend-security](../rule-mcp-backend-security/SKILL.md) | `rule_tool_backend_security` | node, api          | Apply security best practices to rule-mcp repositories. Use when handling environment variables, secrets, Docker secur... |

### Data

Model persistence, SQL, PostgreSQL, MySQL, and MongoDB.

| Skill                                                            | Tool                        | Frameworks | Use when                                                                                                                                                     |
| ---------------------------------------------------------------- | --------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [rule-mcp-data](../rule-mcp-data/SKILL.md)                       | `rule_tool_data`            | all        | Index of all data/database skills: SQL fundamentals, PostgreSQL, MySQL, and MongoDB. Delegates to the specific databa...                                     |
| [rule-mcp-data-mongodb](../rule-mcp-data-mongodb/SKILL.md)       | `rule_tool_data_mongodb`    | all        | MongoDB 7+ complete reference: schema design patterns, CRUD scripts, aggregation pipeline, indexing strategies, shard...                                     |
| [rule-mcp-data-mysql](../rule-mcp-data-mysql/SKILL.md)           | `rule_tool_data_mysql`      | all        | MySQL 8+ / MariaDB 11+ complete reference: DDL scripts, InnoDB tuning, indexing strategies, replication (async/semi-s...                                     |
| [rule-mcp-data-postgresql](../rule-mcp-data-postgresql/SKILL.md) | `rule_tool_data_postgresql` | all        | PostgreSQL 16+ complete reference: DDL scripts, indexing strategies, performance tuning, replication, partitioning, c...                                     |
| [rule-mcp-data-sql](../rule-mcp-data-sql/SKILL.md)               | `rule_tool_data_sql`        | all        | Complete SQL reference: table design patterns, index optimization, DDL scripts (CREATE/ALTER/DROP), query writing sta...                                     |
| [rule-mcp-data-validation](../rule-mcp-data-validation/SKILL.md) | `rule_tool_data_validation` | all        | Cross-border business data validation: email, phone, VAT, tax IDs, postal codes, national identification numbers, and the library schemas that enforce them. |

### DevOps

Configure Docker, CI, tests, coverage, and version automation.

| Skill                                                                      | Tool                             | Frameworks | Use when                                                                                                                  |
| -------------------------------------------------------------------------- | -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| [rule-mcp-devops](../rule-mcp-devops/SKILL.md)                             | `rule_tool_devops`               | all        | Index of DevOps and engineering skills: Docker, GitLab CI, observability, testing, and version management.                |
| [rule-mcp-devops-docker](../rule-mcp-devops-docker/SKILL.md)               | `rule_tool_devops_docker`        | all        | Create and maintain Docker configuration for rule-mcp repositories. Use when generating Dockerfiles, docker-compose.ym... |
| [rule-mcp-devops-observability](../rule-mcp-devops-observability/SKILL.md) | `rule_tool_devops_observability` | all        | Define production observability: SLOs, telemetry, alerts, incident learning, and rollback verification.                   |
| [rule-mcp-devops-testing](../rule-mcp-devops-testing/SKILL.md)             | `rule_tool_devops_testing`       | all        | Write and maintain tests for rule-mcp repositories using Vitest. Use when creating unit or integration tests, configur... |

### Dispatcher

Route ambiguous or multi-domain prompts.

| Skill                            | Tool       | Frameworks | Use when                                                                                                                  |
| -------------------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| [rule-mcp](../rule-mcp/SKILL.md) | `rule-mcp` | all        | Central dispatcher for every rule-mcp skill and MCP tool. Use first when the task is ambiguous, multi-domain, or needs... |

### Frontend

Build UI, components, routing, forms, and meta-framework apps.

| Skill                                                                              | Tool                                 | Frameworks   | Use when                                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [rule-mcp-frontend](../rule-mcp-frontend/SKILL.md)                                 | `rule_tool_frontend`                 | all          | Index of all frontend UI framework skills: React, Vue, Angular, Svelte, SolidJS, Astro, Vanilla Reactive. Includes me...                                                         |
| [rule-mcp-frontend-angular](../rule-mcp-frontend-angular/SKILL.md)                 | `rule_tool_frontend_angular`         | angular      | Angular best practices aligned with rule-mcp-styleguide. Zero CSS classes (eleme...                                                                                              |
| [rule-mcp-meta-astro](../rule-mcp-meta-astro/SKILL.md)                             | `rule_tool_meta_astro`               | astro        | Astro best practices aligned with rule-mcp-styleguide. Zero CSS classes, zero in...                                                                                              |
| [rule-mcp-meta-next](../rule-mcp-meta-next/SKILL.md)                               | `rule_tool_meta_next`                | next, react  | Next.js application development with rule-mcp principles. Covers App Router, Server Components, SSR/SSG/ISR, API route...                                                        |
| [rule-mcp-meta-nuxt](../rule-mcp-meta-nuxt/SKILL.md)                               | `rule_tool_meta_nuxt`                | nuxt, vue    | Nuxt.js application development with rule-mcp principles. Covers file-based routing, SSR/SSG, server routes, auto-impo...                                                        |
| [rule-mcp-meta-remix](../rule-mcp-meta-remix/SKILL.md)                             | `rule_tool_meta_remix`               | remix, react | Remix / React Router application development with rule-mcp principles. Covers nested routing, loaders/actions, SSR, pr...                                                        |
| [rule-mcp-frontend-react](../rule-mcp-frontend-react/SKILL.md)                     | `rule_tool_frontend_react`           | react        | React best practices aligned with rule-mcp-styleguide. Zero CSS classes (element...                                                                                              |
| [rule-mcp-frontend-solidjs](../rule-mcp-frontend-solidjs/SKILL.md)                 | `rule_tool_frontend_solidjs`         | solidjs      | SolidJS best practices aligned with rule-mcp-styleguide. Zero CSS classes (eleme...                                                                                              |
| [rule-mcp-frontend-template-engine](../rule-mcp-frontend-template-engine/SKILL.md) | `rule_tool_frontend_template_engine` | vanilla      | File-based HTML template engine for static HTML, SSG, SSR: extends/include/block inheritance, if/for/switch directives, filter pipelines, tagged literals, browser-safe runtime. |
| [rule-mcp-frontend-svelte](../rule-mcp-frontend-svelte/SKILL.md)                   | `rule_tool_frontend_svelte`          | svelte       | Svelte 5 / SvelteKit best practices aligned with rule-mcp-styleguide. Zero CSS c...                                                                                              |
| [rule-mcp-frontend-vue](../rule-mcp-frontend-vue/SKILL.md)                         | `rule_tool_frontend_vue`             | vue          | Vue 3 best practices aligned with rule-mcp-styleguide. Zero CSS classes (element...                                                                                              |

### Platform

Select project platform: web, desktop, library, Expo/mobile.

| Skill                                                              | Tool                         | Frameworks        | Use when                                                                                                                  |
| ------------------------------------------------------------------ | ---------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [rule-mcp-platform](../rule-mcp-platform/SKILL.md)                 | `rule_tool_platform`         | all               | Index of all platform/project-type skills: Desktop (Electron), Expo (React Native), Library authoring, and Web platfo...  |
| [rule-mcp-platform-desktop](../rule-mcp-platform-desktop/SKILL.md) | `rule_tool_platform_desktop` | electron, desktop | Desktop application development with rule-mcp principles. Project type umbrella for desktop apps. Primary framework: E... |
| [rule-mcp-platform-library](../rule-mcp-platform-library/SKILL.md) | `rule_tool_platform_library` | all               | Reusable library/package development with rule-mcp principles. Covers pnpm package structure, public API design, TypeS... |
| [rule-mcp-platform-web](../rule-mcp-platform-web/SKILL.md)         | `rule_tool_platform_web`     | all               | Web application development with rule-mcp principles. Covers browser-based app architecture, bundling, routing, progre... |

### Process

Write ADRs/docs, follow BMAD, feature workflow, and handoff.

| Skill                                                                    | Tool                            | Frameworks | Use when                                                                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [rule-mcp-process](../rule-mcp-process/SKILL.md)                         | `rule_tool_process`             | all        | Index of process skills: ADR, BMAD, code review, documentation, feature workflow, and LLM handoff.                                        |
| [rule-mcp-process-ai](../rule-mcp-process-ai/SKILL.md)                   | `rule_tool_process_ai`          | all        | Intent to incident, plan before code, gates and review, plus the scope contract, English with American spelling and the prose rules.      |
| [rule-mcp-process-adr](../rule-mcp-process-adr/SKILL.md)                 | `rule_tool_process_adr`         | all        | Architecture Decision Records (ADR) for rule-mcp projects. Capture, store, and manage architectural decisions in docs/...                 |
| [rule-mcp-process-bmad](../rule-mcp-process-bmad/SKILL.md)               | `rule_tool_process_bmad`        | all        | BMAD Method (Build More Architect Dreams) - AI-driven development framework for structured software delivery through...                   |
| [rule-mcp-process-code-review](../rule-mcp-process-code-review/SKILL.md) | `rule_tool_process_code_review` | all        | Prepare and conduct risk-based PR/MR reviews with explicit quality, safety, and follow-up gates.                                          |
| [rule-mcp-process-readme](../rule-mcp-process-readme/SKILL.md)           | `rule_tool_process_readme`      | all        | Write or rewrite a project README: the opening block, the facts, the example, getting started, and the license and contribution sections. |
| `rule_tool_handoff` / `/rule-handoff`                                    | `rule_tool_handoff`             | all        | Generate a compressed LLM handoff summary from ADR logs and project context. Enables cross-chat recovery, model-switc...                  |

### Styleguide

Apply HTML/CSS/JS/JSON/Markdown/a11y/naming/validation standards.

| Skill                                                                              | Tool                                 | Frameworks | Use when                                                                                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [rule-mcp-styleguide](../rule-mcp-styleguide/SKILL.md)                             | `rule_tool_styleguide`               | all        | Central index of all rule-mcp coding style guides. Delegates to specialized sub-skills: HTML semantics, CSS architectu...                             |
| [rule-mcp-styleguide-a11y](../rule-mcp-styleguide-a11y/SKILL.md)                   | `rule_tool_styleguide_a11y`          | all        | WCAG 2.2 AA accessibility: semantic HTML, ARIA, keyboard navigation, color contrast, forms, media, automated testing...                               |
| [rule-mcp-styleguide-css](../rule-mcp-styleguide-css/SKILL.md)                     | `rule_tool_styleguide_css`           | all        | CSS architecture, selector strategy (data-part, element), naming conventions, property ordering, custom properties, c...                              |
| [rule-mcp-styleguide-configuration](../rule-mcp-styleguide-configuration/SKILL.md) | `rule_tool_styleguide_configuration` | all        | Base project configuration files: .gitignore, .editorconfig, .nvmrc, .env.example, README, LICENSE, CONTRIBUTING, and the toolchain config baselines. |
| [rule-mcp-styleguide-git](../rule-mcp-styleguide-git/SKILL.md)                     | `rule_tool_styleguide_git`           | all        | Atomic Conventional Commits with a mandatory scope, branch naming, and the commit-msg and pre-push discipline.                                        |
| [rule-mcp-styleguide-html](../rule-mcp-styleguide-html/SKILL.md)                   | `rule_tool_styleguide_html`          | all        | Semantic HTML, document structure, template engine syntax, accessibility essentials, and element conventions for fron...                              |
| [rule-mcp-styleguide-javascript](../rule-mcp-styleguide-javascript/SKILL.md)       | `rule_tool_styleguide_javascript`    | all        | JavaScript conventions: naming, functions, classes, async patterns, DOM manipulation, custom elements, static initial...                              |
| [rule-mcp-styleguide-json](../rule-mcp-styleguide-json/SKILL.md)                   | `rule_tool_styleguide_json`          | all        | JSON structure conventions: validity, property naming, date formats, numeric precision, schema mindset, and API respo...                              |
| [rule-mcp-styleguide-markdown](../rule-mcp-styleguide-markdown/SKILL.md)           | `rule_tool_styleguide_markdown`      | all        | Markdown documentation style: document structure, headings, lists, code blocks, formatting, tables, links, and tone f...                              |
| [rule-mcp-styleguide-naming](../rule-mcp-styleguide-naming/SKILL.md)               | `rule_tool_styleguide_naming`        | all        | Naming conventions and file tree structure: PascalCase, camelCase, UPPER_SNAKE_CASE, underscore prefix rule, barrel p...                              |

### Toolchain

Configure pnpm, TypeScript, ESLint, Biome, Vite, Parcel, Turborepo, Husky.

| Skill                                                                    | Tool                            | Frameworks | Use when                                                                                                                 |
| ------------------------------------------------------------------------ | ------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| [rule-mcp-toolchain](../rule-mcp-toolchain/SKILL.md)                     | `rule_tool_toolchain`           | all        | Index of all toolchain skills: build tools (Vite, Parcel), linters (Biome, ESLint), package management (pnpm), monore... |
| [rule-mcp-toolchain-biome](../rule-mcp-toolchain-biome/SKILL.md)         | `rule_tool_toolchain_biome`     | all        | Biome linter and formatter configuration and best practices. Zero-config by default, but covers migration from ESLint... |
| [rule-mcp-toolchain-eslint](../rule-mcp-toolchain-eslint/SKILL.md)       | `rule_tool_toolchain_eslint`    | all        | ESLint 9+ flat config: rule sets for TypeScript, React, and Node.js, plugin integration, custom rules, and CI integra... |
| [rule-mcp-toolchain-husky](../rule-mcp-toolchain-husky/SKILL.md)         | `rule_tool_toolchain_husky`     | all        | Git hooks management with Husky: commit hooks, pre-push validation, lint-staged integration, commitlint, and CI-frien... |
| [rule-mcp-toolchain-parcel](../rule-mcp-toolchain-parcel/SKILL.md)       | `rule_tool_toolchain_parcel`    | all        | Parcel 2+ zero-configuration bundler: entry points, transpilation, code splitting, image optimization, environment va... |
| [rule-mcp-toolchain-pnpm](../rule-mcp-toolchain-pnpm/SKILL.md)           | `rule_tool_toolchain_pnpm`      | all        | pnpm package manager: workspace management, dependency resolution, caching strategies, CI optimization, and monorepo...  |
| [rule-mcp-toolchain-turborepo](../rule-mcp-toolchain-turborepo/SKILL.md) | `rule_tool_toolchain_turborepo` | all        | Turborepo monorepo orchestration: pipeline configuration, caching, remote caching, task dependency graphs, and worksp... |
| [rule-mcp-toolchain-vite](../rule-mcp-toolchain-vite/SKILL.md)           | `rule_tool_toolchain_vite`      | all        | Vite build tool configuration and best practices. Covers vite.config.ts, vitest.config.ts, environment variables, bui... |

### UI

Design and route visible interface work while preserving rule-mcp implementation constraints.

| Skill                                                              | Tool                         | Frameworks | Use when                                                                                                                          |
| ------------------------------------------------------------------ | ---------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [rule-mcp-ui](../rule-mcp-ui/SKILL.md)                             | `rule_tool_ui`               | all        | Umbrella skill for all user-interface work in the rule-mcp ecosystem. Use when a task affects visual UI, component composition... |
| [rule-mcp-ui-design-system](../rule-mcp-ui-design-system/SKILL.md) | `rule_tool_ui_design_system` | all        | Distinctive production-grade UI design direction for rule-mcp projects. Use when designing pages, components, dashboards...       |

## Recommended dispatch bundles

| Task                     | Primary                                                       | Secondary                                                   | Deterministic tools                                     |
| ------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| Unknown project          | `rule-mcp`                                                    | `rule-mcp-process-adr`                                      | `rule_tool_detect`, `rule_tool_search`                  |
| AI agent app             | `rule-mcp-ai`                                                 | `rule-mcp-ai-agent-architecture`, `rule-mcp-devops-testing` | `rule_tool_check`, `rule_tool_process_adr`              |
| New web UI               | `rule-mcp-ui` + `rule-mcp-ui-design-system` + framework skill | `rule-mcp-styleguide`, `rule-mcp-platform-web`              | `rulemcp://templates`, `rule_tool_check`                |
| React/Vite app           | `rule-mcp-frontend-react`                                     | `rule-mcp-toolchain-vite`, `rule-mcp-styleguide`            | `rule_tool_styleguide` (scaffold), `rule_tool_check`    |
| Backend API              | `rule-mcp-backend-node`                                       | `rule-mcp-backend-security`                                 | `rule_tool_check`, `rule_tool_process_adr`              |
| Database work            | database skill                                                | `rule-mcp-data`                                             | `rule_tool_search`, `rule_tool_check`                   |
| Docker/CI/tests          | `rule-mcp-devops` focused skill                               | platform skill                                              | `rule_tool_detect`, `/rule-area-styleguide` (file-tree) |
| GraphQL API              | `rule-mcp-backend-graphql`                                    | runtime skill, `rule-mcp-backend-security`                  | `rule_tool_search`, `rule_tool_check`                   |
| Production observability | `rule-mcp-devops-observability`                               | runtime and platform skill                                  | `rule_tool_check`, `rule_tool_process_adr`              |
| Code review              | `rule-mcp-process-code-review`                                | feature workflow, relevant domain skill                     | `rule_tool_check`                                       |
| Commit/push              | `rule-mcp-styleguide-git`                                     | `rule-mcp-toolchain-husky`                                  | `rule_tool_check`                                       |
| Docs/ADR                 | `rule-mcp-styleguide-markdown`                                | `rule-mcp-process-adr`                                      | `rule_tool_process_adr`, `rule_tool_handoff`            |
| File-tree cleanup        | `rule-mcp-styleguide-naming`                                  | `rule-mcp-styleguide-configuration`                         | `/rule-area-styleguide` (file-tree), `rule_tool_check`  |

## Operational sequence

1. Call `rule_tool_detect` when a project path is available.
2. Call `rule-mcp` with the user prompt and optional framework hint.
3. Read the primary skill in `mode=tldr` or `mode=search` before `mode=full`.
4. Generate deterministic artifacts with the `rulemcp://templates` resource or `rule_tool_styleguide mode=scaffold`.
5. Validate with `rule_tool_check`; pass `previousPassed` on subsequent iterations.
6. Record major decisions with `rule_tool_process_adr`.
7. Use `/rule-area-styleguide` with file-tree in the request (or `rule_tool_styleguide_file_tree`) for file-tree convention fixes and `rule_tool_handoff` before context switches.

## Conventions (rules -> skills merge)

# rule-mcp AI Skills - Common

You are an AI coding assistant operating inside a rule-mcp repository. Follow every rule below without exception. When a rule references a detailed specification, read the corresponding file under `rules` or `skills` before proceeding.

## MCP server

This rule system is also available as an MCP server (`rule-mcp-rules`). If you have access to it, prefer calling `get_skill` and `get_rule` directly instead of reading files from disk. Load only the specific rule/skill needed for the current task.

## Identity

- You work on rule-mcp projects
- You never create a LICENSE file
- You never create `.github` directories or GitHub Actions workflows

## Skills to load, and when

Load `rule-mcp` first: it is the index. Pull in the domain skill only when the task
touches that domain:

| Skill                            | When to load                                                      |
| -------------------------------- | ----------------------------------------------------------------- |
| `rule-mcp-styleguide-git`        | **Immediately** - before any branch, commit, or push              |
| `rule-mcp-styleguide-markdown`   | **Immediately** - when writing or updating README and prose files |
| `rule-mcp-styleguide-typescript` | **Immediately** - when writing TypeScript types and interfaces    |
| `rule-mcp-devops-testing`        | When creating tests or configuring coverage                       |
| `rule-mcp-styleguide-a11y`       | **Frontend only** - when accessibility is part of the requirement |
| `rule-mcp-styleguide-i18n`       | **Frontend only** - when internationalization is needed           |
| `rule-mcp-backend-security`      | **Backend only** - when the service must be hardened              |

### What each one covers

- **`rule-mcp-styleguide-git`** - Branch naming prefixes (`feat/`, `fix/`, `refactor/`), Conventional
  Commits with mandatory scope, merge-request conventions
- **`rule-mcp-styleguide-markdown`** - One `#` title, an intro naming the audience, ordered headings,
  descriptive relative links, no repetition
- **`rule-mcp-styleguide-typescript`** - Enum patterns (`as const` over enums), no `any`, `readonly`,
  `satisfies`, discriminated unions, and the compiler configuration in `COMPILER.md`
- **`rule-mcp-devops-testing`** - Test structure, Vitest configuration, and the coverage floor
- **`rule-mcp-styleguide-a11y`** - WCAG 2.1 AA, semantic HTML, ARIA, the European Accessibility Act
- **`rule-mcp-styleguide-i18n`** - Translation keys, pluralization, RTL, `Intl.*` APIs
- **`rule-mcp-backend-security`** - OAuth 2.0, JWT validation, rate limiting, CORS, HTTPS hardening

## When scaffolding a new repository

Start from the matching scaffold and follow it end to end:

- Backend API or service: `rule-mcp-backend-node`
- Frontend: the framework skill (`rule-mcp-frontend-*`) plus `rule-mcp-styleguide`
- AI agent project: `rule-mcp-ai` with `rule-mcp-ai-agent-architecture`
- Testing configuration lands with `rule-mcp-devops-testing`

## See also

- [rule-mcp-styleguide](../rule-mcp-styleguide/SKILL.md) - Shared coding standards
- [rule-mcp-toolchain](../rule-mcp-toolchain/SKILL.md) - Toolchain index
