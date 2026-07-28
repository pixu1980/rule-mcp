# Changelog

All notable changes to rule-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial MCP SDK port (Phase 0) — replaces hand-rolled protocol
- 22 MCP tools: rule-ai, 16 skill tools, pix_search, pix_component, pix_check, pix_scaffold, pix_architect, pix_detect
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
- Architecture: monolithic cli.js → modular cli/, tools/, core/, transport/
- Module sizes: all behavioral modules ≤300 lines
- YAML frontmatter parsing: handles multi-line descriptions
- Scoring algorithm: holistic word-match scoring with framework bias

### Fixed
- Galaxy routing: multi-skill queries now return styleguides for accessibility
- Section extraction: YAML frontmatter excluded from content matching
- Stopword filtering: added generic words to reduce routing noise
