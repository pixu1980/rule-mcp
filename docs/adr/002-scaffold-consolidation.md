# 002: Scaffold Skill Consolidation

- **Date**: 2026-07-10
- **Status**: accepted
- **Tags**: infrastructure, skills, scaffolding, merge
- **Author**: pix-architect

## Context

The `pix-scaffold-*` skill family was fragmented. Four separate scaffolding skills each contained overlapping content:
- `pix-scaffold-backend-node` was a full backend scaffold but lived in `scaffold-*` instead of `backend-*`
- `pix-scaffold-ai-agents` was an orchestrator that delegated to backend + frontend scaffolders
- `pix-scaffold-expo` duplicated content that belonged in `platform-expo`
- `pix-scaffold-frontend-react-vite` mixed three concerns: React setup, Vite config, and generic frontend tooling

Additionally, the `pix-scaffold` umbrella directory itself served no purpose as a skill — the `pix_tool_scaffold` core MCP tool already handles config file generation.

## Decision

### 1. Rename and absorb `scaffold-backend-node` → `backend-node`

The skill moves from `pix-scaffold-backend-node` to `pix-backend-node`, placing it alongside other backend framework skills. No content lost.

### 2. Merge `scaffold-ai-agents` → `ai-agents`

The AI agents scaffold was an orchestrator that delegated to backend + frontend scaffolders. Its monorepo setup content is absorbed into the agents skill.

### 3. Merge `scaffold-expo` → `platform-expo`

All Expo/React Native scaffolding content moves into `pix-platform-expo`, the platform-level skill.

### 4. Split `scaffold-frontend-react-vite` into three targets

| Content | Destination |
|---------|-------------|
| Vite configuration, vitest, build optimization | `pix-toolchain-vite` (new skill) |
| React-specific scaffolding (app bootstrap, routing, API layer) | `pix-frontend-react` (extant skill) |
| Generic frontend project setup (package.json, tsconfig, biome) | `pix-platform-web` (extant skill) |

### 5. Delete all remaining `pix-scaffold-*` directories

The `pix_tool_scaffold` core MCP tool continues to handle `.prettierrc`, `.editorconfig`, `.gitignore` scaffolding.

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
- Any agent prompts referencing `pix_tool_scaffold_backend_node` must use `pix_tool_backend_node`
- Any agent prompts referencing `pix_tool_scaffold_ai_agents` must use `pix_tool_ai_agents`
- Any agent prompts referencing `pix_tool_scaffold_expo` must use `pix_tool_platform_expo`
- Any agent prompts referencing `pix_tool_scaffold_frontend_react_vite` must use `pix_tool_frontend_react` or `pix_tool_toolchain_vite`
