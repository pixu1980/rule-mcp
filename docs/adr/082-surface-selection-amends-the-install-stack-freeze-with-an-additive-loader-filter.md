# 082: Surface selection amends the install stack freeze with an additive loader filter

- **Date**: 2026-09-14
- **Status**: accepted
- **Tags**: install, wizard, architecture
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Step 2 of the install rework adds a dedicated Surface question (preset, areas, skills) for the MCP tool surface, separate from the command files question. ADR 081 froze the rework to wizard steps and contents; enforcing the answer needs the server to read it, which is runtime behavior beyond that freeze.

## Decision

Amend ADR 081 narrowly: the installer writes one grammar string (RULE_MCP_SURFACE) and the loader enforces it with the same post-registration retain the minimal mode uses. No new loader architecture, no registration-time move, no new dependencies; selection resolves against the live catalog so renames warn instead of breaking.

## Consequences

Upside: the installer's surface promise is honest end to end with minimal code. Downside: the loader gains a second filter branch; the registration-time enforcement program stays with the architect run.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the surface choice files-only and leave MCP at full/minimal
1. Allowlist of tool names written at install time (brittle against renames)
