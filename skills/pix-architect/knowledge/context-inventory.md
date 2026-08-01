# pix-architect Context Inventory

This inventory is generated from `../templates.json`, `../wizard-spec.json`, the skill corpus, and the registered MCP tools. It is the audit surface for keeping `.context` output industry-ready.

## Generated .context files

| Output | Label | Placeholder count |
|--------|-------|-------------------|
| `README.md` | README | 14 |
| `ROADMAP.md` | ROADMAP | 29 |
| `TEMPLATE_GUIDE.md` | TEMPLATE_GUIDE | 25 |
| `analysis/functional-analysis.md` | analysis → functional-analysis | 89 |
| `analysis/implementation-roadmap.md` | analysis → implementation-roadmap | 31 |
| `constraints.concrete.md` | constraints.concrete | 0 |
| `project-context.md` | project-context | 13 |
| `qa/checklist.md` | qa → checklist | 8 |
| `schemas/ruleset.schema.json` | schemas → ruleset.schema.json | 49 |
| `specs/00-sdd.md` | specs → 00-sdd | 10 |
| `specs/01-product.md` | specs → 01-product | 19 |
| `specs/02-domain-glossary.md` | specs → 02-domain-glossary | 18 |
| `specs/03-calculation-engine.md` | specs → 03-calculation-engine | 36 |
| `specs/04-ruleset-config.md` | specs → 04-ruleset-config | 27 |
| `specs/05-architecture-ui-storage.md` | specs → 05-architecture-ui-storage | 24 |
| `specs/06-quality-acceptance.md` | specs → 06-quality-acceptance | 14 |
| `specs/07-architecture-decision-records.md` | specs → 07-architecture-decision-records | 12 |
| `specs/08-deployment.md` | specs → 08-deployment | 8 |
| `specs/09-security.md` | specs → 09-security | 9 |
| `specs/10-devops-toolchain.md` | specs → 10-devops-toolchain | 11 |
| `specs/11-process-delivery.md` | specs → 11-process-delivery | 7 |
| `use-cases.concrete.md` | use-cases.concrete | 0 |
| `specs/12-pix-routing.md` | specs → 12-pix-routing | 7 |

## Placeholder coverage

- Template placeholders: 159
- Placeholder schema fields: 447
- Missing placeholders: 0

## Skill and tool routing

- Skills indexed: 68
- MCP tools indexed: 74

### MCP tools

- `pix` — Route a prompt to the correct pix skill. Returns structured routing with relevant sections.
- `pix_platform_agent` — pix-platform-agent skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_architect` — pix-architect skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content), scaffold (project structure), interview (context wizard).
- `pix_backend` — pix-backend skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_api_design` — pix-backend-api-design skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_express` — pix-backend-express skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_fastify` — pix-backend-fastify skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_hono` — pix-backend-hono skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_nestjs` — pix-backend-nestjs skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_node` — pix-backend-node skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_security` — pix-backend-security skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_data` — pix-data skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_data_mongodb` — pix-data-mongodb skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_data_mysql` — pix-data-mysql skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_data_postgresql` — pix-data-postgresql skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_data_sql` — pix-data-sql skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_devops` — pix-devops skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_devops_docker` — pix-devops-docker skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_devops_gitlab_ci` — pix-devops-gitlab-ci skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_devops_testing` — pix-devops-testing skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_devops_version` — pix-devops-version skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend` — pix-frontend skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_angular` — pix-frontend-angular skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_astro` — pix-frontend-astro skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_meta_next` — pix-frontend-meta-next skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_meta_nuxt` — pix-frontend-meta-nuxt skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_meta_remix` — pix-frontend-meta-remix skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_react` — pix-frontend-react skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_solidjs` — pix-frontend-solidjs skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_svelte` — pix-frontend-svelte skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_vanilla_reactive` — pix-frontend-vanilla-reactive skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_vue` — pix-frontend-vue skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_platform` — pix-platform skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_platform_desktop` — pix-platform-desktop skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_platform_expo` — pix-platform-expo skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_platform_library` — pix-platform-library skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_platform_web` — pix-platform-web skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_process` — pix-process skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_process_bmad` — pix-process-bmad skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_process_documentation` — pix-process-documentation skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_process_feature_workflow` — pix-process-feature-workflow skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide` — pix-styleguide skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content), scaffold (project structure).
- `pix_styleguide_a11y` — pix-styleguide-a11y skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_css` — pix-styleguide-css skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_html` — pix-styleguide-html skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_javascript` — pix-styleguide-javascript skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_json` — pix-styleguide-json skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_markdown` — pix-styleguide-markdown skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_naming` — pix-styleguide-naming skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_patterns` — pix-styleguide-patterns skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_validation` — pix-styleguide-validation skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain` — pix-toolchain skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_biome` — pix-toolchain-biome skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_eslint` — pix-toolchain-eslint skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_husky` — pix-toolchain-husky skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_parcel` — pix-toolchain-parcel skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_pnpm` — pix-toolchain-pnpm skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_project` — pix-toolchain-project skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_turborepo` — pix-toolchain-turborepo skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_typescript` — pix-toolchain-typescript skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_vite` — pix-toolchain-vite skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_ui` — pix-ui skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_ui_design_system` — pix-ui-design-system skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_search` — Semantic search across ALL pix skills using BM25 ranking. Returns scored, relevant sections.
- `pix_check` — Run guardrail checks on code against any pix skill. Smart iteration: pass previousPassed to skip already-passed checks. Iterate: check → fix → re-check until all pass.
- `pix_scaffold` — Generate project scaffolding files. Returns one or all config file templates.
- `pix_detect` — Detect project framework, TypeScript usage, and build tool from package.json.
- `pix_process_adr` — Save an Architecture Decision Record (ADR) to docs/adr/. Auto-numbers, maintains index, uses Nygard template.
- `pix_fix` — Validate and auto-fix project file tree structure against pix conventions (barrel files, _PascalCase naming, etc.).
- `pix_process_handoff` — Generate a compressed LLM handoff summary from ADR logs and project context. Paste the output into a new chat to resume work seamlessly.
- `pix_component` — Generate component or test templates following pix principles.

### pix skills

- `pix`
- `pix-platform-agent`
- `pix-architect`
- `pix-backend`
- `pix-backend-api-design`
- `pix-backend-express`
- `pix-backend-fastify`
- `pix-backend-hono`
- `pix-backend-nestjs`
- `pix-backend-node`
- `pix-backend-security`
- `pix-data`
- `pix-data-mongodb`
- `pix-data-mysql`
- `pix-data-postgresql`
- `pix-data-sql`
- `pix-data-sqlite`
- `pix-data-duckdb`
- `pix-data-indexed-db`
- `pix-devops`
- `pix-devops-docker`
- `pix-devops-gitlab-ci`
- `pix-devops-testing`
- `pix-devops-version`
- `pix-frontend`
- `pix-frontend-angular`
- `pix-frontend-astro`
- `pix-frontend-meta-next`
- `pix-frontend-meta-nuxt`
- `pix-frontend-meta-remix`
- `pix-frontend-react`
- `pix-frontend-solidjs`
- `pix-frontend-svelte`
- `pix-frontend-vanilla-reactive`
- `pix-frontend-vue`
- `pix-platform`
- `pix-platform-desktop`
- `pix-platform-expo`
- `pix-platform-library`
- `pix-platform-web`
- `pix-process`
- `pix-process-adr`
- `pix-process-bmad`
- `pix-process-documentation`
- `pix-process-feature-workflow`
- `pix-process-handoff`
- `pix-styleguide`
- `pix-styleguide-a11y`
- `pix-styleguide-css`
- `pix-styleguide-html`
- `pix-styleguide-javascript`
- `pix-styleguide-json`
- `pix-styleguide-markdown`
- `pix-styleguide-naming`
- `pix-styleguide-patterns`
- `pix-styleguide-validation`
- `pix-toolchain`
- `pix-toolchain-biome`
- `pix-toolchain-eslint`
- `pix-toolchain-husky`
- `pix-toolchain-parcel`
- `pix-toolchain-pnpm`
- `pix-toolchain-project`
- `pix-toolchain-turborepo`
- `pix-toolchain-typescript`
- `pix-toolchain-vite`
- `pix-ui`
- `pix-ui-design-system`

## Industry-standard output expectations

- Every generated project includes product context, specs, QA, ADR guidance, deployment, security, UI/design-system routing, and pix routing.
- Every template placeholder is either collected by the interview or intentionally left highlighted in generated output.
- Generated files should support any LLM by using explicit skill names, exact MCP tool names, and deterministic quality gates.
