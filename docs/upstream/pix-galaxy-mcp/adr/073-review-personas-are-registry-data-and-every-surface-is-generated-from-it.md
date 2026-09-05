# 073: Review personas are registry data, and every surface is generated from it

- **Date**: 2026-09-03
- **Status**: accepted
- **Tags**: personas, prompts, tools, registry, commands
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Asking an expert to audit the project was a prompt someone retyped each time, so the wording drifted between people and between roles, and nothing recorded which lenses a given review had actually applied. The personas plan (docs/plans/2026-09-03-review-personas.md) proposed a registry of roles with the surfaces generated from it. The naming contract in that plan gave the MCP prompt and the agent command different prefixes (rule-prompts-<role> and rule-plan-<role>).

## Decision

A role is data in src/core/review-roles.js: id, role title, years, skills, the rule skills it loads as evidence, the lenses it looks through, and a status of active, proposed or deprecated. Fourteen roles ship, seven active. One template (src/core/review-roles-template.js) turns a role into the prompt, with the audit/review/plan contract appended; every surface calls it, so the output is byte-stable and identical across entry points. Surfaces: the tool pix_plan (composable: role plus optional years, skills, topic), one MCP prompt per active role, and the agent command the existing generator derives from that prompt. Deviation from the plan's naming contract: the prompt and the command share the name rule-plan-<role>, because the command generator derives its set from the prompt registry (ADR 029) and two names for one operation is exactly the drift that ADR removed. Overlays load from ~/.rule-mcp/config/roles/ and ./.rule-mcp/roles/, replacing an entry wholesale by id with project winning over user; an invalid overlay is reported and skipped, never fatal, and overlay-sourced text is fenced as data-not-instructions.

## Consequences

Positive: activating, refining or deprecating a role changes every entry point at once; a deprecated role leaves the surfaces but keeps its id so old audits stay attributable; a user or a team can add a role without forking. Negative: the tool surface grows by one (106 to 107) and the prompt surface by twelve, which moves three committed assertions (minimal-tools, skill-surface-embedded-only, the prompts registry test); the per-role skills surface from the plan's B.4 is not built, so a role is reached through pix_plan or its prompt rather than through routing; the project-overlay acceptance gate (plan D.1) is not implemented, and until it is, a project role is fenced but not confirmed by the user before first use.

## Alternatives Considered

1. Per-role skills with their own tools (pix_review_<role>) as the plan's phase B.4 proposed - deferred: seven more tools push the tools/list budget for a capability pix_plan already provides
1. Two names, one for the prompt and one for the command, as the plan's naming contract said - rejected: the generator derives commands from prompts, so the second name would need a second registry
1. Prompts written by hand per role - rejected: that is the drift the registry exists to remove
