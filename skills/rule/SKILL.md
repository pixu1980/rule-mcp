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
3. Missing evidence means unknown: call `pix_search` or state uncertainty.
4. Server preprocessing rejects blank, unsafe, oversized, deeply nested, or malformed tool input before execution.
5. Server postprocessing validates result shape and verifies router skill/tool names before output reaches model.
6. Every successful tool result carries `_meta.pixEnforcement` plus visible `PIX ENFORCEMENT CONTRACT`.
7. Generated code must pass `pix_check`; failures are blocking tool errors. Fix and rerun until all pass.
8. Report only tests/typechecks actually executed and their real output.

## Fast routing tree

```text
Prompt
  ├─ unsure / broad / multi-domain      → rule + pix_search
  ├─ architecture / SDD / plan          → rule-process-adr + rule-mcp-architect (web app)
  ├─ UI / component / page              → rule-frontend + framework skill + rule-styleguide
  ├─ meta-framework                     → rule-frontend-meta-* + base framework skill
  ├─ AI / agent / LLM application       → rule-ai + focused AI skill
  ├─ backend / REST / GraphQL / security → rule-backend + framework/security/API skill
  ├─ database / persistence             → rule-data + database skill
  ├─ Docker / CI / tests / observability / release → rule-devops + focused DevOps skill
  ├─ web / desktop / library / mobile   → rule-platform + platform skill
  ├─ docs / ADR / review / handoff / workflow → rule-process + process tool
  ├─ lint/build/package config          → rule-toolchain + focused toolchain skill
  ├─ commit / push / git discipline     → rule-toolchain-commits
  └─ concrete component/test template   → pix_component
```

## MCP tools

| Tool                  | Role       | Use when                                                                                                                                 |
| --------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `rule`                 | Router     | Route a prompt to the correct rule skill. Returns structured routing with relevant sections.                                              |
| `pix_search`          | Search     | Semantic search across ALL rule skills using BM25 ranking. Returns scored, relevant sections.                                             |
| `pix_check`           | Guardrails | Run blocking guardrail checks against any rule skill. Pass `previousPassed` while iterating; finalize only when all checks pass.          |
| `pix_scaffold`        | Scaffold   | Generate project scaffolding files. Returns one or all config file templates.                                                            |
| `pix_detect`          | Detection  | Detect project framework, TypeScript usage, and build tool from package.json.                                                            |
| `pix_process_adr`     | ADR        | Save an Architecture Decision Record (ADR) to docs/adr/. Auto-numbers, maintains index, uses Nygard template.                            |
| `pix_fix`             | Auto-fix   | Validate and auto-fix project file tree structure against rule conventions (barrel files, _PascalCase naming, etc.).                      |
| `pix_process_handoff` | Handoff    | Generate a compressed LLM handoff summary from ADR logs and project context. Paste the output into a new chat to resume work seamlessly. |
| `pix_component`       | Templates  | Generate component or test templates following rule principles.                                                                           |

### Skill tool naming

Every regular skill is also exposed as `pix_` + skill name without `rule-` + hyphens converted to underscores. Example: `rule-frontend-react` → `pix_frontend_react`. Some process skills use dedicated action tools instead of generic skill tools: `rule-process-adr` → `pix_process_adr`, `rule-process-handoff` → `pix_process_handoff`.

## Complete skill inventory

### AI

Build AI agent repositories, providers, tools, registries, and tests.

| Skill                                                | Tool                 | Frameworks   | Use when                                                                                                                                                   |
| ---------------------------------------------------- | -------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [rule-ai](../rule-ai/SKILL.md)                         | `pix_ai`             | all          | Index of all AI/agent skills: agent scaffolding on `@rule/rule-mcp-core` and framework-agnostic agent guidance.                                           |
| [rule-ai-agents](../rule-ai-agents/SKILL.md)           | `pix_ai_agents`      | node, agents | Scaffold AI agent applications built on `@rule/rule-mcp-core`, including providers, tools, testing, and containerization.                                 |
| [rule-platform-agent](../rule-platform-agent/SKILL.md) | `pix_platform_agent` | node, agents | Scaffold and maintain AI Agent projects. Covers structure, tools, env config, testing, and containerization without prescribing any specific core library. |

### Architecture

Plan architecture, SDD, context, and scaffolding flow.

| Skill | Tool | Frameworks | Use when |
| ----- | ---- | ---------- | -------- |

### Backend

Design and implement APIs, runtime frameworks, security, and scaffolds.

| Skill                                                        | Tool                     | Frameworks         | Use when                                                                                                                 |
| ------------------------------------------------------------ | ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| [rule-backend](../rule-backend/SKILL.md)                       | `pix_backend`            | all                | Backend application development umbrella - routes REST, GraphQL, runtime, security, and database work to focused skills. |
| [rule-backend-api-design](../rule-backend-api-design/SKILL.md) | `pix_backend_api_design` | node, api          | Design REST APIs for rule backend services. Use when defining endpoints, HTTP methods, versioning, request/respons...     |
| [rule-backend-express](../rule-backend-express/SKILL.md)       | `pix_backend_express`    | all                | Express.js 5+ best practices: middleware patterns, error handling, routing, performance optimization, security header... |
| [rule-backend-fastify](../rule-backend-fastify/SKILL.md)       | `pix_backend_fastify`    | all                | Fastify 5+ best practices: plugins, hooks, schema validation, serialization, lifecycle, logging, and performance tuni... |
| [rule-backend-graphql](../rule-backend-graphql/SKILL.md)       | `pix_backend_graphql`    | node, api, graphql | GraphQL API engineering: schema-first contracts, resolver boundaries, N+1 prevention, caching, and abuse controls.       |
| [rule-backend-hono](../rule-backend-hono/SKILL.md)             | `pix_backend_hono`       | all                | Hono 4+ best practices: edge-compatible API framework, middleware patterns, RPC-style type sharing, Zod validation, a... |
| [rule-backend-nestjs](../rule-backend-nestjs/SKILL.md)         | `pix_backend_nestjs`     | all                | NestJS 10+ best practices: modular architecture, decorators, dependency injection, guards, interceptors, pipes, Graph... |
| [rule-backend-node](../rule-backend-node/SKILL.md)             | `pix_backend_node`       | node, api          | Scaffold a new rule backend-node repository. Use when creating Express + TypeScript backend structure, baseline co...     |
| [rule-backend-security](../rule-backend-security/SKILL.md)     | `pix_backend_security`   | node, api          | Apply security best practices to rule repositories. Use when handling environment variables, secrets, Docker secur...     |

### Data

Model persistence, SQL, PostgreSQL, MySQL, and MongoDB.

| Skill                                                  | Tool                  | Frameworks | Use when                                                                                                                 |
| ------------------------------------------------------ | --------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| [rule-data](../rule-data/SKILL.md)                       | `pix_data`            | all        | Index of all data/database skills: SQL fundamentals, PostgreSQL, MySQL, and MongoDB. Delegates to the specific databa... |
| [rule-data-mongodb](../rule-data-mongodb/SKILL.md)       | `pix_data_mongodb`    | all        | MongoDB 7+ complete reference: schema design patterns, CRUD scripts, aggregation pipeline, indexing strategies, shard... |
| [rule-data-mysql](../rule-data-mysql/SKILL.md)           | `pix_data_mysql`      | all        | MySQL 8+ / MariaDB 11+ complete reference: DDL scripts, InnoDB tuning, indexing strategies, replication (async/semi-s... |
| [rule-data-postgresql](../rule-data-postgresql/SKILL.md) | `pix_data_postgresql` | all        | PostgreSQL 16+ complete reference: DDL scripts, indexing strategies, performance tuning, replication, partitioning, c... |
| [rule-data-sql](../rule-data-sql/SKILL.md)               | `pix_data_sql`        | all        | Complete SQL reference: table design patterns, index optimization, DDL scripts (CREATE/ALTER/DROP), query writing sta... |

### DevOps

Configure Docker, CI, tests, coverage, and version automation.

| Skill                                                            | Tool                       | Frameworks | Use when                                                                                                                 |
| ---------------------------------------------------------------- | -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| [rule-devops](../rule-devops/SKILL.md)                             | `pix_devops`               | all        | Index of DevOps and engineering skills: Docker, GitLab CI, observability, testing, and version management.               |
| [rule-devops-docker](../rule-devops-docker/SKILL.md)               | `pix_devops_docker`        | all        | Create and maintain Docker configuration for rule repositories. Use when generating Dockerfiles, docker-compose.ym...     |
| [rule-devops-gitlab-ci](../rule-devops-gitlab-ci/SKILL.md)         | `pix_devops_gitlab_ci`     | all        | Create and maintain GitLab CI pipelines for rule repositories. Use when generating .gitlab-ci.yml, configuring cac...     |
| [rule-devops-observability](../rule-devops-observability/SKILL.md) | `pix_devops_observability` | all        | Define production observability: SLOs, telemetry, alerts, incident learning, and rollback verification.                  |
| [rule-devops-testing](../rule-devops-testing/SKILL.md)             | `pix_devops_testing`       | all        | Write and maintain tests for rule repositories using Vitest. Use when creating unit or integration tests, configur...     |
| [rule-devops-version](../rule-devops-version/SKILL.md)             | `pix_devops_version`       | all        | Set up automatic version increment on every commit using Husky pre-commit hooks. Use when configuring version managem... |

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
| [rule-frontend-astro](../rule-frontend-astro/SKILL.md)                       | `pix_frontend_astro`            | astro        | Astro best practices aligned with rule-styleguide and rule-frontend-vanilla-reactive. Zero CSS classes, zero in...                                                                 |
| [rule-frontend-meta-next](../rule-frontend-meta-next/SKILL.md)               | `pix_frontend_meta_next`        | next, react  | Next.js application development with rule principles. Covers App Router, Server Components, SSR/SSG/ISR, API route...                                                             |
| [rule-frontend-meta-nuxt](../rule-frontend-meta-nuxt/SKILL.md)               | `pix_frontend_meta_nuxt`        | nuxt, vue    | Nuxt.js application development with rule principles. Covers file-based routing, SSR/SSG, server routes, auto-impo...                                                             |
| [rule-frontend-meta-remix](../rule-frontend-meta-remix/SKILL.md)             | `pix_frontend_meta_remix`       | remix, react | Remix / React Router application development with rule principles. Covers nested routing, loaders/actions, SSR, pr...                                                             |
| [rule-frontend-react](../rule-frontend-react/SKILL.md)                       | `pix_frontend_react`            | react        | React best practices aligned with rule-styleguide and rule-frontend-vanilla-reactive. Zero CSS classes (element...                                                                 |
| [rule-frontend-solidjs](../rule-frontend-solidjs/SKILL.md)                   | `pix_frontend_solidjs`          | solidjs      | SolidJS best practices aligned with rule-styleguide and rule-frontend-vanilla-reactive. Zero CSS classes (eleme...                                                                 |
| [rule-frontend-custom-element](../rule-frontend-custom-element/SKILL.md)     | `pix_frontend_custom_element`   | vanilla      | Zero-dependency Custom Elements v1 (autonomous and customized built-ins): metadata-driven componentDecorator, adoptedStyleSheets, code-splitting, CLI scaffolder.                |
| [rule-frontend-template-engine](../rule-frontend-template-engine/SKILL.md)   | `pix_frontend_template_engine`  | vanilla      | File-based HTML template engine for static HTML, SSG, SSR: extends/include/block inheritance, if/for/switch directives, filter pipelines, tagged literals, browser-safe runtime. |
| [rule-frontend-svelte](../rule-frontend-svelte/SKILL.md)                     | `pix_frontend_svelte`           | svelte       | Svelte 5 / SvelteKit best practices aligned with rule-styleguide and rule-frontend-vanilla-reactive. Zero CSS c...                                                                 |
| [rule-frontend-vanilla-reactive](../rule-frontend-vanilla-reactive/SKILL.md) | `pix_frontend_vanilla_reactive` | vanilla      | Vanilla JS reactive pattern: Proxy-based Store, Signals (State/Computed), microtask-scheduled effects, template engin...                                                         |
| [rule-frontend-vue](../rule-frontend-vue/SKILL.md)                           | `pix_frontend_vue`              | vue          | Vue 3 best practices aligned with rule-styleguide and rule-frontend-vanilla-reactive. Zero CSS classes (element...                                                                 |

### Platform

Select project platform: web, desktop, library, Expo/mobile.

| Skill                                                    | Tool                   | Frameworks         | Use when                                                                                                                 |
| -------------------------------------------------------- | ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| [rule-platform](../rule-platform/SKILL.md)                 | `pix_platform`         | all                | Index of all platform/project-type skills: Desktop (Electron), Expo (React Native), Library authoring, and Web platfo... |
| [rule-platform-desktop](../rule-platform-desktop/SKILL.md) | `pix_platform_desktop` | electron, desktop  | Desktop application development with rule principles. Project type umbrella for desktop apps. Primary framework: E...     |
| [rule-platform-expo](../rule-platform-expo/SKILL.md)       | `pix_platform_expo`    | expo, react-native | Configure and manage EAS Build profiles, EAS Secrets, OTA updates, and tag-driven GitLab CI/CD pipelines for Expo pro... |
| [rule-platform-library](../rule-platform-library/SKILL.md) | `pix_platform_library` | all                | Reusable library/package development with rule principles. Covers pnpm package structure, public API design, TypeS...     |
| [rule-platform-web](../rule-platform-web/SKILL.md)         | `pix_platform_web`     | all                | Web application development with rule principles. Covers browser-based app architecture, bundling, routing, progre...     |

### Process

Write ADRs/docs, follow BMAD, feature workflow, and handoff.

| Skill                                                                    | Tool                           | Frameworks | Use when                                                                                                                 |
| ------------------------------------------------------------------------ | ------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| [rule-process](../rule-process/SKILL.md)                                   | `pix_process`                  | all        | Index of process skills: ADR, BMAD, code review, documentation, feature workflow, and LLM handoff.                       |
| [rule-process-adr](../rule-process-adr/SKILL.md)                           | `pix_process_adr`              | all        | Architecture Decision Records (ADR) for rule projects. Capture, store, and manage architectural decisions in docs/...     |
| [rule-process-bmad](../rule-process-bmad/SKILL.md)                         | `pix_process_bmad`             | all        | BMAD Method (Build More Architect Dreams) - AI-driven development framework for structured software delivery through...  |
| [rule-process-code-review](../rule-process-code-review/SKILL.md)           | `pix_process_code_review`      | all        | Prepare and conduct risk-based PR/MR reviews with explicit quality, safety, and follow-up gates.                         |
| [rule-process-documentation](../rule-process-documentation/SKILL.md)       | `pix_process_documentation`    | all        | Set up and maintain Mintlify documentation for rule repositories. Use when creating the docs/ directory, configuri...     |
| [rule-process-feature-workflow](../rule-process-feature-workflow/SKILL.md) | `pix_process_feature_workflow` | all        | End-to-end procedure for adding a new feature to any rule repository. Use when implementing a feature in a backend...     |
| [rule-process-handoff](../rule-process-handoff/SKILL.md)                   | `pix_process_handoff`          | all        | Generate a compressed LLM handoff summary from ADR logs and project context. Enables cross-chat recovery, model-switc... |

### Styleguide

Apply HTML/CSS/JS/JSON/Markdown/a11y/naming/validation standards.

| Skill                                                              | Tool                        | Frameworks | Use when                                                                                                                 |
| ------------------------------------------------------------------ | --------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| [rule-styleguide](../rule-styleguide/SKILL.md)                       | `pix_styleguide`            | all        | Central index of all rule coding style guides. Delegates to specialized sub-skills: HTML semantics, CSS architectu...     |
| [rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md)             | `pix_styleguide_a11y`       | all        | WCAG 2.2 AA accessibility: semantic HTML, ARIA, keyboard navigation, color contrast, forms, media, automated testing...  |
| [rule-styleguide-css](../rule-styleguide-css/SKILL.md)               | `pix_styleguide_css`        | all        | CSS architecture, selector strategy (data-part, element), naming conventions, property ordering, custom properties, c... |
| [rule-styleguide-html](../rule-styleguide-html/SKILL.md)             | `pix_styleguide_html`       | all        | Semantic HTML, document structure, template engine syntax, accessibility essentials, and element conventions for fron... |
| [rule-styleguide-javascript](../rule-styleguide-javascript/SKILL.md) | `pix_styleguide_javascript` | all        | JavaScript conventions: naming, functions, classes, async patterns, DOM manipulation, custom elements, static initial... |
| [rule-styleguide-json](../rule-styleguide-json/SKILL.md)             | `pix_styleguide_json`       | all        | JSON structure conventions: validity, property naming, date formats, numeric precision, schema mindset, and API respo... |
| [rule-styleguide-markdown](../rule-styleguide-markdown/SKILL.md)     | `pix_styleguide_markdown`   | all        | Markdown documentation style: document structure, headings, lists, code blocks, formatting, tables, links, and tone f... |
| [rule-styleguide-naming](../rule-styleguide-naming/SKILL.md)         | `pix_styleguide_naming`     | all        | Naming conventions and file tree structure: PascalCase, camelCase, UPPER_SNAKE_CASE, underscore prefix rule, barrel p... |
| [rule-styleguide-patterns](../rule-styleguide-patterns/SKILL.md)     | `pix_styleguide_patterns`   | all        | Quick reference cheat sheet for naming conventions, property ordering, file tree structure, and common patterns. Cond... |
| [rule-styleguide-validation](../rule-styleguide-validation/SKILL.md) | `pix_styleguide_validation` | all        | Cross-border business validation patterns: email, phone, VAT, tax IDs, postal codes, national identification numbers,... |

### Toolchain

Configure pnpm, TypeScript, ESLint, Biome, Vite, Parcel, Turborepo, Husky.

| Skill                                                            | Tool                       | Frameworks | Use when                                                                                                                                         |
| ---------------------------------------------------------------- | -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [rule-toolchain](../rule-toolchain/SKILL.md)                       | `pix_toolchain`            | all        | Index of all toolchain skills: build tools (Vite, Parcel), linters (Biome, ESLint), package management (pnpm), monore...                         |
| [rule-toolchain-biome](../rule-toolchain-biome/SKILL.md)           | `pix_toolchain_biome`      | all        | Biome linter and formatter configuration and best practices. Zero-config by default, but covers migration from ESLint...                         |
| [rule-toolchain-commits](../rule-toolchain-commits/SKILL.md)       | `pix_toolchain_commits`    | all        | Enforce atomic Conventional Commits with a mandatory scope on every commit and push. Use when writing, validating, or preparing commit messages. |
| [rule-toolchain-eslint](../rule-toolchain-eslint/SKILL.md)         | `pix_toolchain_eslint`     | all        | ESLint 9+ flat config: rule sets for TypeScript, React, and Node.js, plugin integration, custom rules, and CI integra...                         |
| [rule-toolchain-husky](../rule-toolchain-husky/SKILL.md)           | `pix_toolchain_husky`      | all        | Git hooks management with Husky: commit hooks, pre-push validation, lint-staged integration, commitlint, and CI-frien...                         |
| [rule-toolchain-parcel](../rule-toolchain-parcel/SKILL.md)         | `pix_toolchain_parcel`     | all        | Parcel 2+ zero-configuration bundler: entry points, transpilation, code splitting, image optimization, environment va...                         |
| [rule-toolchain-pnpm](../rule-toolchain-pnpm/SKILL.md)             | `pix_toolchain_pnpm`       | all        | pnpm package manager: workspace management, dependency resolution, caching strategies, CI optimization, and monorepo...                          |
| [rule-toolchain-project](../rule-toolchain-project/SKILL.md)       | `pix_toolchain_project`    | all        | Base project configuration files and conventions. Covers .gitignore, .editorconfig, .nvmrc, .env.example, and reposit...                         |
| [rule-toolchain-turborepo](../rule-toolchain-turborepo/SKILL.md)   | `pix_toolchain_turborepo`  | all        | Turborepo monorepo orchestration: pipeline configuration, caching, remote caching, task dependency graphs, and worksp...                         |
| [rule-toolchain-typescript](../rule-toolchain-typescript/SKILL.md) | `pix_toolchain_typescript` | all        | TypeScript compiler configuration, tsconfig management, strict mode setups, path aliases, declaration files, and buil...                         |
| [rule-toolchain-vite](../rule-toolchain-vite/SKILL.md)             | `pix_toolchain_vite`       | all        | Vite build tool configuration and best practices. Covers vite.config.ts, vitest.config.ts, environment variables, bui...                         |

### UI

Design and route visible interface work while preserving rule implementation constraints.

| Skill                                                    | Tool                   | Frameworks | Use when                                                                                                                     |
| -------------------------------------------------------- | ---------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [rule-ui](../rule-ui/SKILL.md)                             | `pix_ui`               | all        | Umbrella skill for all user-interface work in the rule ecosystem. Use when a task affects visual UI, component composition... |
| [rule-ui-design-system](../rule-ui-design-system/SKILL.md) | `pix_ui_design_system` | all        | Distinctive production-grade UI design direction for rule projects. Use when designing pages, components, dashboards...       |

## Recommended dispatch bundles

| Task                     | Primary                                             | Secondary                                             | Deterministic tools                      |
| ------------------------ | --------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| Unknown project          | `rule`                                               | `rule-process-adr`                                     | `pix_detect`, `pix_search`               |
| AI agent app             | `rule-ai-agents`                                     | `rule-ai`, `rule-devops-testing`                        | `pix_check`, `pix_process_adr`           |
| New web UI               | `rule-ui` + `rule-ui-design-system` + framework skill | `rule-styleguide`, `rule-platform-web`                  | `pix_component`, `pix_check`             |
| React/Vite app           | `rule-frontend-react`                                | `rule-toolchain-vite`, `rule-styleguide`                | `pix_scaffold`, `pix_check`              |
| Backend API              | `rule-backend-api-design`                            | runtime skill, `rule-backend-security`                 | `pix_check`, `pix_process_adr`           |
| Database work            | database skill                                      | `rule-backend-api-design`                              | `pix_search`, `pix_check`                |
| Docker/CI/tests          | `rule-devops` focused skill                          | platform skill                                        | `pix_scaffold`, `pix_fix`                |
| GraphQL API              | `rule-backend-graphql`                               | runtime skill, `rule-backend-security`                 | `pix_search`, `pix_check`                |
| Production observability | `rule-devops-observability`                          | runtime and platform skill                            | `pix_check`, `pix_process_adr`           |
| Code review              | `rule-process-code-review`                           | feature workflow, relevant domain skill               | `pix_check`                              |
| Commit/push              | `rule-toolchain-commits`                             | `rule-toolchain-husky`, `rule-process-feature-workflow` | `pix_check`                              |
| Docs/ADR                 | `rule-process-documentation`                         | `rule-process-adr`                                     | `pix_process_adr`, `pix_process_handoff` |
| File-tree cleanup        | `rule-styleguide-naming`                             | `rule-toolchain-project`                               | `pix_fix`, `pix_check`                   |

## Operational sequence

1. Call `pix_detect` when a project path is available.
2. Call `rule` with the user prompt and optional framework hint.
3. Read the primary skill in `mode=tldr` or `mode=search` before `mode=full`.
4. Generate deterministic artifacts with `pix_component` or `pix_scaffold`.
5. Validate with `pix_check`; pass `previousPassed` on subsequent iterations.
6. Record major decisions with `pix_process_adr`.
7. Use `pix_fix` for file-tree convention fixes and `pix_process_handoff` before context switches.

## See also

- [rule-styleguide](../rule-styleguide/SKILL.md) - Shared coding standards
- [rule-process-feature-workflow](../rule-process-feature-workflow/SKILL.md) - Feature delivery workflow
- [rule-toolchain](../rule-toolchain/SKILL.md) - Toolchain index
