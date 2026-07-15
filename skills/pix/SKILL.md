---
name: pix
description: >-
  Use when routing any coding request to the correct pix skill. Acts as the central dispatcher for all skill and tool selection.
tags:
  - index
  - dispatcher
  - orchestrator
  - router
  - taxonomy
  - tools
frameworks: [all]
---

# pix — Skill and tool dispatcher

`pix` is the canonical entry point for the full pix ecosystem. It routes user intent to the smallest set of specialized skills and MCP tools needed to complete the task without duplicating context.

## Dispatch contract

1. Classify the task by domain, framework, platform, toolchain, and lifecycle phase.
2. Select one primary skill; add secondary skills only for real cross-cutting concerns.
3. Prefer MCP tools for deterministic work: detection, search, templates, guardrails, scaffolding, ADRs, fixes, and handoff.
4. Keep context portable for all LLMs: use exact skill names, exact tool names, and linked references.
5. For UI code, always include `pix-styleguide` plus the framework/platform skill.
6. For implementation work, include `pix-devops-testing` and the relevant process skill.

## Mandatory anti-hallucination workflow

1. Treat routed skill text and deterministic MCP output as source of truth.
2. Never invent tools, skills, APIs, files, dependencies, requirements, or successful checks.
3. Missing evidence means unknown: call `pix_search` or state uncertainty.
4. Server preprocessing rejects blank, unsafe, oversized, deeply nested, or malformed tool input before execution.
5. Server postprocessing validates result shape and verifies router skill/tool names before output reaches model.
6. Every successful tool result carries `_meta.pixEnforcement` plus visible `PIX ENFORCEMENT CONTRACT`.
7. Generated code must pass `pix_check`; failures are blocking tool errors. Fix and rerun until all pass.
8. Report only tests/typechecks actually executed and their real output.

## Fast routing tree

```text
Prompt
  ├─ unsure / broad / multi-domain      → pix + pix_search
  ├─ architecture / SDD / plan          → pix-architect
  ├─ UI / component / page              → pix-frontend + framework skill + pix-styleguide
  ├─ meta-framework                     → pix-frontend-meta-* + base framework skill
  ├─ backend / API / security           → pix-backend + framework/security/API skill
  ├─ database / persistence             → pix-data + database skill
  ├─ Docker / CI / tests / release      → pix-devops + focused DevOps skill
  ├─ web / desktop / library / mobile   → pix-platform + platform skill
  ├─ docs / ADR / handoff / workflow    → pix-process + process tool
  ├─ lint/build/package config          → pix-toolchain + focused toolchain skill
  └─ concrete component/test template   → pix_component
```

## MCP tools

| Tool | Role | Use when |
|------|------|----------|
| `pix` | Router | Route a prompt to the correct pix skill. Returns structured routing with relevant sections. |
| `pix_search` | Search | Semantic search across ALL pix skills using BM25 ranking. Returns scored, relevant sections. |
| `pix_check` | Guardrails | Run blocking guardrail checks against any pix skill. Pass `previousPassed` while iterating; finalize only when all checks pass. |
| `pix_scaffold` | Scaffold | Generate project scaffolding files. Returns one or all config file templates. |
| `pix_detect` | Detection | Detect project framework, TypeScript usage, and build tool from package.json. |
| `pix_process_adr` | ADR | Save an Architecture Decision Record (ADR) to docs/adr/. Auto-numbers, maintains index, uses Nygard template. |
| `pix_fix` | Auto-fix | Validate and auto-fix project file tree structure against pix conventions (barrel files, _PascalCase naming, etc.). |
| `pix_process_handoff` | Handoff | Generate a compressed LLM handoff summary from ADR logs and project context. Paste the output into a new chat to resume work seamlessly. |
| `pix_component` | Templates | Generate component or test templates following pix principles. |

### Skill tool naming

Every regular skill is also exposed as `pix_` + skill name without `pix-` + hyphens converted to underscores. Example: `pix-frontend-react` → `pix_frontend_react`. Some process skills use dedicated action tools instead of generic skill tools: `pix-process-adr` → `pix_process_adr`, `pix-process-handoff` → `pix_process_handoff`.

## Complete skill inventory
### AI

Build AI agent repositories, providers, tools, registries, and tests.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-platform-agent](../pix-platform-agent/SKILL.md) | `pix_platform_agent` | node, agents | Scaffold and maintain AI Agent projects. Covers structure, tools, env config, testing, and containerization without prescribing any specific core library. |

### Architecture

Plan architecture, SDD, context, and scaffolding flow.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-architect](../pix-architect/SKILL.md) | `pix_architect` | all | Enterprise project architecture wizard. Guides through technology choices, scaffolding, standards, and documentation... |

### Backend

Design and implement APIs, runtime frameworks, security, and scaffolds.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-backend](../pix-backend/SKILL.md) | `pix_backend` | all | Backend application development umbrella — index of all backend skills. Routes to specific framework, database, and d... |
| [pix-backend-api-design](../pix-backend-api-design/SKILL.md) | `pix_backend_api_design` | node, api | Design REST APIs for pix backend services. Use when defining endpoints, HTTP methods, versioning, request/respons... |
| [pix-backend-express](../pix-backend-express/SKILL.md) | `pix_backend_express` | all | Express.js 5+ best practices: middleware patterns, error handling, routing, performance optimization, security header... |
| [pix-backend-fastify](../pix-backend-fastify/SKILL.md) | `pix_backend_fastify` | all | Fastify 5+ best practices: plugins, hooks, schema validation, serialization, lifecycle, logging, and performance tuni... |
| [pix-backend-hono](../pix-backend-hono/SKILL.md) | `pix_backend_hono` | all | Hono 4+ best practices: edge-compatible API framework, middleware patterns, RPC-style type sharing, Zod validation, a... |
| [pix-backend-nestjs](../pix-backend-nestjs/SKILL.md) | `pix_backend_nestjs` | all | NestJS 10+ best practices: modular architecture, decorators, dependency injection, guards, interceptors, pipes, Graph... |
| [pix-backend-node](../pix-backend-node/SKILL.md) | `pix_backend_node` | node, api | Scaffold a new pix backend-node repository. Use when creating Express + TypeScript backend structure, baseline co... |
| [pix-backend-security](../pix-backend-security/SKILL.md) | `pix_backend_security` | node, api | Apply security best practices to pix repositories. Use when handling environment variables, secrets, Docker secur... |

### Data

Model persistence, SQL, PostgreSQL, MySQL, and MongoDB.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-data](../pix-data/SKILL.md) | `pix_data` | all | Index of all data/database skills: SQL fundamentals, PostgreSQL, MySQL, and MongoDB. Delegates to the specific databa... |
| [pix-data-mongodb](../pix-data-mongodb/SKILL.md) | `pix_data_mongodb` | all | MongoDB 7+ complete reference: schema design patterns, CRUD scripts, aggregation pipeline, indexing strategies, shard... |
| [pix-data-mysql](../pix-data-mysql/SKILL.md) | `pix_data_mysql` | all | MySQL 8+ / MariaDB 11+ complete reference: DDL scripts, InnoDB tuning, indexing strategies, replication (async/semi-s... |
| [pix-data-postgresql](../pix-data-postgresql/SKILL.md) | `pix_data_postgresql` | all | PostgreSQL 16+ complete reference: DDL scripts, indexing strategies, performance tuning, replication, partitioning, c... |
| [pix-data-sql](../pix-data-sql/SKILL.md) | `pix_data_sql` | all | Complete SQL reference: table design patterns, index optimization, DDL scripts (CREATE/ALTER/DROP), query writing sta... |

### DevOps

Configure Docker, CI, tests, coverage, and version automation.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-devops](../pix-devops/SKILL.md) | `pix_devops` | all | Index of all DevOps and engineering skills: Docker, GitLab CI, testing, and version management. Delegates to the spec... |
| [pix-devops-docker](../pix-devops-docker/SKILL.md) | `pix_devops_docker` | all | Create and maintain Docker configuration for pix repositories. Use when generating Dockerfiles, docker-compose.ym... |
| [pix-devops-gitlab-ci](../pix-devops-gitlab-ci/SKILL.md) | `pix_devops_gitlab_ci` | all | Create and maintain GitLab CI pipelines for pix repositories. Use when generating .gitlab-ci.yml, configuring cac... |
| [pix-devops-testing](../pix-devops-testing/SKILL.md) | `pix_devops_testing` | all | Write and maintain tests for pix repositories using Vitest. Use when creating unit or integration tests, configur... |
| [pix-devops-version](../pix-devops-version/SKILL.md) | `pix_devops_version` | all | Set up automatic version increment on every commit using Husky pre-commit hooks. Use when configuring version managem... |

### Dispatcher

Route ambiguous or multi-domain prompts.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix](../pix/SKILL.md) | `pix` | all | Central dispatcher for every pix skill and MCP tool. Use first when the task is ambiguous, multi-domain, or needs... |

### Frontend

Build UI, components, routing, forms, and meta-framework apps.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-frontend](../pix-frontend/SKILL.md) | `pix_frontend` | all | Index of all frontend UI framework skills: React, Vue, Angular, Svelte, SolidJS, Astro, Vanilla Reactive. Includes me... |
| [pix-frontend-angular](../pix-frontend-angular/SKILL.md) | `pix_frontend_angular` | angular | Angular best practices aligned with pix-styleguide and pix-frontend-vanilla-reactive. Zero CSS classes (eleme... |
| [pix-frontend-astro](../pix-frontend-astro/SKILL.md) | `pix_frontend_astro` | astro | Astro best practices aligned with pix-styleguide and pix-frontend-vanilla-reactive. Zero CSS classes, zero in... |
| [pix-frontend-meta-next](../pix-frontend-meta-next/SKILL.md) | `pix_frontend_meta_next` | next, react | Next.js application development with pix principles. Covers App Router, Server Components, SSR/SSG/ISR, API route... |
| [pix-frontend-meta-nuxt](../pix-frontend-meta-nuxt/SKILL.md) | `pix_frontend_meta_nuxt` | nuxt, vue | Nuxt.js application development with pix principles. Covers file-based routing, SSR/SSG, server routes, auto-impo... |
| [pix-frontend-meta-remix](../pix-frontend-meta-remix/SKILL.md) | `pix_frontend_meta_remix` | remix, react | Remix / React Router application development with pix principles. Covers nested routing, loaders/actions, SSR, pr... |
| [pix-frontend-react](../pix-frontend-react/SKILL.md) | `pix_frontend_react` | react | React best practices aligned with pix-styleguide and pix-frontend-vanilla-reactive. Zero CSS classes (element... |
| [pix-frontend-solidjs](../pix-frontend-solidjs/SKILL.md) | `pix_frontend_solidjs` | solidjs | SolidJS best practices aligned with pix-styleguide and pix-frontend-vanilla-reactive. Zero CSS classes (eleme... |
| [pix-frontend-svelte](../pix-frontend-svelte/SKILL.md) | `pix_frontend_svelte` | svelte | Svelte 5 / SvelteKit best practices aligned with pix-styleguide and pix-frontend-vanilla-reactive. Zero CSS c... |
| [pix-frontend-vanilla-reactive](../pix-frontend-vanilla-reactive/SKILL.md) | `pix_frontend_vanilla_reactive` | vanilla | Vanilla JS reactive pattern: Proxy-based Store, Signals (State/Computed), microtask-scheduled effects, template engin... |
| [pix-frontend-vue](../pix-frontend-vue/SKILL.md) | `pix_frontend_vue` | vue | Vue 3 best practices aligned with pix-styleguide and pix-frontend-vanilla-reactive. Zero CSS classes (element... |

### Platform

Select project platform: web, desktop, library, Expo/mobile.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-platform](../pix-platform/SKILL.md) | `pix_platform` | all | Index of all platform/project-type skills: Desktop (Electron), Expo (React Native), Library authoring, and Web platfo... |
| [pix-platform-desktop](../pix-platform-desktop/SKILL.md) | `pix_platform_desktop` | electron, desktop | Desktop application development with pix principles. Project type umbrella for desktop apps. Primary framework: E... |
| [pix-platform-expo](../pix-platform-expo/SKILL.md) | `pix_platform_expo` | expo, react-native | Configure and manage EAS Build profiles, EAS Secrets, OTA updates, and tag-driven GitLab CI/CD pipelines for Expo pro... |
| [pix-platform-library](../pix-platform-library/SKILL.md) | `pix_platform_library` | all | Reusable library/package development with pix principles. Covers pnpm package structure, public API design, TypeS... |
| [pix-platform-web](../pix-platform-web/SKILL.md) | `pix_platform_web` | all | Web application development with pix principles. Covers browser-based app architecture, bundling, routing, progre... |

### Process

Write ADRs/docs, follow BMAD, feature workflow, and handoff.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-process](../pix-process/SKILL.md) | `pix_process` | all | Index of all process and methodology skills: ADR, BMAD Method, documentation, feature workflow, and handoff for LLM s... |
| [pix-process-adr](../pix-process-adr/SKILL.md) | `pix_process_adr` | all | Architecture Decision Records (ADR) for pix projects. Capture, store, and manage architectural decisions in docs/... |
| [pix-process-bmad](../pix-process-bmad/SKILL.md) | `pix_process_bmad` | all | BMAD Method (Build More Architect Dreams) — AI-driven development framework for structured software delivery through... |
| [pix-process-documentation](../pix-process-documentation/SKILL.md) | `pix_process_documentation` | all | Set up and maintain Mintlify documentation for pix repositories. Use when creating the docs/ directory, configuri... |
| [pix-process-feature-workflow](../pix-process-feature-workflow/SKILL.md) | `pix_process_feature_workflow` | all | End-to-end procedure for adding a new feature to any pix repository. Use when implementing a feature in a backend... |
| [pix-process-handoff](../pix-process-handoff/SKILL.md) | `pix_process_handoff` | all | Generate a compressed LLM handoff summary from ADR logs and project context. Enables cross-chat recovery, model-switc... |

### Styleguide

Apply HTML/CSS/JS/JSON/Markdown/a11y/naming/validation standards.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-styleguide](../pix-styleguide/SKILL.md) | `pix_styleguide` | all | Central index of all pix coding style guides. Delegates to specialized sub-skills: HTML semantics, CSS architectu... |
| [pix-styleguide-a11y](../pix-styleguide-a11y/SKILL.md) | `pix_styleguide_a11y` | all | WCAG 2.2 AA accessibility: semantic HTML, ARIA, keyboard navigation, color contrast, forms, media, automated testing... |
| [pix-styleguide-css](../pix-styleguide-css/SKILL.md) | `pix_styleguide_css` | all | CSS architecture, selector strategy (data-part, element), naming conventions, property ordering, custom properties, c... |
| [pix-styleguide-html](../pix-styleguide-html/SKILL.md) | `pix_styleguide_html` | all | Semantic HTML, document structure, template engine syntax, accessibility essentials, and element conventions for fron... |
| [pix-styleguide-javascript](../pix-styleguide-javascript/SKILL.md) | `pix_styleguide_javascript` | all | JavaScript conventions: naming, functions, classes, async patterns, DOM manipulation, custom elements, static initial... |
| [pix-styleguide-json](../pix-styleguide-json/SKILL.md) | `pix_styleguide_json` | all | JSON structure conventions: validity, property naming, date formats, numeric precision, schema mindset, and API respo... |
| [pix-styleguide-markdown](../pix-styleguide-markdown/SKILL.md) | `pix_styleguide_markdown` | all | Markdown documentation style: document structure, headings, lists, code blocks, formatting, tables, links, and tone f... |
| [pix-styleguide-naming](../pix-styleguide-naming/SKILL.md) | `pix_styleguide_naming` | all | Naming conventions and file tree structure: PascalCase, camelCase, UPPER_SNAKE_CASE, underscore prefix rule, barrel p... |
| [pix-styleguide-patterns](../pix-styleguide-patterns/SKILL.md) | `pix_styleguide_patterns` | all | Quick reference cheat sheet for naming conventions, property ordering, file tree structure, and common patterns. Cond... |
| [pix-styleguide-validation](../pix-styleguide-validation/SKILL.md) | `pix_styleguide_validation` | all | Cross-border business validation patterns: email, phone, VAT, tax IDs, postal codes, national identification numbers,... |

### Toolchain

Configure pnpm, TypeScript, ESLint, Biome, Vite, Parcel, Turborepo, Husky.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-toolchain](../pix-toolchain/SKILL.md) | `pix_toolchain` | all | Index of all toolchain skills: build tools (Vite, Parcel), linters (Biome, ESLint), package management (pnpm), monore... |
| [pix-toolchain-biome](../pix-toolchain-biome/SKILL.md) | `pix_toolchain_biome` | all | Biome linter and formatter configuration and best practices. Zero-config by default, but covers migration from ESLint... |
| [pix-toolchain-eslint](../pix-toolchain-eslint/SKILL.md) | `pix_toolchain_eslint` | all | ESLint 9+ flat config: rule sets for TypeScript, React, and Node.js, plugin integration, custom rules, and CI integra... |
| [pix-toolchain-husky](../pix-toolchain-husky/SKILL.md) | `pix_toolchain_husky` | all | Git hooks management with Husky: commit hooks, pre-push validation, lint-staged integration, commitlint, and CI-frien... |
| [pix-toolchain-parcel](../pix-toolchain-parcel/SKILL.md) | `pix_toolchain_parcel` | all | Parcel 2+ zero-configuration bundler: entry points, transpilation, code splitting, image optimization, environment va... |
| [pix-toolchain-pnpm](../pix-toolchain-pnpm/SKILL.md) | `pix_toolchain_pnpm` | all | pnpm package manager: workspace management, dependency resolution, caching strategies, CI optimization, and monorepo... |
| [pix-toolchain-project](../pix-toolchain-project/SKILL.md) | `pix_toolchain_project` | all | Base project configuration files and conventions. Covers .gitignore, .editorconfig, .nvmrc, .env.example, and reposit... |
| [pix-toolchain-turborepo](../pix-toolchain-turborepo/SKILL.md) | `pix_toolchain_turborepo` | all | Turborepo monorepo orchestration: pipeline configuration, caching, remote caching, task dependency graphs, and worksp... |
| [pix-toolchain-typescript](../pix-toolchain-typescript/SKILL.md) | `pix_toolchain_typescript` | all | TypeScript compiler configuration, tsconfig management, strict mode setups, path aliases, declaration files, and buil... |
| [pix-toolchain-vite](../pix-toolchain-vite/SKILL.md) | `pix_toolchain_vite` | all | Vite build tool configuration and best practices. Covers vite.config.ts, vitest.config.ts, environment variables, bui... |
### UI

Design and route visible interface work while preserving pix implementation constraints.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-ui](../pix-ui/SKILL.md) | `pix_ui` | all | Umbrella skill for all user-interface work in the pix ecosystem. Use when a task affects visual UI, component composition... |
| [pix-ui-design-system](../pix-ui-design-system/SKILL.md) | `pix_ui_design_system` | all | Distinctive production-grade UI design direction for pix projects. Use when designing pages, components, dashboards... |

## Recommended dispatch bundles

| Task | Primary | Secondary | Deterministic tools |
|------|---------|-----------|---------------------|
| Unknown project | `pix` | `pix-architect` | `pix_detect`, `pix_search` |
| New web UI | `pix-ui` + `pix-ui-design-system` + framework skill | `pix-styleguide`, `pix-platform-web` | `pix_component`, `pix_check` |
| React/Vite app | `pix-frontend-react` | `pix-toolchain-vite`, `pix-styleguide` | `pix_scaffold`, `pix_check` |
| Backend API | `pix-backend-api-design` | runtime skill, `pix-backend-security` | `pix_check`, `pix_process_adr` |
| Database work | database skill | `pix-backend-api-design` | `pix_search`, `pix_check` |
| Docker/CI/tests | `pix-devops` focused skill | platform skill | `pix_scaffold`, `pix_fix` |
| Docs/ADR | `pix-process-documentation` | `pix-process-adr` | `pix_process_adr`, `pix_process_handoff` |
| File-tree cleanup | `pix-styleguide-naming` | `pix-toolchain-project` | `pix_fix`, `pix_check` |

## Operational sequence

1. Call `pix_detect` when a project path is available.
2. Call `pix` with the user prompt and optional framework hint.
3. Read the primary skill in `mode=tldr` or `mode=search` before `mode=full`.
4. Generate deterministic artifacts with `pix_component` or `pix_scaffold`.
5. Validate with `pix_check`; pass `previousPassed` on subsequent iterations.
6. Record major decisions with `pix_process_adr`.
7. Use `pix_fix` for file-tree convention fixes and `pix_process_handoff` before context switches.

## See also

- [pix-architect](../pix-architect/SKILL.md) — Architecture wizard and SDD workflow
- [pix-styleguide](../pix-styleguide/SKILL.md) — Shared coding standards
- [pix-process-feature-workflow](../pix-process-feature-workflow/SKILL.md) — Feature delivery workflow
- [pix-toolchain](../pix-toolchain/SKILL.md) — Toolchain index
