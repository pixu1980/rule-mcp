---
name: pix-architect
description: >-
  Use when starting a new project, restructuring architecture, or generating .context/ files for LLM onboarding. Covers project scaffolding, ADR decisions, and skill mapping.
tags:
  - architecture
  - scaffolding
  - sdd
  - context
  - interview
  - adr
  - tool-routing
frameworks: [all]
---

# pix-architect - Architecture command center

`pix-architect` is the **engine** in a 3-skill architecture:

| Skill                                              | Role                                                       | Reads                               |
| -------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------- |
| **pix-architect** (this)                           | Engine: wizard-spec.json, templates, generator, validators | -                                   |
| [pix-architect-web](../pix-architect-web/SKILL.md) | Shell: browser interview via vanilla JS                    | wizard-spec.json from pix-architect |
| [pix-architect-cli](../pix-architect-cli/SKILL.md) | Shell: terminal interview via opentui                      | wizard-spec.json from pix-architect |

`pix-architect` turns product intent into an implementation-ready architecture package. It must account for every available pix skill and deterministic MCP tool, then emit `.context/` docs that any LLM can follow without hidden assumptions.

## Operating principles

1. **Single source of routing truth** - Start from [`pix`](../pix/SKILL.md), then map every architecture choice to exact skills and tools.
2. **Spec-driven by default** - Generate product, domain, architecture, quality, deployment, security, ADR, and pix-routing specs.
3. **SOLID boundaries** - Separate platform, frontend, backend, data, DevOps, process, styleguide, and toolchain concerns.
4. **Deterministic tooling first** - Prefer MCP tools before free-form generation: detect, search, scaffold/template, validate, ADR, fix, handoff.
5. **LLM portability** - Output exact skill names, exact tool names, explicit quality gates, and no model-specific assumptions.

## Tool workflow

| Phase    | Tool                           | Purpose                                                                         |
| -------- | ------------------------------ | ------------------------------------------------------------------------------- |
| Discover | `pix_detect`                   | Detect framework, TypeScript, build tool, and suggested canonical skills/tools. |
| Route    | `pix`                          | Route ambiguous work to the smallest relevant skill set.                        |
| Research | `pix_search`                   | Find the relevant sections across all skills.                                   |
| Generate | `pix_component / pix_scaffold` | Create deterministic components, tests, config, or scaffold files.              |
| Validate | `pix_check`                    | Run guardrails and iterate with previousPassed.                                 |
| Fix      | `pix_fix`                      | Repair file-tree naming/barrel conventions.                                     |
| Decide   | `pix_process_adr`              | Record architecture decisions in docs/adr.                                      |
| Transfer | `pix_process_handoff`          | Generate a compact continuation summary.                                        |

## Enforcement architecture

Every generated architecture must define both gates:

- **Pre-processing gate**: validate and normalize tool input; reject blank prompts, unsafe object keys, control characters, oversized payloads, excessive nesting, and undeclared routing assumptions.
- **Post-processing gate**: validate MCP result shape, verify routed skill/tool identifiers against registries, append model-visible compliance contract, and attach `_meta.pixEnforcement` audit data.
- **Code gate**: `pix_check` failures are blocking. Require complete implementation, explicit error handling, manifest-verified dependencies when context exists, and zero ignored diagnostics.
- **Evidence gate**: never claim tests, typechecks, files, APIs, or dependencies without tool or repository evidence.
- **Decision gate**: structural enforcement changes require `pix_process_adr` before completion.

## Agent command distribution

Use reusable command where host supports it:

| Host               | Installed integration                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Pi                 | `~/.pi/agent/prompts/pix-galaxy-mcp.md` → `/pix-galaxy-mcp`                                   |
| Claude Code        | `~/.claude/commands/pix-galaxy-mcp.md` → `/pix-galaxy-mcp` (legacy-compatible command path)   |
| Gemini CLI         | `~/.gemini/commands/pix-galaxy-mcp.toml` → `/pix-galaxy-mcp`                                  |
| Cursor             | `.cursor/commands/pix-galaxy-mcp.md` → project command                                        |
| GitHub Copilot CLI | `~/.copilot/agents/pix-galaxy-mcp.agent.md` → select through `/agent`                         |
| Codex CLI          | Use installed `pix` skill; custom prompt command support is version-dependent and not forced. |

## Architecture decision flow

```text
Intent
  ├─ Project/platform       → pix-platform-*
  ├─ UI/meta-framework      → pix-ui + pix-ui-design-system + pix-frontend-* + pix-styleguide
  ├─ Backend/API/security   → pix-backend-* + pix-backend-security
  ├─ Persistence            → pix-data-*
  ├─ DevOps/release/tests   → pix-devops-*
  ├─ Process/docs/handoff   → pix-process-*
  ├─ Tooling/config         → pix-toolchain-*
  └─ Cross-domain routing   → pix + this skill
```

## Complete skill coverage - Architecture choice mapping per category

Use this table to ensure the architecture package references all relevant skills.

### AI / Agent platform

| Skill                                                | Use in architecture when                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [pix-ai-agents](../pix-ai-agents/SKILL.md)           | Building an agent application on `@pix/pix-galaxy-core` with its prescribed provider, tool, test, and container patterns. |
| [pix-platform-agent](../pix-platform-agent/SKILL.md) | Scaffolding a framework-agnostic AI coding agent project with custom tools, env config, testing, and containerization.    |

### Backend

| Skill                                                        | Use in architecture when                                                                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| [pix-backend](../pix-backend/SKILL.md)                       | Umbrella routing for any backend project. Read first before using framework-specific skills.                                      |
| [pix-backend-api-design](../pix-backend-api-design/SKILL.md) | Designing REST endpoints, HTTP methods, versioning, request/response contracts, pagination, filtering, sorting, and OpenAPI docs. |
| [pix-backend-express](../pix-backend-express/SKILL.md)       | API server built with Express.js 5+ (middleware, routing, error handling, security headers).                                      |
| [pix-backend-fastify](../pix-backend-fastify/SKILL.md)       | API server built with Fastify 5+ (schema validation, serialization, plugins, high throughput).                                    |
| [pix-backend-graphql](../pix-backend-graphql/SKILL.md)       | GraphQL API contract and operations: schema-first design, resolver boundaries, N+1 prevention, caching, and abuse controls.       |
| [pix-backend-hono](../pix-backend-hono/SKILL.md)             | Edge-compatible API built with Hono 4+ (multi-runtime: Node, Cloudflare Workers, Bun, Deno).                                      |
| [pix-backend-nestjs](../pix-backend-nestjs/SKILL.md)         | Modular enterprise API with NestJS 10+ (decorators, DI, guards, interceptors, GraphQL, microservices).                            |
| [pix-backend-node](../pix-backend-node/SKILL.md)             | Scaffolding a new Node.js + TypeScript backend repository with baseline config, tests, Docker, and CI.                            |
| [pix-backend-security](../pix-backend-security/SKILL.md)     | Hardening backend security: env vars, secrets, Docker security, HTTP headers, rate limiting, CORS, input validation.              |

### Data / Persistence

| Skill                                                  | Use in architecture when                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [pix-data](../pix-data/SKILL.md)                       | Umbrella routing for data-layer decisions. Read first for database-agnostic guidance.                                 |
| [pix-data-postgresql](../pix-data-postgresql/SKILL.md) | Relational backend with PostgreSQL 16+ (indexing, partitioning, replication, JSONB, full-text search).                |
| [pix-data-mysql](../pix-data-mysql/SKILL.md)           | Relational backend with MySQL 8+ / MariaDB 11+ (InnoDB tuning, replication, query optimization).                      |
| [pix-data-mongodb](../pix-data-mongodb/SKILL.md)       | Document database with MongoDB 7+ (schema design, aggregation pipeline, indexing, sharding).                          |
| [pix-data-sql](../pix-data-sql/SKILL.md)               | SQL best practices, table design, index optimization, transactions - database-agnostic reference.                     |
| [pix-data-sqlite](../pix-data-sqlite/SKILL.md)         | SQLite 3.x embedded database: WAL/journal modes, FTS5 full-text search, JSON functions, local-first/offline patterns. |
| [pix-data-duckdb](../pix-data-duckdb/SKILL.md)         | DuckDB 1.x embedded OLAP: columnar storage, Parquet/CSV/JSON import, PIVOT/UNNEST/QUALIFY, window functions.          |
| [pix-data-indexed-db](../pix-data-indexed-db/SKILL.md) | IndexedDB / File System Access: browser persistence, object stores, indexes, cursors, offline sync, schema migration. |

### DevOps / Engineering

| Skill                                                            | Use in architecture when                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [pix-devops](../pix-devops/SKILL.md)                             | Umbrella routing for DevOps decisions. Read first before using specialized sub-skills.                             |
| [pix-devops-docker](../pix-devops-docker/SKILL.md)               | Containerizing with Docker: Dockerfile, docker-compose, .dockerignore, multi-stage builds, nginx config.           |
| [pix-devops-gitlab-ci](../pix-devops-gitlab-ci/SKILL.md)         | CI/CD with GitLab CI: pipeline caching, coverage reporting, Docker build/push, deploy stages.                      |
| [pix-devops-observability](../pix-devops-observability/SKILL.md) | Production observability and reliability: SLOs, telemetry, alerting, incident learning, and rollback verification. |
| [pix-devops-testing](../pix-devops-testing/SKILL.md)             | Test infrastructure with Vitest: unit, integration, config, mocks, coverage thresholds (60/50/60/60).              |
| [pix-devops-version](../pix-devops-version/SKILL.md)             | Automatic version increment on every commit using Husky pre-commit hooks.                                          |

### Dispatcher (core router)

| Skill                  | Use in architecture when                                                              |
| ---------------------- | ------------------------------------------------------------------------------------- |
| [pix](../pix/SKILL.md) | First tool to call for any ambiguous prompt. Routes to the correct skill or tool set. |

### Frontend / UI Frameworks

| Skill                                                                      | Use in architecture when                                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [pix-frontend](../pix-frontend/SKILL.md)                                   | Umbrella routing for frontend framework decisions. Read first before framework-specific skills. |
| [pix-frontend-react](../pix-frontend-react/SKILL.md)                       | React 18+ SPA or component library with hooks, Context API, zero CSS classes.                   |
| [pix-frontend-vue](../pix-frontend-vue/SKILL.md)                           | Vue 3 SPA with Composition API, SFC, ref/reactive, scoped styles.                               |
| [pix-frontend-angular](../pix-frontend-angular/SKILL.md)                   | Enterprise Angular app with standalone components, signals, @Component, styleUrl.               |
| [pix-frontend-svelte](../pix-frontend-svelte/SKILL.md)                     | Svelte 5 app with Runes ($state, $derived, $effect), SvelteKit for SSR/SSG.                     |
| [pix-frontend-solidjs](../pix-frontend-solidjs/SKILL.md)                   | SolidJS app with fine-grained reactivity, createSignal/createMemo, fastest runtime.             |
| [pix-frontend-vanilla-reactive](../pix-frontend-vanilla-reactive/SKILL.md) | Zero-framework reactive app: Proxy Store, Signals, html`` tagged templates, Custom Elements.    |
| [pix-frontend-astro](../pix-frontend-astro/SKILL.md)                       | Content-first static site or multi-framework islands with Astro.                                |
| [pix-frontend-meta-next](../pix-frontend-meta-next/SKILL.md)               | Full-stack React with Next.js App Router, SSR/SSG/ISR, API routes, middleware.                  |
| [pix-frontend-meta-nuxt](../pix-frontend-meta-nuxt/SKILL.md)               | Full-stack Vue with Nuxt.js file-based routing, SSR/SSG, server routes, Nitro engine.           |
| [pix-frontend-meta-remix](../pix-frontend-meta-remix/SKILL.md)             | Full-stack React with Remix nested routing, loaders/actions, progressive enhancement.           |

### Platform / Project Type

| Skill                                                    | Use in architecture when                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [pix-platform](../pix-platform/SKILL.md)                 | Umbrella routing for platform/project-type decisions. Read first before specialized skills.                  |
| [pix-platform-web](../pix-platform-web/SKILL.md)         | Browser-based web app: bundling, routing, progressive enhancement, performance budgets, static hosting.      |
| [pix-platform-desktop](../pix-platform-desktop/SKILL.md) | Desktop app: Electron (Chromium + Node.js, contextBridge IPC, auto-update) or Tauri (Rust + system webview). |
| [pix-platform-expo](../pix-platform-expo/SKILL.md)       | Mobile app: Expo/React Native with EAS Build, EAS Secrets, OTA updates, Expo Router.                         |
| [pix-platform-library](../pix-platform-library/SKILL.md) | Reusable npm package: dual CJS/ESM, TypeScript exports, semantic versioning, changelog.                      |

### Process / Methodology

| Skill                                                                    | Use in architecture when                                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| [pix-process](../pix-process/SKILL.md)                                   | Umbrella routing for process decisions. Read first before specialized skills.                                           |
| [pix-process-adr](../pix-process-adr/SKILL.md)                           | Recording architecture decisions: auto-numbered Nygard ADRs in docs/adr/ with index.                                    |
| [pix-process-bmad](../pix-process-bmad/SKILL.md)                         | Full 4-phase delivery: Analysis, Planning, Solutioning, Implementation - choose Quick Flow, BMAD, or Enterprise.        |
| [pix-process-code-review](../pix-process-code-review/SKILL.md)           | Risk-based PR/MR review: readiness, high-risk inspection order, actionable feedback, approval, and follow-up ownership. |
| [pix-process-documentation](../pix-process-documentation/SKILL.md)       | Setting up Mintlify documentation portal: mint.json, page templates, local preview, deploy.                             |
| [pix-process-feature-workflow](../pix-process-feature-workflow/SKILL.md) | End-to-end feature procedure: branch creation through merge request with TDD and guardrails.                            |
| [pix-process-handoff](../pix-process-handoff/SKILL.md)                   | LLM session handoff: compressed summary from ADR logs and project context for cross-chat continuity.                    |

### Styleguide / Frontend Conventions

| Skill                                                              | Use in architecture when                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [pix-styleguide](../pix-styleguide/SKILL.md)                       | Umbrella styleguide: read first for HTML, CSS, JS, a11y, naming, and validation conventions.                      |
| [pix-styleguide-html](../pix-styleguide-html/SKILL.md)             | Semantic HTML: document structure, elements, attributes, landmarks, form semantics.                               |
| [pix-styleguide-css](../pix-styleguide-css/SKILL.md)               | CSS architecture: selector strategy (data-part, element), naming, custom properties, cascade layers.              |
| [pix-styleguide-javascript](../pix-styleguide-javascript/SKILL.md) | JS conventions: naming, functions, classes, async patterns, Custom Elements, imports, barrel pattern.             |
| [pix-styleguide-a11y](../pix-styleguide-a11y/SKILL.md)             | Accessibility: WCAG 2.2 AA, semantic HTML, ARIA, keyboard nav, color contrast, Playwright + axe-core.             |
| [pix-styleguide-naming](../pix-styleguide-naming/SKILL.md)         | Naming conventions: PascalCase, camelCase, UPPER_SNAKE_CASE, underscore prefix, barrel pattern, directory layout. |
| [pix-styleguide-patterns](../pix-styleguide-patterns/SKILL.md)     | Quick-reference cheat sheet for naming, property ordering, file tree, and common patterns.                        |
| [pix-styleguide-json](../pix-styleguide-json/SKILL.md)             | JSON structure conventions: property naming, date formats, numeric precision, API response consistency.           |
| [pix-styleguide-markdown](../pix-styleguide-markdown/SKILL.md)     | Markdown documentation style: structure, headings, lists, code blocks, tables, links.                             |
| [pix-styleguide-validation](../pix-styleguide-validation/SKILL.md) | Business validation patterns: email, phone, VAT, tax IDs, postal codes, national IDs - EU/UK/US/global.           |

### Toolchain / Build & Config

| Skill                                                            | Use in architecture when                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [pix-toolchain](../pix-toolchain/SKILL.md)                       | Umbrella routing for build tool and toolchain decisions. Read first before specialized skills.          |
| [pix-toolchain-vite](../pix-toolchain-vite/SKILL.md)             | Vite build tool: vite.config.ts, vitest.config.ts, env vars, build optimization, production deploy.     |
| [pix-toolchain-parcel](../pix-toolchain-parcel/SKILL.md)         | Parcel 2+ zero-config bundler: entry points, transpilation, code splitting, image optimization.         |
| [pix-toolchain-typescript](../pix-toolchain-typescript/SKILL.md) | TypeScript config: tsconfig management, strict mode, path aliases, declaration files, build strategies. |
| [pix-toolchain-biome](../pix-toolchain-biome/SKILL.md)           | Biome linter + formatter: zero-config, migration from ESLint + Prettier, rule customization, CI.        |
| [pix-toolchain-eslint](../pix-toolchain-eslint/SKILL.md)         | ESLint 9+ flat config: TypeScript/React/Node rules, plugin integration, custom rules.                   |
| [pix-toolchain-pnpm](../pix-toolchain-pnpm/SKILL.md)             | pnpm package manager: workspaces, dependency resolution, caching, CI optimization, monorepo patterns.   |
| [pix-toolchain-turborepo](../pix-toolchain-turborepo/SKILL.md)   | Turborepo monorepo: pipeline config, caching, remote caching, task dependency graphs.                   |
| [pix-toolchain-husky](../pix-toolchain-husky/SKILL.md)           | Git hooks: Husky + lint-staged + commitlint, pre-commit/pre-push validation, CI-friendly.               |
| [pix-toolchain-project](../pix-toolchain-project/SKILL.md)       | Project config baseline: .gitignore, .editorconfig, .nvmrc, .env.example, README, LICENSE.              |

### UI / Design System

| Skill                                                    | Use in architecture when                                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [pix-ui](../pix-ui/SKILL.md)                             | Umbrella for all user-interface work: component composition, interaction design, accessibility routing.     |
| [pix-ui-design-system](../pix-ui-design-system/SKILL.md) | Distinctive production-grade UI design direction: memorable pages/components while obeying pix styleguides. |

## Generated `.context/` output

The context interview must generate these industry-standard outputs from `templates.json`:

- `README.md` - documentation map and project frame
- `ROADMAP.md` - milestone tracker
- `project-context.md` - compact AI working context
- `analysis/functional-analysis.md` and `analysis/implementation-roadmap.md` - product analysis and execution order
- `specs/00-sdd.md` through `specs/12-pix-routing.md` - SDD, product, domain, rules, architecture, quality, ADRs, deployment, security, devops, process/delivery, and pix routing
- `schemas/ruleset.schema.json` - validation contract for reusable domain rules
- `qa/checklist.md` - manual QA and a11y/resilience checks
- concrete support docs such as `constraints.concrete.md` and `use-cases.concrete.md`

## Placeholder and inventory governance

- `wizard-spec.json` is the interview schema.
- `templates.json` is the generated `.context/` source.
- [`knowledge/context-inventory.md`](./knowledge/context-inventory.md) is the census of generated files, placeholders, tools, and skill routing.
- Every placeholder used by a template must be present in `wizard-spec.json`.
- Every generated project must include `PIX_PRIMARY_SKILL`, `PIX_SECONDARY_SKILLS`, `PIX_RECOMMENDED_TOOLS`, `ARCHITECTURE_DECISIONS`, `QUALITY_GATES`, and `DELIVERY_WORKFLOW`.

## Quality gates

Before architecture work is complete:

- [ ] `pix_detect` has been run when a project path exists.
- [ ] Primary and secondary skills are explicit.
- [ ] Deterministic tool sequence is captured in `.context/specs/10-pix-routing.md`.
- [ ] ADRs exist for irreversible or high-impact decisions.
- [ ] Tests, docs, a11y/security/performance gates are listed.
- [ ] `pix_check` passes for generated code or templates where applicable.
- [ ] `pix_process_handoff` can summarize the project for a new LLM session.

## See also

- [pix](../pix/SKILL.md) - Central skill and tool dispatcher
- [pix-process-adr](../pix-process-adr/SKILL.md) - Architecture Decision Records
- [pix-process-documentation](../pix-process-documentation/SKILL.md) - Documentation standards
- [pix-devops-testing](../pix-devops-testing/SKILL.md) - Testing and coverage gates
- [pix-toolchain-project](../pix-toolchain-project/SKILL.md) - Project configuration baseline
