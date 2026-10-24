# 079: Add the OSS Architect review persona

- **Date**: 2026-09-10
- **Status**: superseded
- **Tags**: persona, oss, open-source, governance, licensing, community
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

> Superseded by [ADR 093](093-add-an-open-source-steward-persona-for-governance-contributors-and-donors.md). The develop branch added its own OSS persona, Open Source Steward, and that is the one the merge kept.

## Context

The persona catalog is filesystem-driven (src/roles/*.md): adding a persona is adding one file with frontmatter and a lenses list in the body; the server loads it at startup and generates the plan/audit/review prompts, the slash commands, and the census rows. An interview with the developer defined the persona: id oss, title OSS Architect, 25 years of experience, layer process, status active, standalone; lenses covering licensing (SPDX conformance, stack compatibility, dual licensing, headers), governance (decision model, documented process, maintainer roles, independence), contributing (guides and triage, CI gates, CLA/DCO, review process), funding (platforms, transparency, sustainability, alternatives), plus security disclosure, release process, community health, and contributor onboarding; deliverables mix checklists, gap analysis, prioritized roadmap, and a maturity score.

## Decision

Add the OSS Architect persona (id: oss) as src/roles/oss.md, status active, layer process, 25 years, 12 lenses focused on the project itself (own license, governance, contributing, funding, disclosure, release, community health). Standard schema: no code change; registry tests and census updated to the new counts (76 prompts, 57 persona prompts, 77 commands).

## Consequences

Positive: the persona is drop-in (one file in src/roles/, no code change): it generates three persona prompts (rule-mcp-persona-oss-plan, rule-mcp-persona-oss-audit, rule-mcp-persona-oss-review) and three slash commands; docs/13-personas.md and the census blocks are regenerated; README now advertises 76 prompts. The licensing lens stays on the project's own license axis (SPDX, dual license, open core) without overlapping supply-chain's dependency axis. Negative: the counts change (73 to 76 prompts, 74 to 77 commands) and the two hardcoded arrays in the registry tests were updated; the persona carries 12 lenses (tied with devops, the current maximum), so the axis should be re-checked if the content grows.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Extend supply-chain (dependency licensing): rejected. The supply-chain axis is the dependency chain; the OSS persona looks at the project itself (its own license, governance, community, funding)
1. Extend devx (contributing/onboarding): rejected. Contributing is one lens, not the axis; the OSS Architect is a project and ecosystem perspective
1. Add the persona as proposed (no prompts generated): rejected. The interview asked for active, with the three plan/audit/review operations
