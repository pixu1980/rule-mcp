# 005 — Scaffold Skill Consolidation

- **Date**: 2026-07-10
- **Status**: accepted
- **Tags**: infrastructure, skills, scaffolding, merge
- **Author**: rule-architect

## Context

The `rule-scaffold-*` skill family was fragmented. Four separate scaffolding skills each contained overlapping content:
- `rule-scaffold-backend-node` was a full backend scaffold but lived in `scaffold-*` instead of `backend-*`
- `rule-scaffold-ai-agents` was an orchestrator that delegated to backend + frontend scaffolders
- `rule-scaffold-expo` duplicated content that belonged in `platform-expo`
- `rule-scaffold-frontend-react-vite` mixed three concerns: React setup, Vite config, and generic frontend tooling

Additionally, the `rule-scaffold` umbrella directory itself served no purpose as a skill — the `rule_tool_scaffold` core MCP tool already handles config file generation.

## Decision

### 1. Rename and absorb `scaffold-backend-node` → `backend-node`

The skill moves from `rule-scaffold-backend-node` to `rule-backend-node`, placing it alongside other backend framework skills. No content lost.

### 2. Merge `scaffold-ai-agents` → `ai-agents`

The AI agents scaffold was an orchestrator that delegated to backend + frontend scaffolders. Its monorepo setup content is absorbed into the agents skill.

### 3. Merge `scaffold-expo` → `platform-expo`

All Expo/React Native scaffolding content moves into `rule-platform-expo`, the platform-level skill.

### 4. Split `scaffold-frontend-react-vite` into three targets

| Content | Destination |
|---------|-------------|
| Vite configuration, vitest, build optimization | `rule-toolchain-vite` (new skill) |
| React-specific scaffolding (app bootstrap, routing, API layer) | `rule-frontend-react` (extant skill) |
| Generic frontend project setup (package.json, tsconfig, biome) | `rule-platform-web` (extant skill) |

### 5. Delete all remaining `rule-scaffold-*` directories

The `rule_tool_scaffold` core MCP tool continues to handle `.prettierrc`, `.editorconfig`, `.gitignore` scaffolding.

## Consequences

**Positive:**
- Skills now live in their semantic category (`backend-*`, `platform-*`, `frontend-*`, `toolchain-*`)
- No more `scaffold-*` as a catch-all category
- Vite has its own dedicated skill (framework-agnostic, usable with React, Vue, Svelte, etc.)
- All content preserved — no deletions, only moves and merges

**Negative:**
- Cross-references from the old scaffold directories needed updating across all SKILL.md files
- MCP tool names changed for backend-node and ai-agents

**Migration:**
- Any agent prompts referencing `rule_tool_scaffold_backend_node` must use `rule_tool_backend_node`
- Any agent prompts referencing `rule_tool_scaffold_ai_agents` must use `rule_tool_ai_agents`
- Any agent prompts referencing `rule_tool_scaffold_expo` must use `rule_tool_platform_expo`
- Any agent prompts referencing `rule_tool_scaffold_frontend_react_vite` must use `rule_tool_frontend_react` or `rule_tool_toolchain_vite`
