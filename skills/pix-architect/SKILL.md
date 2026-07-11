---
name: pix-architect
description: >
  Enterprise architecture wizard for the full pix skill and MCP tool ecosystem.
  Use when starting a project, restructuring architecture, generating .context,
  mapping decisions to skills/tools, or onboarding any LLM to a repository.
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

# pix-architect — Architecture command center

`pix-architect` turns product intent into an implementation-ready architecture package. It must account for every available pix skill and deterministic MCP tool, then emit `.context/` docs that any LLM can follow without hidden assumptions.

## Operating principles

1. **Single source of routing truth** — Start from [`pix`](../pix/SKILL.md), then map every architecture choice to exact skills and tools.
2. **Spec-driven by default** — Generate product, domain, architecture, quality, deployment, security, ADR, and pix-routing specs.
3. **SOLID boundaries** — Separate platform, frontend, backend, data, DevOps, process, styleguide, and toolchain concerns.
4. **Deterministic tooling first** — Prefer MCP tools before free-form generation: detect, search, scaffold/template, validate, ADR, fix, handoff.
5. **LLM portability** — Output exact skill names, exact tool names, explicit quality gates, and no model-specific assumptions.

## Tool workflow

| Phase | Tool | Purpose |
|-------|------|---------|
| Discover | `pix_detect` | Detect framework, TypeScript, build tool, and suggested canonical skills/tools. |
| Route | `pix` | Route ambiguous work to the smallest relevant skill set. |
| Research | `pix_search` | Find the relevant sections across all skills. |
| Generate | `pix_component / pix_scaffold` | Create deterministic components, tests, config, or scaffold files. |
| Validate | `pix_check` | Run guardrails and iterate with previousPassed. |
| Fix | `pix_fix` | Repair file-tree naming/barrel conventions. |
| Decide | `pix_process_adr` | Record architecture decisions in docs/adr. |
| Transfer | `pix_process_handoff` | Generate a compact continuation summary. |

## Enforcement architecture

Every generated architecture must define both gates:

- **Pre-processing gate**: validate and normalize tool input; reject blank prompts, unsafe object keys, control characters, oversized payloads, excessive nesting, and undeclared routing assumptions.
- **Post-processing gate**: validate MCP result shape, verify routed skill/tool identifiers against registries, append model-visible compliance contract, and attach `_meta.pixEnforcement` audit data.
- **Code gate**: `pix_check` failures are blocking. Require complete implementation, explicit error handling, manifest-verified dependencies when context exists, and zero ignored diagnostics.
- **Evidence gate**: never claim tests, typechecks, files, APIs, or dependencies without tool or repository evidence.
- **Decision gate**: structural enforcement changes require `pix_process_adr` before completion.

## Agent command distribution

Use reusable command where host supports it:

| Host | Installed integration |
|------|-----------------------|
| Pi | `~/.pi/agent/prompts/pix-galaxy-mcp.md` → `/pix-galaxy-mcp` |
| Claude Code | `~/.claude/commands/pix-galaxy-mcp.md` → `/pix-galaxy-mcp` (legacy-compatible command path) |
| Gemini CLI | `~/.gemini/commands/pix-galaxy-mcp.toml` → `/pix-galaxy-mcp` |
| Cursor | `.cursor/commands/pix-galaxy-mcp.md` → project command |
| GitHub Copilot CLI | `~/.copilot/agents/pix-galaxy-mcp.agent.md` → select through `/agent` |
| Codex CLI | Use installed `pix` skill; custom prompt command support is version-dependent and not forced. |

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

## Complete skill coverage

Use this table to ensure the architecture package references all relevant skills.
### AI

| Skill | Use in architecture when |
|-------|--------------------------|
| [pix-platform-agent](../pix-platform-agent/SKILL.md) | Specialized pix skill. |

### Backend

| Skill | Use in architecture when |
|-------|--------------------------|
| [pix-backend](../pix-backend/SKILL.md) | Specialized pix skill. |
| [pix-backend-api-design](../pix-backend-api-design/SKILL.md) | Specialized pix skill. |
| [pix-backend-express](../pix-backend-express/SKILL.md) | Specialized pix skill. |
| [pix-backend-fastify](../pix-backend-fastify/SKILL.md) | Specialized pix skill. |
| [pix-backend-hono](../pix-backend-hono/SKILL.md) | Specialized pix skill. |
| [pix-backend-nestjs](../pix-backend-nestjs/SKILL.md) | Specialized pix skill. |
| [pix-backend-node](../pix-backend-node/SKILL.md) | Specialized pix skill. |
| [pix-backend-security](../pix-backend-security/SKILL.md) | Specialized pix skill. |

### Data

| Skill | Use in architecture when |
|-------|--------------------------|
| [pix-data](../pix-data/SKILL.md) | Specialized pix skill. |
| [pix-data-mongodb](../pix-data-mongodb/SKILL.md) | Specialized pix skill. |
| [pix-data-mysql](../pix-data-mysql/SKILL.md) | Specialized pix skill. |
| [pix-data-postgresql](../pix-data-postgresql/SKILL.md) | Specialized pix skill. |
| [pix-data-sql](../pix-data-sql/SKILL.md) | Specialized pix skill. |

### DevOps

| Skill | Use in architecture when |
|-------|--------------------------|
| [pix-devops](../pix-devops/SKILL.md) | Specialized pix skill. |
| [pix-devops-docker](../pix-devops-docker/SKILL.md) | Specialized pix skill. |
| [pix-devops-gitlab-ci](../pix-devops-gitlab-ci/SKILL.md) | Specialized pix skill. |
| [pix-devops-testing](../pix-devops-testing/SKILL.md) | Specialized pix skill. |
| [pix-devops-version](../pix-devops-version/SKILL.md) | Specialized pix skill. |

### Dispatcher

| Skill | Use in architecture when |
|-------|--------------------------|
| [pix](../pix/SKILL.md) | Specialized pix skill. |

### Frontend

| Skill | Use in architecture when |
|-------|--------------------------|
| [pix-frontend](../pix-frontend/SKILL.md) | Specialized pix skill. |
| [pix-frontend-angular](../pix-frontend-angular/SKILL.md) | Specialized pix skill. |
| [pix-frontend-astro](../pix-frontend-astro/SKILL.md) | Specialized pix skill. |
| [pix-frontend-meta-next](../pix-frontend-meta-next/SKILL.md) | Specialized pix skill. |
| [pix-frontend-meta-nuxt](../pix-frontend-meta-nuxt/SKILL.md) | Specialized pix skill. |
| [pix-frontend-meta-remix](../pix-frontend-meta-remix/SKILL.md) | Specialized pix skill. |
| [pix-frontend-react](../pix-frontend-react/SKILL.md) | Specialized pix skill. |
| [pix-frontend-solidjs](../pix-frontend-solidjs/SKILL.md) | Specialized pix skill. |
| [pix-frontend-svelte](../pix-frontend-svelte/SKILL.md) | Specialized pix skill. |
| [pix-frontend-vanilla-reactive](../pix-frontend-vanilla-reactive/SKILL.md) | Specialized pix skill. |
| [pix-frontend-vue](../pix-frontend-vue/SKILL.md) | Specialized pix skill. |

### Platform

| Skill | Use in architecture when |
|-------|--------------------------|
| [pix-platform](../pix-platform/SKILL.md) | Specialized pix skill. |
| [pix-platform-desktop](../pix-platform-desktop/SKILL.md) | Specialized pix skill. |
| [pix-platform-expo](../pix-platform-expo/SKILL.md) | Specialized pix skill. |
| [pix-platform-library](../pix-platform-library/SKILL.md) | Specialized pix skill. |
| [pix-platform-web](../pix-platform-web/SKILL.md) | Specialized pix skill. |

### Process

| Skill | Use in architecture when |
|-------|--------------------------|
| [pix-process](../pix-process/SKILL.md) | Specialized pix skill. |
| [pix-process-adr](../pix-process-adr/SKILL.md) | Specialized pix skill. |
| [pix-process-bmad](../pix-process-bmad/SKILL.md) | Specialized pix skill. |
| [pix-process-documentation](../pix-process-documentation/SKILL.md) | Specialized pix skill. |
| [pix-process-feature-workflow](../pix-process-feature-workflow/SKILL.md) | Specialized pix skill. |
| [pix-process-handoff](../pix-process-handoff/SKILL.md) | Specialized pix skill. |

### Styleguide

| Skill | Use in architecture when |
|-------|--------------------------|
| [pix-styleguide](../pix-styleguide/SKILL.md) | Specialized pix skill. |
| [pix-styleguide-a11y](../pix-styleguide-a11y/SKILL.md) | Specialized pix skill. |
| [pix-styleguide-css](../pix-styleguide-css/SKILL.md) | Specialized pix skill. |
| [pix-styleguide-html](../pix-styleguide-html/SKILL.md) | Specialized pix skill. |
| [pix-styleguide-javascript](../pix-styleguide-javascript/SKILL.md) | Specialized pix skill. |
| [pix-styleguide-json](../pix-styleguide-json/SKILL.md) | Specialized pix skill. |
| [pix-styleguide-markdown](../pix-styleguide-markdown/SKILL.md) | Specialized pix skill. |
| [pix-styleguide-naming](../pix-styleguide-naming/SKILL.md) | Specialized pix skill. |
| [pix-styleguide-patterns](../pix-styleguide-patterns/SKILL.md) | Specialized pix skill. |
| [pix-styleguide-validation](../pix-styleguide-validation/SKILL.md) | Specialized pix skill. |

### Toolchain

| Skill | Use in architecture when |
|-------|--------------------------|
| [pix-toolchain](../pix-toolchain/SKILL.md) | Specialized pix skill. |
| [pix-toolchain-biome](../pix-toolchain-biome/SKILL.md) | Specialized pix skill. |
| [pix-toolchain-eslint](../pix-toolchain-eslint/SKILL.md) | Specialized pix skill. |
| [pix-toolchain-husky](../pix-toolchain-husky/SKILL.md) | Specialized pix skill. |
| [pix-toolchain-parcel](../pix-toolchain-parcel/SKILL.md) | Specialized pix skill. |
| [pix-toolchain-pnpm](../pix-toolchain-pnpm/SKILL.md) | Specialized pix skill. |
| [pix-toolchain-project](../pix-toolchain-project/SKILL.md) | Specialized pix skill. |
| [pix-toolchain-turborepo](../pix-toolchain-turborepo/SKILL.md) | Specialized pix skill. |
| [pix-toolchain-typescript](../pix-toolchain-typescript/SKILL.md) | Specialized pix skill. |
| [pix-toolchain-vite](../pix-toolchain-vite/SKILL.md) | Specialized pix skill. |
### UI

Design and route visible interface work while preserving pix implementation constraints.

| Skill | Tool | Frameworks | Use when |
|-------|------|------------|----------|
| [pix-ui](../pix-ui/SKILL.md) | `pix_ui` | all | Umbrella skill for all user-interface work in the pix ecosystem. Use when a task affects visual UI, component composition... |
| [pix-ui-design-system](../pix-ui-design-system/SKILL.md) | `pix_ui_design_system` | all | Distinctive production-grade UI design direction for pix projects. Use when designing pages, components, dashboards... |

## Generated `.context/` output

The context interview must generate these industry-standard outputs from `assets/context-server/templates.json`:

- `README.md` — documentation map and project frame
- `ROADMAP.md` — milestone tracker
- `project-context.md` — compact AI working context
- `analysis/functional-analysis.md` and `analysis/implementation-roadmap.md` — product analysis and execution order
- `specs/00-sdd.md` through `specs/10-pix-routing.md` — SDD, product, domain, rules, architecture, quality, ADRs, deployment, security, and pix routing
- `schemas/ruleset.schema.json` — validation contract for reusable domain rules
- `qa/checklist.md` — manual QA and a11y/resilience checks
- concrete support docs such as `constraints.concrete.md` and `use-cases.concrete.md`

## Placeholder and inventory governance

- `assets/context-server/placeholders.json` is the interview schema.
- `assets/context-server/templates.json` is the generated `.context/` source.
- [`knowledge/context-inventory.md`](./knowledge/context-inventory.md) is the census of generated files, placeholders, tools, and skill routing.
- Every placeholder used by a template must be present in `placeholders.json`.
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

- [pix](../pix/SKILL.md) — Central skill and tool dispatcher
- [pix-process-adr](../pix-process-adr/SKILL.md) — Architecture Decision Records
- [pix-process-documentation](../pix-process-documentation/SKILL.md) — Documentation standards
- [pix-devops-testing](../pix-devops-testing/SKILL.md) — Testing and coverage gates
- [pix-toolchain-project](../pix-toolchain-project/SKILL.md) — Project configuration baseline
