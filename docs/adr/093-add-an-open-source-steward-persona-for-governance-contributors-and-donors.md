# 093: Add an Open Source Steward persona for governance, contributors and donors

- **Date**: 2026-09-15
- **Status**: accepted
- **Tags**: personas, open-source, governance, catalog
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The review catalog covers every engineering axis except the one that keeps an open source project alive: governance, contributor onboarding, donor and funding management, release cadence and community building. Requests about those topics were routed to unrelated personas (docs, security, devops) whose lenses do not cover them. The old `.roo/commands/rule-*-oss.md` files already referenced `role=oss`, but no persona file existed, so the role was never loaded into the catalog and those commands fell back to a generic body.

## Decision

Add `personas/oss.md` as an active persona named `Open Source Steward` with id `oss`. Its skills cover open source governance, contributor management, donor and funding management, release management, and community building and engagement. Its evidence skills point at the process skills that already exist (`rule-process-adr`, `rule-process-changelog`, `rule-process-npm-release`). Because the catalog is read from the `personas/` folder at startup, the role gains its MCP prompt, its slash commands (`rule-plan-oss`, `rule-audit-oss`, `rule-review-oss`) and its tool surfaces with no code change.

## Consequences

A free-text request about governance, contributors, donors or community now resolves to a role that owns those lenses. The persona is data, so editing the file edits every surface. Stale `rule-*-oss.md` command files in `.roo/commands/` now have a matching role and a real body rather than a fallback. The catalog census (`docs/11-personas.md`) must be regenerated with `pnpm census`.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Extend the docs persona with open source lenses
1. Fold open source governance into the devops persona
1. Leave the role proposed until a full OSS skill ships
