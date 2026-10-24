# 004 - Thematic Skill Taxonomy Rename

- **Date**: 2026-07-10
- **Status**: accepted
- **Tags**: infrastructure, naming, taxonomy, breaking-change
- **Author**: rule-mcp-architect

## Context

The original skill naming was flat: all skills lived under `rule-mcp-*` without any thematic grouping. This made it hard to discover related skills, understand the taxonomy at a glance, and navigate the growing collection (now 35 skills). Examples of the problem:

- `rule-mcp-frontend-react`, `rule-mcp-frontend-vue`, `rule-mcp-frontend-angular`, and `rule-mcp-frontend-svelte` are all UI frameworks but their names don't reflect this shared category
- `rule-mcp-devops-docker`, `rule-mcp-devops-testing`, and `rule-mcp-devops-gitlab-ci` are all DevOps concerns but appear unrelated
- `rule-mcp-platform-desktop`, `rule-mcp-platform-library`, and `rule-mcp-platform-expo` are project-type/platform skills mixed in with everything else

## Decision

Adopt a prefix-based thematic taxonomy with the following categories:

| Prefix                  | Category   | Skills                                                                    |
| ----------------------- | ---------- | ------------------------------------------------------------------------- |
| `rule-mcp-` (no prefix) | Core tools | ai, backend, check, component, detect, fix, scaffold, search, styleguides |

| `rule-mcp-backend-*` | Backend | api-design, security |
| `rule-mcp-devops-*` | DevOps | docker, gitlab-ci, testing, version |
| `rule-mcp-frontend-*` | UI frameworks | angular, astro, forms, react, solidjs, svelte, vanilla-reactive, vue |
| `rule-mcp-meta-*` | Meta-frameworks | next, nuxt, remix |
| `rule-mcp-platform-*` | Platforms | desktop, expo, library, web |
| `rule-mcp-process-*` | Process | adr, architect, bmad, documentation, feature-workflow, handoff |
| `rule-mcp-scaffold-*` | Scaffolding | ai-agents, backend-node, expo, frontend-react-vite |
| `rule-mcp-devops-*` | DevOps & engineering | docker, gitlab-ci, testing, version-management |
| `rule-mcp-process-*` | Process & docs | feature-workflow, documentation |

Three skills keep their names (they are already correctly categorized or would lose meaning):

- `rule-mcp-backend` stays as umbrella (no `backend-backend`)
- `rule-mcp-backend-api-design` stays (no `backend-backend-api-design`)

## Consequences

**Positive:**

- Clear visual grouping when listing skills (alphabetically sorted, skills cluster by prefix)
- Easy to discover related skills (`rule-mcp-frontend-*` lists all UI frameworks)
- Self-documenting taxonomy: the name tells you the category
- Scalable: new skills slot naturally into existing prefixes

**Negative:**

- All existing MCP tool names change (e.g. `rule_tool_react` -> `rule_tool_frontend_react`)
- All documentation references must be updated (README, docs/TOOLS.md, cross-references)
- All cross-reference links between SKILL.md files must be updated
- Agents with hardcoded tool names will need their prompts updated

**Migration:**

- The rename is performed atomically in a single commit
- All 35 skill directories, all SKILL.md files, all docs, and the README are updated together
- The MCP tool names change automatically (derived from directory names)
- No code changes needed in the router or skill loader - tool names are derived from directory basenames

## Subsequent Updates (2026-07-10)

### Phase 2: Backend framework skills

Added `rule-mcp-backend-*` competitors:

- `rule-mcp-backend-nestjs` - NestJS 10+ (modular, decorators, GraphQL)
- `rule-mcp-backend-express` - Express.js 5+ (middleware, REST)
- `rule-mcp-backend-fastify` - Fastify 5+ (schema validation, performance)
- `rule-mcp-backend-hono` - Hono 4+ (edge, multi-runtime, RPC)

### Phase 3: Database skills

Added `rule-mcp-database-*`:

- `rule-mcp-data-sql` - General SQL best practices
- `rule-mcp-data-postgresql` - PostgreSQL 16+ (indexing, replication, pooling)
- `rule-mcp-data-mysql` - MySQL 8+ / MariaDB 11+ (InnoDB, replication)
- `rule-mcp-data-mongodb` - MongoDB 7+ (schema design, aggregation, sharding)

### Phase 4: Scaffold consolidation

- `rule-mcp-meta-*` -> `rule-mcp-frontend-meta-*` (3 skills)
- `rule-mcp-scaffold-backend-node` -> `rule-mcp-backend-node` + merged content
- `rule-mcp-scaffold-expo` -> merged into `rule-mcp-platform-expo`
- `rule-mcp-scaffold-frontend-react-vite` split:
  - Vite config -> `rule-mcp-toolchain-vite` (new)
  - React scaffolding -> `rule-mcp-frontend-react` (merged)
  - Generic frontend -> `rule-mcp-platform-web` (merged)
- All remaining `rule-mcp-scaffold*` directories deleted

### Final taxonomy

| Prefix                 | Count  | Skills                                                                                                 |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `rule-mcp-` (core)     | 9      | ai, backend, check, component, detect, fix, scaffold, search, styleguides                              |
| `rule-mcp-backend-*`   | 7      | api-design, express, fastify, hono, nestjs, node, security                                             |
| `rule-mcp-database-*`  | 4      | mongodb, mysql, postgresql, sql                                                                        |
| `rule-mcp-devops-*`    | 4      | docker, gitlab-ci, testing, version                                                                    |
| `rule-mcp-frontend-*`  | 11     | angular, astro, forms, meta-next, meta-nuxt, meta-remix, react, solidjs, svelte, vanilla-reactive, vue |
| `rule-mcp-platform-*`  | 4      | desktop, expo, library, web                                                                            |
| `rule-mcp-process-*`   | 6      | adr, architect, bmad, documentation, feature-workflow, handoff                                         |
| `rule-mcp-toolchain-*` | 1      | vite                                                                                                   |
| **Total**              | **46** |                                                                                                        |
