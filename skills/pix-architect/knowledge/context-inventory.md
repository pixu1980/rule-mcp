# rule-architect Context Inventory

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
| `specs/12-rule-routing.md` | specs → 12-rule-routing | 7 |

## Placeholder coverage

- Template placeholders: 159
- Placeholder schema fields: 447
- Missing placeholders: 0

## Skill and tool routing

- Skills indexed: 68
- MCP tools indexed: 74

### MCP tools

- `rule` — Route a prompt to the correct rule skill. Returns structured routing with relevant sections.
- `pix_platform_agent` — rule-platform-agent skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_architect` — rule-architect skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content), scaffold (project structure), interview (context wizard).
- `pix_backend` — rule-backend skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_api_design` — rule-backend-api-design skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_express` — rule-backend-express skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_fastify` — rule-backend-fastify skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_hono` — rule-backend-hono skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_nestjs` — rule-backend-nestjs skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_node` — rule-backend-node skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_backend_security` — rule-backend-security skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_data` — rule-data skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_data_mongodb` — rule-data-mongodb skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_data_mysql` — rule-data-mysql skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_data_postgresql` — rule-data-postgresql skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_data_sql` — rule-data-sql skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_devops` — rule-devops skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_devops_docker` — rule-devops-docker skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_devops_gitlab_ci` — rule-devops-gitlab-ci skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_devops_testing` — rule-devops-testing skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_devops_version` — rule-devops-version skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend` — rule-frontend skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_angular` — rule-frontend-angular skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_astro` — rule-frontend-astro skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_meta_next` — rule-frontend-meta-next skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_meta_nuxt` — rule-frontend-meta-nuxt skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_meta_remix` — rule-frontend-meta-remix skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_react` — rule-frontend-react skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_solidjs` — rule-frontend-solidjs skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_svelte` — rule-frontend-svelte skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_vanilla_reactive` — rule-frontend-vanilla-reactive skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_frontend_vue` — rule-frontend-vue skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_platform` — rule-platform skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_platform_desktop` — rule-platform-desktop skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_platform_expo` — rule-platform-expo skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_platform_library` — rule-platform-library skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_platform_web` — rule-platform-web skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_process` — rule-process skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_process_bmad` — rule-process-bmad skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_process_documentation` — rule-process-documentation skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_process_feature_workflow` — rule-process-feature-workflow skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide` — rule-styleguide skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content), scaffold (project structure).
- `pix_styleguide_a11y` — rule-styleguide-a11y skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_css` — rule-styleguide-css skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_html` — rule-styleguide-html skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_javascript` — rule-styleguide-javascript skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_json` — rule-styleguide-json skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_markdown` — rule-styleguide-markdown skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_naming` — rule-styleguide-naming skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_patterns` — rule-styleguide-patterns skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_styleguide_validation` — rule-styleguide-validation skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain` — rule-toolchain skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_biome` — rule-toolchain-biome skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_eslint` — rule-toolchain-eslint skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_husky` — rule-toolchain-husky skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_parcel` — rule-toolchain-parcel skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_pnpm` — rule-toolchain-pnpm skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_project` — rule-toolchain-project skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_turborepo` — rule-toolchain-turborepo skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_typescript` — rule-toolchain-typescript skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_toolchain_vite` — rule-toolchain-vite skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_ui` — rule-ui skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_ui_design_system` — rule-ui-design-system skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content).
- `pix_search` — Semantic search across ALL rule skills using BM25 ranking. Returns scored, relevant sections.
- `pix_check` — Run guardrail checks on code against any rule skill. Smart iteration: pass previousPassed to skip already-passed checks. Iterate: check → fix → re-check until all pass.
- `pix_scaffold` — Generate project scaffolding files. Returns one or all config file templates.
- `pix_detect` — Detect project framework, TypeScript usage, and build tool from package.json.
- `pix_process_adr` — Save an Architecture Decision Record (ADR) to docs/adr/. Auto-numbers, maintains index, uses Nygard template.
- `pix_fix` — Validate and auto-fix project file tree structure against rule conventions (barrel files, _PascalCase naming, etc.).
- `pix_process_handoff` — Generate a compressed LLM handoff summary from ADR logs and project context. Paste the output into a new chat to resume work seamlessly.
- `pix_component` — Generate component or test templates following rule principles.

### rule skills

- `rule`
- `rule-platform-agent`
- `rule-architect`
- `rule-backend`
- `rule-backend-api-design`
- `rule-backend-express`
- `rule-backend-fastify`
- `rule-backend-hono`
- `rule-backend-nestjs`
- `rule-backend-node`
- `rule-backend-security`
- `rule-data`
- `rule-data-mongodb`
- `rule-data-mysql`
- `rule-data-postgresql`
- `rule-data-sql`
- `rule-data-sqlite`
- `rule-data-duckdb`
- `rule-data-indexed-db`
- `rule-devops`
- `rule-devops-docker`
- `rule-devops-gitlab-ci`
- `rule-devops-testing`
- `rule-devops-version`
- `rule-frontend`
- `rule-frontend-angular`
- `rule-frontend-astro`
- `rule-frontend-meta-next`
- `rule-frontend-meta-nuxt`
- `rule-frontend-meta-remix`
- `rule-frontend-react`
- `rule-frontend-solidjs`
- `rule-frontend-svelte`
- `rule-frontend-vanilla-reactive`
- `rule-frontend-vue`
- `rule-platform`
- `rule-platform-desktop`
- `rule-platform-expo`
- `rule-platform-library`
- `rule-platform-web`
- `rule-process`
- `rule-process-adr`
- `rule-process-bmad`
- `rule-process-documentation`
- `rule-process-feature-workflow`
- `rule-process-handoff`
- `rule-styleguide`
- `rule-styleguide-a11y`
- `rule-styleguide-css`
- `rule-styleguide-html`
- `rule-styleguide-javascript`
- `rule-styleguide-json`
- `rule-styleguide-markdown`
- `rule-styleguide-naming`
- `rule-styleguide-patterns`
- `rule-styleguide-validation`
- `rule-toolchain`
- `rule-toolchain-biome`
- `rule-toolchain-eslint`
- `rule-toolchain-husky`
- `rule-toolchain-parcel`
- `rule-toolchain-pnpm`
- `rule-toolchain-project`
- `rule-toolchain-turborepo`
- `rule-toolchain-typescript`
- `rule-toolchain-vite`
- `rule-ui`
- `rule-ui-design-system`

## Industry-standard output expectations

- Every generated project includes product context, specs, QA, ADR guidance, deployment, security, UI/design-system routing, and rule routing.
- Every template placeholder is either collected by the interview or intentionally left highlighted in generated output.
- Generated files should support any LLM by using explicit skill names, exact MCP tool names, and deterministic quality gates.
