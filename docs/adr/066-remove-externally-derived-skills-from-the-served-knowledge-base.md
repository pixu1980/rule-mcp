# 066: Remove externally derived skills from the served knowledge base

- **Date**: 2026-09-07
- **Status**: accepted
- **Tags**: skills, knowledge-base, attribution, governance
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

An audit of the MCP knowledge base (skills/) against an external work-owned skills repository (created 2026-02-18; this repo's skills landed 2026-07-11) found that large portions of rule skills were derived from it: 17 of 96 skill files shared verbatim phrases (up to 57.9% of a file), including stale references to that repository's rules/ tree (rules/api-security.md, rules/testing-standards.md, rules/common.md), template files (assets/templates/, apps/backend monorepo naming), and a pasted copy of its api-security rule set inside rule-backend-security.

## Decision

Remove all externally derived content from the served knowledge base. Permanently deleted 8 skills: rule-devops-docker, rule-devops-version, rule-process-documentation, rule-process-feature-workflow, rule-platform-expo, rule-backend-api-design, rule-devops-gitlab-ci, rule-ai-agents. Rewrote rule-backend-node and rule-backend-security preserving their technical content in entirely new prose (verified: zero identical 8-word prose phrases against the external corpus). Recreated rule-devops-docker from scratch with equal domain coverage and zero prose echo. Re-pointed every surviving cross-reference (hubs, See-also lists, gateway DOMAIN_OVERRIDE, detector framework map, prompt areas, roles) and regenerated the census docs, README and CLAUDE.md counts (89 skills / 105 tools / 184 resources / 73 prompts).

## Consequences

Positive: the MCP knowledge base no longer contains externally derived prose or structure; the surface is coherent (no dead references), all suites green (847 foundations + 78 installer), coverage floor 90 still holds. Negative: removing 7 skills (docker excluded as recreated) permanently retires their tools and guidance; the fork keeps none of them, and any future reintroduction must be written from scratch to the same zero-echo standard.

## What would end this

The assumption this leans on is that prose overlap is the thing worth measuring. It would be wrong if the derivation that matters turned out to be structural - the same taxonomy, the same section order, the same worked example - in files whose sentences share nothing.
