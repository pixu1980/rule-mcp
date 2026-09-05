# 045: Three skills for working with AI, and one attribution table

- **Date**: 2026-08-29
- **Status**: accepted
- **Tags**: skills, evals, sdlc, prompting, attribution
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The corpus covered how to write code and said almost nothing about working with the thing writing it. Three gaps in particular. There was no guidance on measuring whether an AI feature works, so any team building one would reach for foundation-model benchmarks, which answer a different question and produce numbers nobody acts on. There was nothing on where AI sits in the lifecycle as opposed to inside a single task, so the parts built for human pace - gathering requirements, waiting for review, waiting for a deploy window - stay the bottleneck no matter how fast implementation gets. And there was nothing on prompting itself, which matters most for whoever is earliest in their career: an agent that produces working code teaches nothing about what to ask for, what to check, or when not to ask. Separately, the repository had been distilling published work for three phases with the credit living only in commit messages, which is not where a reader looks.

## Decision

Add rule-mcp-evals, rule-process-ai-sdlc and rule-mcp-prompting. The evals skill puts error analysis first and refuses to write a judge before failure modes are counted, keeps judges binary and single-purpose, calibrates them against human labels with TPR and TNR, and applies the Rogan-Gladen correction before any aggregate rate is reported. The SDLC skill records the intent-to-incident artifact chain, plan before code, feedback loops that verify their own work, hooks as deterministic gates, and control-band maintenance where detection has no model in the path. It deliberately reverses one piece of its source: where the playbook suggests subagents for repeated work, this skill states the no-subagent rule, because a subagent buys a fresh context window to answer what a deterministic tool answers for free. The prompting skill covers prompt anatomy, context engineering, the workflow mistakes that cost the most, and the learning-mode rule - no code in, no code out - which keeps problem solving and debugging with the person practicing them. A README "Inspired by" table now names every source, where it landed, and its license, stating explicitly that the evals repository carries no license and was therefore reimplemented rather than copied.

## Consequences

Routing was spot-checked on seven prompts: six land exactly, the seventh on the area dispatcher with the intended skill as first alternative. Getting there needed the P3 lesson applied up front - the words a person types have to be in the section heading, because headings score three times body text - so headings read "Error analysis first: look at your traces" rather than "Look at your traces". The attribution table is now the place a claim of influence can be checked, and it carries two entries for work not yet built (WCAG-EM data, the .flight exporter) marked as planned, so the table does not overstate what shipped. Cost: three more skills on the tool surface, now 97 tools and 86 skills, which is the tradeoff the full-surface decision already accepted.
