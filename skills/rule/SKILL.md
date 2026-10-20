---
name: rule
description: >-
  Use when routing any coding request to the correct rule skill. Acts as the central dispatcher for all skill and tool selection.
tags:
  - index
  - dispatcher
  - orchestrator
  - router
  - taxonomy
  - tools
frameworks: [all]
---

# rule - Skill and tool dispatcher

`rule` is the canonical entry point for the full rule ecosystem. It routes user intent to the smallest set of specialized skills and MCP tools needed to complete the task without duplicating context.

## Dispatch contract

1. Classify the task by domain, framework, platform, toolchain, and lifecycle phase.
2. Select one primary skill; add secondary skills only for real cross-cutting concerns.
3. Prefer MCP tools for deterministic work: detection, search, templates, guardrails, scaffolding, ADRs, fixes, and handoff.
4. Keep context portable for all LLMs: use exact skill names, exact tool names, and linked references.
5. For UI code, always include `rule-styleguide` plus the framework/platform skill.
6. For implementation work, include `rule-devops-testing` and the relevant process skill.

## Mandatory anti-hallucination workflow

1. Treat routed skill text and deterministic MCP output as source of truth.
2. Never invent tools, skills, APIs, files, dependencies, requirements, or successful checks.
3. Missing evidence means unknown: call `rule_tool_search` or state uncertainty.
4. Server preprocessing rejects blank, unsafe, oversized, deeply nested, or malformed tool input before execution.
5. Server postprocessing validates result shape and verifies router skill/tool names before output reaches model.
6. Every successful tool result carries `_meta.pixEnforcement` plus visible `PIX ENFORCEMENT CONTRACT`.
7. Generated code must pass `rule_tool_check`; failures are blocking tool errors. Fix and rerun until all pass.
8. Report only tests/typechecks actually executed and their real output.

## Fast routing tree

```text
Prompt
  ├─ unsure / broad / multi-domain      → rule + rule_tool_search
  ├─ architecture / SDD / plan          → rule-process-adr
  ├─ UI / component / page              → rule-frontend + framework skill + rule-styleguide
  ├─ meta-framework                     → rule-meta-* + base framework skill
  ├─ AI / agent / LLM application       → rule-ai + focused AI skill
  ├─ backend / REST / GraphQL / security → rule-backend + framework/security/API skill
  ├─ database / persistence             → rule-data + database skill
  ├─ Docker / CI / tests / observability / release → rule-devops + focused DevOps skill
  ├─ web / desktop / library / mobile   → rule-platform + platform skill
  ├─ docs / ADR / review / handoff / workflow → rule-process + process tool
  ├─ lint/build/package config          → rule-toolchain + focused toolchain skill
  ├─ commit / push / git discipline     → rule-styleguide-git
  └─ concrete component/test template   → the rule://templates resource
```

## MCP tools

| Tool                                        | Role        | Use when                                                                                                                                 |
| ------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `rule`                                       | Router      | Route a prompt to the correct rule skill. Returns structured routing with relevant sections.                                              |
| `rule_tool_search`                           | Search      | Semantic search across ALL rule skills using BM25 ranking. Returns scored, relevant sections.                                             |
| `rule_tool_check`                            | Guardrails  | Run blocking guardrail checks against any rule skill. Pass `previousPassed` while iterating; finalize only when all checks pass.          |
| `rule_tool_styleguide`                       | Scaffold    | `mode=scaffold` generates project scaffolding files: one with `file=<name>`, or all of them.                                             |
| `rule_tool_detect`                           | Detection   | Detect project framework, TypeScript usage, and build tool from package.json.                                                            |
| `rule_tool_process_adr`                      | ADR         | Save an Architecture Decision Record (ADR) to docs/adr/. Auto-numbers, maintains index, uses Nygard template.                            |
| `/rule-area-styleguide` (request: file-tree) | Check + fix | Report the file tree with `rule_tool_check` and apply the mechanical guardrail fixes with `rule_tool_fix` (ADR 117: hub slash only).       |
| `rule_tool_handoff`                          | Handoff     | Generate a compressed LLM handoff summary from ADR logs and project context. Paste the output into a new chat to resume work seamlessly. |
| `rule://templates`                           | Templates   | Component and test templates, served as resources.                                                                                       |
| `rule_tool_fix`                              | Fix         | Apply the deterministic guardrail fixes of every skill (blank lines, braces, ASCII typography, American spelling).                       |

### Skill tool naming

Every regular skill is also exposed as `pix_` + skill name without `rule-` + hyphens converted to underscores. Example: `rule-frontend-react` -> `pix_frontend_react`. Some process skills use dedicated action tools instead of generic skill tools: `rule-process-adr` -> `rule_tool_process_adr`, `rule-process-adr` -> `rule_tool_process_adr`; session handoff/handon -> `rule_tool_handoff` / `rule_tool_handon`.

## Complete skill inventory

### AI

Build AI agent repositories, providers, tools, registries, and tests.

| Skill                                                | Tool                 | Frameworks   | Use when                                                                                                                                                   |
| ---------------------------------------------------- | -------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [rule-ai](../rule-ai/SKILL.md)                         | `pix_ai`             | all          | Index of all AI/agent skills: agent scaffolding on `@rule/rule-mcp-core` and framework-agnostic agent guidance.                                           |
| [rule-platform-agent](../rule-platform-agent/SKILL.md) | `pix_platform_agent` | node, agents | Scaffold and maintain AI Agent projects. Covers structure, tools, env config, testing, and containerization without prescribing any specific core library. |

### Architecture

Plan architecture, SDD, context, and scaffolding flow.

| Skill | Tool | Frameworks | Use when |
| ----- | ---- | ---------- | -------- |

### Backend

Design and implement APIs, runtime frameworks, security, and scaffolds.

| Skill                                                    | Tool                   | Frameworks         | Use when                                                                                                                 |
| -------------------------------------------------------- | ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| [rule-backend](../rule-backend/SKILL.md)                   | `pix_backend`          | all                | Backend application development umbrella - routes REST, GraphQL, runtime, security, and database work to focused skills. |
| [rule-backend-express](../rule-backend-express/SKILL.md)   | `pix_backend_express`  | all                | Express.js 5+ best practices: middleware patterns, error handling, routing, performance optimization, security header... |
| [rule-backend-fastify](../rule-backend-fastify/SKILL.md)   | `pix_backend_fastify`  | all                | Fastify 5+ best practices: plugins, hooks, schema validation, serialization, lifecycle, logging, and performance tuni... |
| [rule-backend-graphql](../rule-backend-graphql/SKILL.md)   | `pix_backend_graphql`  | node, api, graphql | GraphQL API engineering: schema-first contracts, resolver boundaries, N+1 prevention, caching, and abuse controls.       |
| [rule-backend-hono](../rule-backend-hono/SKILL.md)         | `pix_backend_hono`     | all                | Hono 4+ best practices: edge-compatible API framework, middleware patterns, RPC-style type sharing, Zod validation, a... |
| [rule-backend-nestjs](../rule-backend-nestjs/SKILL.md)     | `pix_backend_nestjs`   | all                | NestJS 10+ best practices: modular architecture, decorators, dependency injection, guards, interceptors, pipes, Graph... |
| [rule-backend-node](../rule-backend-node/SKILL.md)         | `pix_backend_node`     | node, api          | Scaffold a new rule backend-node repository. Use when creating Express + TypeScript backend structure, baseline co...     |
| [rule-backend-security](../rule-backend-security/SKILL.md) | `pix_backend_security` | node, api          | Apply security best practices to rule repositories. Use when handling environment variables, secrets, Docker secur...     |

### Data

Model persistence, SQL, PostgreSQL, MySQL, and MongoDB.

| Skill                                                  | Tool                  | Frameworks | Use when                                                                                                                                                     |
| ------------------------------------------------------ | --------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [rule-data](../rule-data/SKILL.md)                       | `pix_data`            | all        | Index of all data/database skills: SQL fundamentals, PostgreSQL, MySQL, and MongoDB. Delegates to the specific databa...                                     |
| [rule-data-mongodb](../rule-data-mongodb/SKILL.md)       | `pix_data_mongodb`    | all        | MongoDB 7+ complete reference: schema design patterns, CRUD scripts, aggregation pipeline, indexing strategies, shard...                                     |
| [rule-data-mysql](../rule-data-mysql/SKILL.md)           | `pix_data_mysql`      | all        | MySQL 8+ / MariaDB 11+ complete reference: DDL scripts, InnoDB tuning, indexing strategies, replication (async/semi-s...                                     |
| [rule-data-postgresql](../rule-data-postgresql/SKILL.md) | `pix_data_postgresql` | all        | PostgreSQL 16+ complete reference: DDL scripts, indexing strategies, performance tuning, replication, partitioning, c...                                     |
| [rule-data-sql](../rule-data-sql/SKILL.md)               | `pix_data_sql`        | all        | Complete SQL reference: table design patterns, index optimization, DDL scripts (CREATE/ALTER/DROP), query writing sta...                                     |
| [rule-data-validation](../rule-data-validation/SKILL.md) | `pix_data_validation` | all        | Cross-border business data validation: email, phone, VAT, tax IDs, postal codes, national identification numbers, and the library schemas that enforce them. |

### DevOps

Configure Docker, CI, tests, coverage, and version automation.

| Skill                                                            | Tool                       | Frameworks | Use when                                                                                                             |
| ---------------------------------------------------------------- | -------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| [rule-devops](../rule-devops/SKILL.md)                             | `pix_devops`               | all        | Index of DevOps and engineering skills: Docker, GitLab CI, observability, testing, and version management.           |
| [rule-devops-docker](../rule-devops-docker/SKILL.md)               | `pix_devops_docker`        | all        | Create and maintain Docker configuration for rule repositories. Use when generating Dockerfiles, docker-compose.ym... |
| [rule-devops-observability](../rule-devops-observability/SKILL.md) | `pix_devops_observability` | all        | Define production observability: SLOs, telemetry, alerts, incident learning, and rollback verification.              |
| [rule-devops-testing](../rule-devops-testing/SKILL.md)             | `pix_devops_testing`       | all        | Write and maintain tests for rule repositories using Vitest. Use when creating unit or integration tests, configur... |

### Dispatcher

Route ambiguous or multi-domain prompts.

| Skill                  | Tool  | Frameworks | Use when                                                                                                             |
| ---------------------- | ----- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| [rule](../rule/SKILL.md) | `rule` | all        | Central dispatcher for every rule skill and MCP tool. Use first when the task is ambiguous, multi-domain, or needs... |

### Frontend

Build UI, components, routing, forms, and meta-framework apps.

| Skill                                                                      | Tool                            | Frameworks   | Use when                                                                                                                                                                         |
| -------------------------------------------------------------------------- | ------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [rule-frontend](../rule-frontend/SKILL.md)                                   | `pix_frontend`                  | all          | Index of all frontend UI framework skills: React, Vue, Angular, Svelte, SolidJS, Astro, Vanilla Reactive. Includes me...                                                         |
| [rule-frontend-angular](../rule-frontend-angular/SKILL.md)                   | `pix_frontend_angular`          | angular      | Angular best practices aligned with rule-styleguide and rule-frontend-vanilla-reactive. Zero CSS classes (eleme...                                                                 |
| [rule-meta-astro](../rule-meta-astro/SKILL.md)                               | `pix_meta_astro`                | astro        | Astro best practices aligned with rule-styleguide and rule-frontend-vanilla-reactive. Zero CSS classes, zero in...                                                                 |
| [rule-meta-next](../rule-meta-next/SKILL.md)                                 | `pix_meta_next`                 | next, react  | Next.js application development with rule principles. Covers App Router, Server Components, SSR/SSG/ISR, API route...                                                             |
| [rule-meta-nuxt](../rule-meta-nuxt/SKILL.md)                                 | `pix_meta_nuxt`                 | nuxt, vue    | Nuxt.js application development with rule principles. Covers file-based routing, SSR/SSG, server routes, auto-impo...                                                             |
| [rule-meta-remix](../rule-meta-remix/SKILL.md)                               | `pix_meta_remix`                | remix, react | Remix / React Router application development with rule principles. Covers nested routing, loaders/actions, SSR, pr...                                                             |
| [rule-frontend-react](../rule-frontend-react/SKILL.md)                       | `pix_frontend_react`            | react        | React best practices aligned with rule-styleguide and rule-frontend-vanilla-reactive. Zero CSS classes (element...                                                                 |
| [rule-frontend-solidjs](../rule-frontend-solidjs/SKILL.md)                   | `pix_frontend_solidjs`          | solidjs      | SolidJS best practices aligned with rule-styleguide and rule-frontend-vanilla-reactive. Zero CSS classes (eleme...                                                                 |
| [rule-frontend-custom-element](../rule-frontend-custom-element/SKILL.md)     | `pix_frontend_custom_element`   | vanilla      | Zero-dependency Custom Elements v1 (autonomous and customized built-ins): metadata-driven componentDecorator, adoptedStyleSheets, code-splitting, CLI scaffolder.                |
| [rule-frontend-template-engine](../rule-frontend-template-engine/SKILL.md)   | `pix_frontend_template_engine`  | vanilla      | File-based HTML template engine for static HTML, SSG, SSR: extends/include/block inheritance, if/for/switch directives, filter pipelines, tagged literals, browser-safe runtime. |
| [rule-frontend-svelte](../rule-frontend-svelte/SKILL.md)                     | `pix_frontend_svelte`           | svelte       | Svelte 5 / SvelteKit best practices aligned with rule-styleguide and rule-frontend-vanilla-reactive. Zero CSS c...                                                                 |
| [rule-frontend-vanilla-reactive](../rule-frontend-vanilla-reactive/SKILL.md) | `pix_frontend_vanilla_reactive` | vanilla      | Vanilla JS reactive pattern: Proxy-based Store, Signals (State/Computed), microtask-scheduled effects, template engin...                                                         |
| [rule-frontend-vue](../rule-frontend-vue/SKILL.md)                           | `pix_frontend_vue`              | vue          | Vue 3 best practices aligned with rule-styleguide and rule-frontend-vanilla-reactive. Zero CSS classes (element...                                                                 |

### Platform

Select project platform: web, desktop, library, Expo/mobile.

| Skill                                                    | Tool                   | Frameworks        | Use when                                                                                                                 |
| -------------------------------------------------------- | ---------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [rule-platform](../rule-platform/SKILL.md)                 | `pix_platform`         | all               | Index of all platform/project-type skills: Desktop (Electron), Expo (React Native), Library authoring, and Web platfo... |
| [rule-platform-desktop](../rule-platform-desktop/SKILL.md) | `pix_platform_desktop` | electron, desktop | Desktop application development with rule principles. Project type umbrella for desktop apps. Primary framework: E...     |
| [rule-platform-library](../rule-platform-library/SKILL.md) | `pix_platform_library` | all               | Reusable library/package development with rule principles. Covers pnpm package structure, public API design, TypeS...     |
| [rule-platform-web](../rule-platform-web/SKILL.md)         | `pix_platform_web`     | all               | Web application development with rule principles. Covers browser-based app architecture, bundling, routing, progre...     |

### Process

Write ADRs/docs, follow BMAD, feature workflow, and handoff.

| Skill                                                          | Tool                      | Frameworks | Use when                                                                                                                                  |
| -------------------------------------------------------------- | ------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [rule-process](../rule-process/SKILL.md)                         | `pix_process`             | all        | Index of process skills: ADR, BMAD, code review, documentation, feature workflow, and LLM handoff.                                        |
| [rule-process-ai](../rule-process-ai/SKILL.md)                   | `rule_tool_process_ai`     | all        | Intent to incident, plan before code, gates and review, plus the scope contract, English with American spelling and the prose rules.      |
| [rule-process-adr](../rule-process-adr/SKILL.md)                 | `rule_tool_process_adr`    | all        | Architecture Decision Records (ADR) for rule projects. Capture, store, and manage architectural decisions in docs/...                      |
| [rule-process-bmad](../rule-process-bmad/SKILL.md)               | `pix_process_bmad`        | all        | BMAD Method (Build More Architect Dreams) - AI-driven development framework for structured software delivery through...                   |
| [rule-process-code-review](../rule-process-code-review/SKILL.md) | `pix_process_code_review` | all        | Prepare and conduct risk-based PR/MR reviews with explicit quality, safety, and follow-up gates.                                          |
| [rule-process-readme](../rule-process-readme/SKILL.md)           | `pix_process_readme`      | all        | Write or rewrite a project README: the opening block, the facts, the example, getting started, and the license and contribution sections. |
| `rule_tool_handoff` / `/rule-handoff`                            | `rule_tool_handoff`        | all        | Generate a compressed LLM handoff summary from ADR logs and project context. Enables cross-chat recovery, model-switc...                  |

### Styleguide

Apply HTML/CSS/JS/JSON/Markdown/a11y/naming/validation standards.

| Skill                                                                    | Tool                           | Frameworks | Use when                                                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [rule-styleguide](../rule-styleguide/SKILL.md)                             | `rule_tool_styleguide`          | all        | Central index of all rule coding style guides. Delegates to specialized sub-skills: HTML semantics, CSS architectu...                                  |
| [rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md)                   | `pix_styleguide_a11y`          | all        | WCAG 2.2 AA accessibility: semantic HTML, ARIA, keyboard navigation, color contrast, forms, media, automated testing...                               |
| [rule-styleguide-css](../rule-styleguide-css/SKILL.md)                     | `pix_styleguide_css`           | all        | CSS architecture, selector strategy (data-part, element), naming conventions, property ordering, custom properties, c...                              |
| [rule-styleguide-configuration](../rule-styleguide-configuration/SKILL.md) | `pix_styleguide_configuration` | all        | Base project configuration files: .gitignore, .editorconfig, .nvmrc, .env.example, README, LICENSE, CONTRIBUTING, and the toolchain config baselines. |
| [rule-styleguide-git](../rule-styleguide-git/SKILL.md)                     | `pix_styleguide_git`           | all        | Atomic Conventional Commits with a mandatory scope, branch naming, and the commit-msg and pre-push discipline.                                        |
| [rule-styleguide-html](../rule-styleguide-html/SKILL.md)                   | `pix_styleguide_html`          | all        | Semantic HTML, document structure, template engine syntax, accessibility essentials, and element conventions for fron...                              |
| [rule-styleguide-javascript](../rule-styleguide-javascript/SKILL.md)       | `pix_styleguide_javascript`    | all        | JavaScript conventions: naming, functions, classes, async patterns, DOM manipulation, custom elements, static initial...                              |
| [rule-styleguide-json](../rule-styleguide-json/SKILL.md)                   | `pix_styleguide_json`          | all        | JSON structure conventions: validity, property naming, date formats, numeric precision, schema mindset, and API respo...                              |
| [rule-styleguide-markdown](../rule-styleguide-markdown/SKILL.md)           | `pix_styleguide_markdown`      | all        | Markdown documentation style: document structure, headings, lists, code blocks, formatting, tables, links, and tone f...                              |
| [rule-styleguide-naming](../rule-styleguide-naming/SKILL.md)               | `pix_styleguide_naming`        | all        | Naming conventions and file tree structure: PascalCase, camelCase, UPPER_SNAKE_CASE, underscore prefix rule, barrel p...                              |

### Toolchain

Configure pnpm, TypeScript, ESLint, Biome, Vite, Parcel, Turborepo, Husky.

| Skill                                                          | Tool                      | Frameworks | Use when                                                                                                                 |
| -------------------------------------------------------------- | ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| [rule-toolchain](../rule-toolchain/SKILL.md)                     | `pix_toolchain`           | all        | Index of all toolchain skills: build tools (Vite, Parcel), linters (Biome, ESLint), package management (pnpm), monore... |
| [rule-toolchain-biome](../rule-toolchain-biome/SKILL.md)         | `pix_toolchain_biome`     | all        | Biome linter and formatter configuration and best practices. Zero-config by default, but covers migration from ESLint... |
| [rule-toolchain-eslint](../rule-toolchain-eslint/SKILL.md)       | `pix_toolchain_eslint`    | all        | ESLint 9+ flat config: rule sets for TypeScript, React, and Node.js, plugin integration, custom rules, and CI integra... |
| [rule-toolchain-husky](../rule-toolchain-husky/SKILL.md)         | `pix_toolchain_husky`     | all        | Git hooks management with Husky: commit hooks, pre-push validation, lint-staged integration, commitlint, and CI-frien... |
| [rule-toolchain-parcel](../rule-toolchain-parcel/SKILL.md)       | `pix_toolchain_parcel`    | all        | Parcel 2+ zero-configuration bundler: entry points, transpilation, code splitting, image optimization, environment va... |
| [rule-toolchain-pnpm](../rule-toolchain-pnpm/SKILL.md)           | `pix_toolchain_pnpm`      | all        | pnpm package manager: workspace management, dependency resolution, caching strategies, CI optimization, and monorepo...  |
| [rule-toolchain-turborepo](../rule-toolchain-turborepo/SKILL.md) | `pix_toolchain_turborepo` | all        | Turborepo monorepo orchestration: pipeline configuration, caching, remote caching, task dependency graphs, and worksp... |
| [rule-toolchain-vite](../rule-toolchain-vite/SKILL.md)           | `pix_toolchain_vite`      | all        | Vite build tool configuration and best practices. Covers vite.config.ts, vitest.config.ts, environment variables, bui... |

### UI

Design and route visible interface work while preserving rule implementation constraints.

| Skill                                                    | Tool                   | Frameworks | Use when                                                                                                                     |
| -------------------------------------------------------- | ---------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [rule-ui](../rule-ui/SKILL.md)                             | `pix_ui`               | all        | Umbrella skill for all user-interface work in the rule ecosystem. Use when a task affects visual UI, component composition... |
| [rule-ui-design-system](../rule-ui-design-system/SKILL.md) | `pix_ui_design_system` | all        | Distinctive production-grade UI design direction for rule projects. Use when designing pages, components, dashboards...       |

## Recommended dispatch bundles

| Task                     | Primary                                             | Secondary                                         | Deterministic tools                                   |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Unknown project          | `rule`                                               | `rule-process-adr`                                 | `rule_tool_detect`, `rule_tool_search`                  |
| AI agent app             | `rule-ai` + `rule-platform-agent`                     | `rule-ai-agent-architecture`, `rule-devops-testing` | `rule_tool_check`, `rule_tool_process_adr`              |
| New web UI               | `rule-ui` + `rule-ui-design-system` + framework skill | `rule-styleguide`, `rule-platform-web`              | `rule://templates`, `rule_tool_check`                   |
| React/Vite app           | `rule-frontend-react`                                | `rule-toolchain-vite`, `rule-styleguide`            | `rule_tool_styleguide` (scaffold), `rule_tool_check`    |
| Backend API              | `rule-backend-node`                                  | `rule-backend-security`                            | `rule_tool_check`, `rule_tool_process_adr`              |
| Database work            | database skill                                      | `rule-data`                                        | `rule_tool_search`, `rule_tool_check`                   |
| Docker/CI/tests          | `rule-devops` focused skill                          | platform skill                                    | `rule_tool_detect`, `/rule-area-styleguide` (file-tree) |
| GraphQL API              | `rule-backend-graphql`                               | runtime skill, `rule-backend-security`             | `rule_tool_search`, `rule_tool_check`                   |
| Production observability | `rule-devops-observability`                          | runtime and platform skill                        | `rule_tool_check`, `rule_tool_process_adr`              |
| Code review              | `rule-process-code-review`                           | feature workflow, relevant domain skill           | `rule_tool_check`                                      |
| Commit/push              | `rule-styleguide-git`                                | `rule-toolchain-husky`                             | `rule_tool_check`                                      |
| Docs/ADR                 | `rule-styleguide-markdown`                           | `rule-process-adr`                                 | `rule_tool_process_adr`, `rule_tool_handoff`            |
| File-tree cleanup        | `rule-styleguide-naming`                             | `rule-styleguide-configuration`                    | `/rule-area-styleguide` (file-tree), `rule_tool_check`  |

## Operational sequence

1. Call `rule_tool_detect` when a project path is available.
2. Call `rule` with the user prompt and optional framework hint.
3. Read the primary skill in `mode=tldr` or `mode=search` before `mode=full`.
4. Generate deterministic artifacts with the `rule://templates` resource or `rule_tool_styleguide mode=scaffold`.
5. Validate with `rule_tool_check`; pass `previousPassed` on subsequent iterations.
6. Record major decisions with `rule_tool_process_adr`.
7. Use `/rule-area-styleguide` with file-tree in the request (or `rule_tool_styleguide_file_tree`) for file-tree convention fixes and `rule_tool_handoff` before context switches.

## Conventions (rules -> skills merge)

# rule AI Skills - Common

You are an AI coding assistant operating inside a rule repository. Follow every rule below without exception. When a rule references a detailed specification, read the corresponding file under `rules` or `skills` before proceeding.

## MCP server

This rule system is also available as an MCP server (`rule-mcp-rules`). If you have access to it, prefer calling `get_skill` and `get_rule` directly instead of reading files from disk. Load only the specific rule/skill needed for the current task.

## Identity

- You work on rule projects
- You never create a LICENSE file
- You never create `.github` directories or GitHub Actions workflows

## Skills to load, and when

Load `rule` first: it is the index. Pull in the domain skill only when the task
touches that domain:

| Skill                       | When to load                                                      |
| --------------------------- | ----------------------------------------------------------------- |
| `rule-styleguide-git`        | **Immediately** - before any branch, commit, or push              |
| `rule-styleguide-markdown`   | **Immediately** - when writing or updating README and prose files |
| `rule-styleguide-typescript` | **Immediately** - when writing TypeScript types and interfaces    |
| `rule-devops-testing`        | When creating tests or configuring coverage                       |
| `rule-styleguide-a11y`       | **Frontend only** - when accessibility is part of the requirement |
| `rule-styleguide-i18n`       | **Frontend only** - when internationalization is needed           |
| `rule-backend-security`      | **Backend only** - when the service must be hardened              |

### What each one covers

- **`rule-styleguide-git`** - Branch naming prefixes (`feat/`, `fix/`, `refactor/`), Conventional
  Commits with mandatory scope, merge-request conventions
- **`rule-styleguide-markdown`** - One `#` title, an intro naming the audience, ordered headings,
  descriptive relative links, no repetition
- **`rule-styleguide-typescript`** - Enum patterns (`as const` over enums), no `any`, `readonly`,
  `satisfies`, discriminated unions, and the compiler configuration in `COMPILER.md`
- **`rule-devops-testing`** - Test structure, Vitest configuration, and the coverage floor
- **`rule-styleguide-a11y`** - WCAG 2.1 AA, semantic HTML, ARIA, the European Accessibility Act
- **`rule-styleguide-i18n`** - Translation keys, pluralization, RTL, `Intl.*` APIs
- **`rule-backend-security`** - OAuth 2.0, JWT validation, rate limiting, CORS, HTTPS hardening

## When scaffolding a new repository

Start from the matching scaffold and follow it end to end:

- Backend API or service: `rule-backend-node`
- Frontend: the framework skill (`rule-frontend-*`) plus `rule-styleguide`
- AI agent project: `rule-ai` with `rule-platform-agent`
- Testing configuration lands with `rule-devops-testing`

## See also

- [rule-styleguide](../rule-styleguide/SKILL.md) - Shared coding standards
- [rule-toolchain](../rule-toolchain/SKILL.md) - Toolchain index
