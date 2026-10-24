# 148: Merge simplicity, English and fingerprint into rule-mcp-process-ai

- **Date**: 2026-10-20
- **Status**: accepted
- **Tags**: skills, process, guardrails, naming, breaking
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Four skills described one body of rules. rule-mcp-process-ai-sdlc carried the lifecycle and owned no guardrail; rule-mcp-process-simplicity carried the scope contract and three rules; rule-mcp-styleguide-english and rule-mcp-styleguide-fingerprint both documented the British to American spelling map and both claimed fp-american-english. The same rule in two documents is the drift ADR 058 exists to prevent, and four index rows and three plans meant four places to keep in step. The English and fingerprint skills also sat in the styleguide area while describing prose that applies to every output, not to a code style.

## Decision

One skill, rule-mcp-process-ai, owns the four bodies: SKILL.md keeps the lifecycle, the scope contract and the reference table, and references/simplicity.md, references/english.md and references/fingerprint.md hold the detail, the shape rule-mcp-styleguide-a11y already uses. The nine guardrails move into one family under the ai- prefix. The name changes from rule-mcp-process-ai-sdlc, and because the tool id is derived from the skill name, the tool becomes rule_tool_process_ai. The three absorbed directories are deleted rather than tombstoned: their names join removedSkillNames in the skill corpus test, so a surviving reference fails the suite instead of rotting. The four plan rows collapse into one, docs/plans/skills/DEPENDENCIES.md records the run order, and this plan runs first because every other plan is written by these rules.

## Consequences

Positive: one owner per rule; the spelling map exists once; a scope or prose change lands in one file; the ranker sees the scope vocabulary in SKILL.md, which is the file it indexes. Negative: rule_tool_process_ai_sdlc no longer exists, so an external client has to follow the rename; the skill is 218 lines plus 498 in references, which a reader has to know to open; and moving a body into references removes it from the routed text, which cost one routing regression until the scope contract was restated in SKILL.md. Neutral: the surface drops to 84 skills and 105 tools, and the census and README counts follow from the registry rather than from a hand edit.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the three as thin tombstones that point at the merged skill. Rejected: an index row and a directory that carry no content are exactly the two things that go stale, and the corpus test can already name a removed skill.
1. Merge the content but keep the four guardrail prefixes (en-, fp-, no-) so nothing has to be renamed. Rejected: a family whose ids name three different former owners is a family nobody can enumerate.
1. Rename the skill and keep rule_tool_process_ai_sdlc as an alias. Rejected: the tool registry derives the id from the name, and a hand-maintained alias is a second name to keep in step, which is the problem this ADR removes.
