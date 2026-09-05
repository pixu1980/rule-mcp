# 065: Fifty-three topics distilled into twenty existing skills, and the one not written

- **Date**: 2026-09-01
- **Status**: accepted
- **Tags**: skills, content, routing, corpus, documentation
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The corpus knew how to write code and did not know what had been learned about writing it recently. Fifty-three topics were read outside this repository across three categories: agent and AI engineering, engineering practice, and system design. R4 turned the two largest gaps into skills (ADR 055). R6 was the rest.

This decision is recorded after the fact because the phase produced no structural change to argue about while it ran, and one judgment worth keeping: what was deliberately not written.

## Decision

Nineteen top-level sections, forty-five headings in total, across twenty existing skills. **No new skill, and therefore no new tool.** A section costs tokens only when someone loads it; a tool costs them on every turn.

Where they went, and what each answers:

| Skill                           | Section                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| `rule-mcp-agents`             | Three retrieval layers, and when a vector database is the wrong one       |
| `rule-devops-observability`  | Tracing an agent: spans, the token ledger, cost per task and per session  |
| `rule-mcp-evals`              | What a model generates well, and what it gets wrong quietly               |
| `rule-process-code-review`   | Reviewing code you did not write                                          |
| `rule-process-simplicity`    | What did not compress when writing code got faster                        |
| `rule-ui-design-system`      | Design critique, one axis per pass                                        |
| `rule-styleguide-javascript` | Ownership of async state; the built-ins that replaced a lodash import     |
| `rule-styleguide-html`       | The elements that replaced a library; what each semantic element buys     |
| `rule-styleguide-css`        | Six layout rules                                                          |
| `rule-platform-web`          | A second pass of browser APIs                                             |
| `rule-backend`               | Six ideas that replace memorizing; the layouts and when each stops paying |
| `rule-backend-node`          | A bounded pool; fan-out at scale                                          |
| `rule-backend-api-design`    | Idempotency as a mechanism rather than a header                           |
| `rule-data`                  | Architecture patterns by the question each answers                        |
| `rule-data-sql`              | Why a random primary key hurts at volume; cache coherence                 |
| `rule-data-postgresql`       | Choosing a partition key, and the hot partition it decides                |
| `rule-devops-testing`        | What a flaky test costs, in delivery metrics                              |
| `rule-toolchain-commits`     | Three ways to ignore a file; getting work back                            |
| `rule-devops-gitlab-ci`      | Policy as code                                                            |
| `rule-frontend`              | When the framework is the over-engineering                                |

**One planned section was not written.** The five accessibility basics were already in `rule-styleguide-a11y`, twice over in the case of not relying on color alone. A second normative copy is the failure ADR 049 retired `rules/` for, so the row was closed rather than filled.

## Consequences

Routing went from 56/64 exact to 76/91, and stayed at 100% top-or-alternative. The percentage fell while the covered ground grew, because twenty-seven prompts were added to `test/routing-corpus.mjs` **including the ones that miss**. Every miss still offers the right skill as its first alternative. The tool surface did not move.

What was learned about writing a section that can be found, which cost time to learn and is not obvious from the router's code:

- **A heading is the routing surface, and the stemmer is deliberately conservative.** "Critiquing" does not stem to "critique", so a section titled with the gerund was unreachable by the obvious query. Use the base word.
- **A word in a table cell is not a heading.** "Accordion" sat in a comparison table and lost to every skill with the word in a heading.
- **Avoiding a brand name can cost the route.** The lodash section was written without naming lodash and "do I still need lodash" reached nothing until it was named. A package is not a source.
- **A skill named after a word wins that word.** Nothing containing "agent" outranks `rule-mcp-agent-architecture`. Write the corpus prompt the way a person asks, not the way a skill is titled.
- **Adding a section moves unrelated prompts.** Partitioning arrived in the PostgreSQL skill and took "when is a vector database the wrong answer" with it, because `tsvector` splits into a token that matches. Re-run the corpus after each section rather than at the end.

The reading stayed outside the repository, and `test/no-source-traces.test.mjs` checks that, untracked files included.
