# Changelog

All notable changes to rule-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Prompts: MCP registry extended from 5 to **26 prompts** — 5 one-shot workflow prompts (`rule-setup-project`, `rule-new-feature`, `rule-pull-request`, `rule-write-tests`, `rule-handoff`), 16 area prompts (`rule-area-*`, one per tool area), plus the 5 legacy prompts updated to the shared rules (route via `pix_tool`, TDD/a11y baselines or explicit user ask, commit message with mandatory scope). Argument completion for the new prompt schemas in server.js
- Initial MCP SDK port (Phase 0) — replaces hand-rolled protocol
- 22 MCP tools: rule-mcp, 16 skill tools, pix_search, pix_component, pix_check, pix_scaffold, pix_architect, pix_detect
- Context-aware skill routing with framework-biased scoring
- Project framework auto-detector (pix_detect)
- BM25 full-text search across all skills
- Multi-file component generation (React, Vue, Svelte, vanilla)
- Guardrails engine with smart iteration (skip passed checks)
- SSE transport for IDE integration
- HTTPS support with auto-generated self-signed certs
- Sandbox/resilience layer
- CLI installer for 15+ agents
- Homebrew formula
- Docker image (ghcr.io)
- Windows package manifests (Winget, Scoop)
- CI/CD pipeline with lint, test, audit, release

### Changed
- Tools: all 97 MCP tools renamed with the `rule_tool_` prefix (`rule` → `pix_tool`, `pix_gateway` → `rule_tool_gateway`, `pix_frontend_react` → `rule_tool_frontend_react`, …). Dispatcher/action allowlist, cache exclusions, agent-command templates, installer rules, and docs updated accordingly
- Self-update: check now runs on every tool invocation (throttled, fire-and-forget) instead of once per session — configurable via `RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS` (default 60s, `0` = every call); the git fetch is async so the tool call never blocks (ADR 023)
- Architecture: monolithic cli.js → modular cli/, tools/, core/, transport/
- Module sizes: all behavioral modules ≤300 lines
- YAML frontmatter parsing: handles multi-line descriptions
- Scoring algorithm: holistic word-match scoring with framework bias
- Skill rename: `rule-mcp-agents` → `rule-ai-agents` (tool `pix_galaxy_agents` → `pix_ai_agents`)
- New collector skill `rule-ai` routing AI/agent work to `rule-ai-agents` and `rule-platform-agent` (mirrors `rule-frontend` pattern)
- Router: AI domain classification added to prompt routing; `rule-ai` treated as collector in framework bias
- Detector: `@rule/rule-mcp-core` dependency maps to `agents` framework → `rule-ai-agents`
- New skill `rule-toolchain-commits` (tool `pix_toolchain_commits`): atomic Conventional Commits with mandatory scope; commit/push prompts route to it deterministically via a new git domain classification

### Fixed
- Security: patched transitive vulnerabilities via pnpm overrides — fast-uri ≥3.1.4 (GHSA-v2hh-gcrm-f6hx), @hono/node-server ≥2.0.5 (GHSA-frvp-7c67-39w9), brace-expansion ≥1.1.17 (GHSA-mh99-v99m-4gvg)
- Security: bumped @modelcontextprotocol/sdk 1.29.0 → 1.30.0 (resolves @hono/node-server 2.x compatibility; `pnpm audit` now clean)
- Galaxy routing: multi-skill queries now return styleguides for accessibility
- Section extraction: YAML frontmatter excluded from content matching
- Stopword filtering: added generic words to reduce routing noise
