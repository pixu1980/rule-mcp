# 033: The tool surface is ./skills and nothing else

- **Date**: 2026-08-04
- **Status**: accepted
- **Tags**: architecture
- **Author**: rule-architect

## Context

`getSkillNames()` merged `~/.agents/skills` with the bundled `skills/` tree, and any directory holding a `SKILL.md` became a callable tool under the `rule_tool_` prefix regardless of its name.

On the machine that ran the 2026-08-04 audit this exposed **176 tools instead of 88**:

- **79 stale `rule-*` directories** from the previous brand resurfaced as `rule_tool_pix_frontend_react` and siblings - functional duplicates of the `rule_tool_*` set that this repository does not ship;
- **9 generic third-party skills** were renamed into the namespace (`rule_tool_test_driven_development`, `rule_tool_compress`, `rule_tool_find_skills`, `rule_tool_frontend_design`).

Measured cost: 216,102 bytes of tool schemas per model turn, roughly **54k tokens**, about half of it foreign.

Two further consequences of reading the home directory:

- `readSkill()` searched the home directory **first**, so a directory in the user's home silently replaced the content this server ships under the same tool name;
- `loadPluginJs()` imported `plugin.js` from that same home directory into the server process at startup, with no isolation and failures swallowed (audit finding 15).

## Decision

The bundled `skills/` directory is the single source of truth for the tool surface.

- `getSkillNames()` scans only `skills/`, accepts only directories named `rule-*` that carry a `SKILL.md`, and excludes the bare `rule` router directory - its tool is the dispatcher, registered by code.
- `readSkill()` reads only `skills/`, so embedded content is authoritative and cannot be shadowed.
- The `plugin.js` import path is removed: `hasPluginJs()` is constant `false` and `loadPluginJs()` is gone, which also removes in-process code execution from the user's home directory.
- The `rule://skills` resource index reads the same single source.
- `isPluginSkill()` is kept as an explicit guard even though it can no longer be true for a registered skill.

## Consequences

- Custom and third-party skills in `~/.agents/skills` are no longer served by this server, and neither are plugin guardrails from `plugin.js`. This **supersedes the "User control" and "plugin system" points of ADR 003 and ADR 009**.
- `scripts/install-skills.mjs` and the `skills:install` CLI still copy the bundled skills into `~/.agents/skills`, where the server now ignores them. That command needs a decision of its own - it is currently a no-op with a misleading success message.
- Measured effect on the audited machine: **176 → 88 tools**, **216,102 → 105,190 bytes** (≈54k → ≈26k tokens per turn), taken while the 79 `rule-*` directories were still on disk. The surface is now a property of the code, not of the machine.
- `test/minimal-tools.test.mjs` asserted "more than 90 tools" - a threshold that only held because of the inflated surface and would have failed on a clean checkout. It now derives the expected count from `skills/` on disk.
- Covered by `test/skill-surface-embedded-only.test.mjs`, which also proves a home copy cannot shadow embedded content and that a `plugin.js` in the home directory is never imported.
