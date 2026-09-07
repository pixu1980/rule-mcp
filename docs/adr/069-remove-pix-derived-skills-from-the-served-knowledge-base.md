# 069: Remove rule-derived skills from the served knowledge base

- **Date**: 2026-09-07
- **Status**: accepted
- **Tags**: skills, knowledge-base, attribution, governance
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

An audit of the MCP knowledge base (skills/) against the work-owned repository ~/Projects/work/rule/ai/rule-mcp-skills/ (created 2026-02-18; this repo's skills landed 2026-07-11) found that large portions of rule skills were derived from it: 17 of 96 skill files shared verbatim phrases (up to 57.9% of a file), including stale references to rule's rules/ tree (rules/api-security.md, rules/testing-standards.md, rules/common.md), template files (assets/templates/, apps/backend monorepo naming), and a pasted copy of the rule api-security rule set inside rule-backend-security. Direction: rule -> rule.

## Decision

Remove all rule-derived content from the served knowledge base. Permanently deleted 8 skills: rule-devops-docker, rule-devops-version, rule-process-documentation, rule-process-feature-workflow, rule-platform-expo, rule-backend-api-design, rule-devops-gitlab-ci, rule-ai-agents. Rewrote rule-backend-node and rule-backend-security preserving their technical content in entirely new prose (verified: zero identical 8-word prose phrases vs the rule corpus). Recreated rule-devops-docker from scratch with equal domain coverage and zero prose echo. Re-pointed every surviving cross-reference (hubs, See-also lists, gateway DOMAIN_OVERRIDE, detector framework map, prompt areas, roles) and regenerated the census docs, README and CLAUDE.md counts (89 skills / 105 tools / 184 resources / 73 prompts).

## Consequences

Positive: the MCP knowledge base no longer contains rule-derived prose or structure; the surface is coherent (no dead references), all suites green (847 foundations + 78 installer), coverage floor 90 still holds. Negative: removing 7 skills (docker excluded as recreated) permanently retires their tools and guidance; the fork keeps none of them, and any future reintroduction must be written from scratch to the same zero-echo standard.

## What would end this

The assumption this leans on, and the observation that would make it wrong.
