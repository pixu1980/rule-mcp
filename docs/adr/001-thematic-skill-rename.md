# 001: Thematic Skill Taxonomy Rename

- **Date**: 2026-07-10
- **Status**: accepted
- **Tags**: infrastructure, naming, taxonomy, breaking-change
- **Author**: rule-architect

## Context

The original skill naming was flat: all skills lived under `rule-*` without any thematic grouping. This made it hard to discover related skills, understand the taxonomy at a glance, and navigate the growing collection (now 35 skills). Examples of the problem:

- `rule-frontend-react`, `rule-frontend-vue`, `rule-frontend-angular`, and `rule-frontend-svelte` are all UI frameworks but their names don't reflect this shared category
- `rule-devops-docker`, `rule-devops-testing`, and `rule-devops-gitlab-ci` are all DevOps concerns but appear unrelated
- `rule-platform-desktop`, `rule-platform-library`, and `rule-platform-expo` are project-type/platform skills mixed in with everything else

## Decision

Adopt a prefix-based thematic taxonomy with the following categories:

| Prefix             | Category   | Skills                                                                    |
| ------------------ | ---------- | ------------------------------------------------------------------------- |
| `rule-` (no prefix) | Core tools | ai, backend, check, component, detect, fix, scaffold, search, styleguides |

| `rule-backend-*` | Backend | api-design, security |
| `rule-devops-*` | DevOps | docker, gitlab-ci, testing, version |
| `rule-frontend-*` | UI frameworks | angular, astro, forms, react, solidjs, svelte, vanilla-reactive, vue |
| `rule-meta-*` | Meta-frameworks | next, nuxt, remix |
| `rule-platform-*` | Platforms | desktop, expo, library, web |
| `rule-process-*` | Process | adr, architect, bmad, documentation, feature-workflow, handoff |
| `rule-scaffold-*` | Scaffolding | ai-agents, backend-node, expo, frontend-react-vite |
| `rule-devops-*` | DevOps & engineering | docker, gitlab-ci, testing, version-management |
| `rule-process-*` | Process & docs | feature-workflow, documentation |

Three skills keep their names (they are already correctly categorized or would lose meaning):

- `rule-backend` stays as umbrella (no `backend-backend`)
- `rule-backend-api-design` stays (no `backend-backend-api-design`)

## Consequences

**Positive:**

- Clear visual grouping when listing skills (alphabetically sorted, skills cluster by prefix)
- Easy to discover related skills (`rule-frontend-*` lists all UI frameworks)
- Self-documenting taxonomy: the name tells you the category
- Scalable: new skills slot naturally into existing prefixes

**Negative:**

- All existing MCP tool names change (e.g. `pix_react` → `rule_tool_frontend_react`)
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

Added `rule-backend-*` competitors:

- `rule-backend-nestjs` — NestJS 10+ (modular, decorators, GraphQL)
- `rule-backend-express` — Express.js 5+ (middleware, REST)
- `rule-backend-fastify` — Fastify 5+ (schema validation, performance)
- `rule-backend-hono` — Hono 4+ (edge, multi-runtime, RPC)

### Phase 3: Database skills

Added `rule-database-*`:

- `rule-data-sql` — General SQL best practices
- `rule-data-postgresql` — PostgreSQL 16+ (indexing, replication, pooling)
- `rule-data-mysql` — MySQL 8+ / MariaDB 11+ (InnoDB, replication)
- `rule-data-mongodb` — MongoDB 7+ (schema design, aggregation, sharding)

### Phase 4: Scaffold consolidation

- `rule-meta-*` → `rule-frontend-meta-*` (3 skills)
- `rule-scaffold-backend-node` → `rule-backend-node` + merged content
- `rule-scaffold-expo` → merged into `rule-platform-expo`
- `rule-scaffold-frontend-react-vite` split:
  - Vite config → `rule-toolchain-vite` (new)
  - React scaffolding → `rule-frontend-react` (merged)
  - Generic frontend → `rule-platform-web` (merged)
- All remaining `rule-scaffold*` directories deleted

### Final taxonomy

| Prefix            | Count  | Skills                                                                                                 |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `rule-` (core)     | 9      | ai, backend, check, component, detect, fix, scaffold, search, styleguides                              |
| `rule-backend-*`   | 7      | api-design, express, fastify, hono, nestjs, node, security                                             |
| `rule-database-*`  | 4      | mongodb, mysql, postgresql, sql                                                                        |
| `rule-devops-*`    | 4      | docker, gitlab-ci, testing, version                                                                    |
| `rule-frontend-*`  | 11     | angular, astro, forms, meta-next, meta-nuxt, meta-remix, react, solidjs, svelte, vanilla-reactive, vue |
| `rule-platform-*`  | 4      | desktop, expo, library, web                                                                            |
| `rule-process-*`   | 6      | adr, architect, bmad, documentation, feature-workflow, handoff                                         |
| `rule-toolchain-*` | 1      | vite                                                                                                   |
| **Total**         | **46** |                                                                                                        |
