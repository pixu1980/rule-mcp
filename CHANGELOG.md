# Changelog

All notable changes to rule-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **Write containment:** `pix_apply` now validates the project root itself, refuses the filesystem root, home directory, system directories, and absolute/`..`/symlink-escape paths. Sensitive destinations (`.git`, `.ssh`, `.gnupg`, shell rc files, key material) are blocked by destination, not just by content. Receipts are path-bound with length-prefixed canonical digests — a receipt for one path never authorises another.
- **Interview server CSRF:** Both `rule-architect` interview servers now enforce `Sec-Fetch-Site` + `Origin` + `Host` on every `/api/*` request. A cross-origin POST to `/api/generate` is refused even though the browser allows it as a CORS simple request.
- **Self-update hardening:** The upstream remote is verified BEFORE any fetch or merge. Only the repository declared in `server.json` (or an explicit `RULE_MCP_UPDATE_REMOTE`) is trusted. No trust-on-first-use. `RULE_MCP_UPDATE_REQUIRE_SIGNATURE=1` adds `git verify-commit`. Phantom updates (branch ahead of upstream, `--ff-only` exits 0 without moving HEAD) are no longer reported.
- **Container hardening:** The Docker image drops to `USER node` before `CMD`, installs with `--ignore-scripts`, and sets `RULE_MCP_DOCKER=1`. The compose file publishes only on `127.0.0.1:37999:37999`.

### Changed

- **Tool surface:** Only `./skills` is scanned for tool registration. Nothing in `~/.agents/skills` can add, rename, or shadow a tool. The `plugin.js` import from the home directory is removed (audit finding 15). Tools reduced from ~176 to 88.
- **Architect lifecycle:** Interview servers are tracked in a registry keyed by target directory, reused instead of duplicated, output-capped at 64 KB, killed after 30 minutes and on exit/SIGINT/SIGTERM. `pix_architect` added to the cache denylist so a replayed result never hands out a dead port.
- **Agent commands registry:** Clean `/rule-*` commands are now driven by a single registry (`agent-command-targets.js` + `agent-commands.js`) covering 13 agent/IDE combinations with 5 render formats. The CLI gains `agent-commands` with `--list`, `--targets`, `--sync`, and per-directory generation.

- Tooling: repository lint migrated to **ESLint 10 flat config** (`eslint.config.mjs` + `@eslint/js` + `eslint-plugin-unicorn`), replacing the legacy `.eslintrc.json`. Applied the unicorn autofix pass (modern idioms: `node:` protocol, `replaceAll`, `flatMap`, `new` for builtins, ternary/curly/assert consistency) and fixed real issues it surfaced (`no-undef` bash-completion template interpolation, `no-empty` catches, `no-useless-escape`, dead assignments). Opinionated unicorn rules (`no-null`, `no-array-reduce`, `name-replacements`, `import-style`, …) are scoped/tuned per ADR 028; CI lint step no longer passes `--ext` (removed in ESLint 10). `pnpm lint`: 0 errors / 48 warnings. Scaffold guardrail now verifies `eslint.config.mjs`.

### Fixed

- Installer: uninstall→install cycles no longer accumulate blank lines in agent instruction files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `.cursorrules`). `install.sh` normalizes trailing newlines and inserts exactly one separator via `append_rules_block`; `uninstall.sh` collapses trailing blank lines after removing the rules block
- Installer: reinstall no longer drops per-server user keys from JSON MCP configs (`upsertJsonServer`/`upsertVscode` now merge instead of replacing) — a user-set `toolPrefix` on the `rule-mcp` entry survives uninstall+install
- Installer: fresh pi installs now default to `toolPrefix: "none"` — bare `rule-tool-*` tools and `/rule-*` prompts instead of the `mcp__pix_galaxy_mcp__*` prefix form

### Added

- Prompts: MCP registry extended from 5 to **24 prompts**, listed alphabetically — 5 one-shot workflow prompts (`rule-setup-project`, `rule-new-feature`, `rule-pull-request`, `rule-write-tests`, `rule-handoff`), 16 area prompts (`rule-*`, one per tool area), plus the 3 legacy prompts (`rule-code-review`, `rule-a11y-audit`, `rule-architect-scaffold`) updated to the shared rules (route via `pix_tool`, TDD/a11y baselines or explicit user ask, commit message with mandatory scope). `rule-a11y-test` and `rule-a11y-review` were merged into `rule-a11y-audit` (review + test generation), and `rule-generate-component` was removed. Argument completion for the new prompt schemas in server.js
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
