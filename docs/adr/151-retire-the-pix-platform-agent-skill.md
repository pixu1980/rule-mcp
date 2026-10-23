# 151: Retire the rule-platform-agent skill

- **Date**: 2026-10-21
- **Status**: accepted
- **Tags**: skills, platform, removal, breaking, guardrails
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

rule-platform-agent scaffolded AI-agent projects in a framework-agnostic way: structure, tools, env config, testing, containerization. It sat under the platform area and was reachable from the platform router, the dispatcher, rule-ai, rule-ai-agent-architecture and the auth persona. The owner decided on 2026-10-21 that the catalog should not carry it: the agent surface is already owned by rule-ai and rule-ai-agent-architecture, and the scaffold guidance duplicated what those two say with a different emphasis.

## Decision

Delete skills/rule-platform-agent and every live trace of it: the two router rows, the three dispatcher references, the rule-ai table row and quick-selection line, the cross-reference in rule-ai-agent-architecture, the auth persona's evidence list, and the plan index row. Regenerate the census documents and the snapshot. Keep the historical records untouched: ADR 026 and CHANGELOG.md are history, and rewriting them would make the record lie. Add src/core/skills/**tests**/_retired-skills.test.mjs as the tombstone: a retired id may have no directory, no link from any SKILL.md, persona or plan index, and no minted tool.

## Consequences

The catalog drops from 84 to 83 skills, 105 to 104 tools and 176 to 174 resources, all enforced by the docs-accuracy test. Plan index number 40 is retired and the remaining numbers stay put, so every #NN reference in the plans still points at the same skill. A retired id can no longer come back by accident: the tombstone test fails on any reappearance, in the catalog or in a router.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Merge the scaffold content into rule-ai-agent-architecture and delete the id (rejected: the content is the part the owner did not want, and a merge would have kept it under a new name)
1. Keep the skill but unlist it from the routers (rejected: an unlisted skill is exactly the orphan rule-platform-auth proved is invisible, and the tests would have to be told to ignore it)
1. Deprecate with a stub that points at rule-ai (rejected: a stub still mints a tool and a resource, and the catalog pays for a redirect it can express as a link)
