# 001: Thematic Skill Taxonomy Rename

- **Date**: 2026-07-10
- **Status**: accepted
- **Tags**: infrastructure, naming, taxonomy, breaking-change
- **Author**: pix-architect

## Context

The original skill naming was flat: all skills lived under `pix-*` without any thematic grouping. This made it hard to discover related skills, understand the taxonomy at a glance, and navigate the growing collection (now 35 skills). Examples of the problem:

- `pix-frontend-react`, `pix-frontend-vue`, `pix-frontend-angular`, and `pix-frontend-svelte` are all UI frameworks but their names don't reflect this shared category
- `pix-devops-docker`, `pix-devops-testing`, and `pix-devops-gitlab-ci` are all DevOps concerns but appear unrelated
- `pix-platform-desktop`, `pix-platform-library`, and `pix-platform-expo` are project-type/platform skills mixed in with everything else

## Decision

Adopt a prefix-based thematic taxonomy with the following categories:

| Prefix | Category | Skills |
|--------|----------|--------|
| `pix-` (no prefix) | Core tools | ai, backend, check, component, detect, fix, scaffold, search, styleguides |
| `pix-galaxy-*` | AI | agent-core |
| `pix-backend-*` | Backend | api-design, security |
| `pix-devops-*` | DevOps | docker, gitlab-ci, testing, version |
| `pix-frontend-*` | UI frameworks | angular, astro, forms, react, solidjs, svelte, vanilla-reactive, vue |
| `pix-meta-*` | Meta-frameworks | next, nuxt, remix |
| `pix-platform-*` | Platforms | desktop, expo, library, web |
| `pix-process-*` | Process | adr, architect, bmad, documentation, feature-workflow, handoff |
| `pix-scaffold-*` | Scaffolding | ai-agents, backend-node, expo, frontend-react-vite |
| `pix-devops-*` | DevOps & engineering | docker, gitlab-ci, testing, version-management |
| `pix-process-*` | Process & docs | feature-workflow, documentation |

Three skills keep their names (they are already correctly categorized or would lose meaning):
- `pix-backend` stays as umbrella (no `backend-backend`)
- `pix-backend-api-design` stays (no `backend-backend-api-design`)

## Consequences

**Positive:**
- Clear visual grouping when listing skills (alphabetically sorted, skills cluster by prefix)
- Easy to discover related skills (`pix-frontend-*` lists all UI frameworks)
- Self-documenting taxonomy: the name tells you the category
- Scalable: new skills slot naturally into existing prefixes

**Negative:**
- All existing MCP tool names change (e.g. `pix_react` → `pix_frontend_react`)
- All documentation references must be updated (README, docs/TOOLS.md, cross-references)
- All cross-reference links between SKILL.md files must be updated
- Agents with hardcoded tool names will need their prompts updated

**Migration:**
- The rename is performed atomically in a single commit
- All 35 skill directories, all SKILL.md files, all docs, and the README are updated together
- The MCP tool names change automatically (derived from directory names)
- No code changes needed in the router or skill loader — tool names are derived from directory basenames


## Subsequent Updates (2026-07-10)

### Phase 2: Backend framework skills

Added `pix-backend-*` competitors:
- `pix-backend-nestjs` — NestJS 10+ (modular, decorators, GraphQL)
- `pix-backend-express` — Express.js 5+ (middleware, REST)
- `pix-backend-fastify` — Fastify 5+ (schema validation, performance)
- `pix-backend-hono` — Hono 4+ (edge, multi-runtime, RPC)

### Phase 3: Database skills

Added `pix-database-*`:
- `pix-data-sql` — General SQL best practices
- `pix-data-postgresql` — PostgreSQL 16+ (indexing, replication, pooling)
- `pix-data-mysql` — MySQL 8+ / MariaDB 11+ (InnoDB, replication)
- `pix-data-mongodb` — MongoDB 7+ (schema design, aggregation, sharding)

### Phase 4: Scaffold consolidation

- `pix-meta-*` → `pix-frontend-meta-*` (3 skills)
- `pix-scaffold-backend-node` → `pix-backend-node` + merged content
- `pix-galaxy-agent-core` → `pix-galaxy-agents` + merged scaffold-ai-agents content
- `pix-scaffold-expo` → merged into `pix-platform-expo`
- `pix-scaffold-frontend-react-vite` split:
  - Vite config → `pix-toolchain-vite` (new)
  - React scaffolding → `pix-frontend-react` (merged)
  - Generic frontend → `pix-platform-web` (merged)
- All remaining `pix-scaffold*` directories deleted

### Final taxonomy

| Prefix | Count | Skills |
|--------|-------|--------|
| `pix-` (core) | 9 | ai, backend, check, component, detect, fix, scaffold, search, styleguides |
| `pix-galaxy-*` | 1 | agents |
| `pix-backend-*` | 7 | api-design, express, fastify, hono, nestjs, node, security |
| `pix-database-*` | 4 | mongodb, mysql, postgresql, sql |
| `pix-devops-*` | 4 | docker, gitlab-ci, testing, version |
| `pix-frontend-*` | 11 | angular, astro, forms, meta-next, meta-nuxt, meta-remix, react, solidjs, svelte, vanilla-reactive, vue |
| `pix-platform-*` | 4 | desktop, expo, library, web |
| `pix-process-*` | 6 | adr, architect, bmad, documentation, feature-workflow, handoff |
| `pix-toolchain-*` | 1 | vite |
| **Total** | **47** | |
