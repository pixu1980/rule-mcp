---
name: rule-ai
description: >-
  Use when building AI Agent applications to route to the correct skill. Covers agent scaffolding on @rule/rule-mcp-core and framework-agnostic agent guidance.
tags:
  - "ai"
  - "agents"
  - "llm"
  - "index"
frameworks: [all]
compatibility: Designed for AI coding assistants
---

# rule-ai - AI Agent Skills Index

## AI Agent Skills

| Skill                                                                | Core Library                                                                                                 | Use when                                                                                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [rule-ai-evals](../rule-ai-evals/SKILL.md)                             | Error analysis, LLM-as-judge, judge calibration, RAG evals                                                   | Measuring whether an AI feature works                                                                                                       |
| [rule-ai-context-engineering](../rule-ai-context-engineering/SKILL.md) | The window as a budget, less-beats-more, delegation levels, compaction and handoff, usage limits             | A session is getting expensive, slow or worse                                                                                               |
| [rule-ai-agent-architecture](../rule-ai-agent-architecture/SKILL.md)   | What happens at the API boundary, the harness over the model, loops against graphs, MCP, tool surface design | Building or reviewing an agent or an MCP server                                                                                             |
| [rule-ai-prompting](../rule-ai-prompting/SKILL.md)                     | Prompt anatomy, context engineering, learning mode                                                           | Working with an agent, or teaching someone to                                                                                               |
| [rule-platform-agent](../rule-platform-agent/SKILL.md)                 | none (framework-agnostic)                                                                                    | Structuring an AI Agent project without prescribing a specific SDK or core library (LangChain, Vercel AI SDK, MCP clients, custom runners). |

## Quick Selection Guide

```
Need framework-agnostic agent project structure (any SDK)?            → rule-platform-agent
```

## AI features to build that are not another chatbot

A chat box is the least imaginative place to put a model: it makes the user
describe what they want in prose, wait, then read prose back. These put the same
capability where the work already happens.

| Feature                           | What it replaces                                                             | Watch for                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Smart form autofill               | Typing what the app could infer from a paste, an upload, or a previous entry | Always show what was filled and let it be corrected, never submit silently  |
| Search that understands intent    | Exact-match search that fails on a synonym                                   | Keep keyword search as the floor; embeddings on top, not instead            |
| Automatic content tagging         | A taxonomy nobody maintains                                                  | Suggest, do not assign. Track acceptance rate as the quality metric         |
| Writing assistance in place       | Copying into another tool and back                                           | Edit the user's text, do not replace their voice                            |
| Suggested replies in the workflow | A separate assistant window                                                  | Three short options beat one long draft                                     |
| Feedback and sentiment rollups    | Reading every review by hand                                                 | Report counts and examples, never a single sentiment score                  |
| Moderation and safety checks      | Manual review of everything                                                  | A model triages, a person decides on the borderline cases                   |
| Voice notes turned into work      | A recording nobody can search                                                | Transcribe, then extract the actions; keep the audio                        |
| Recommendations with a reason     | "You may also like" with no explanation                                      | Show why it was recommended; it is the difference between useful and creepy |
| Insight lines on dashboards       | A chart the reader has to interpret                                          | State the change and the likely cause, link to the underlying rows          |

Common rules for all of them:

- **Put it where the work is.** A feature the user has to go somewhere to use is
  a feature they forget.
- **Suggest, do not act.** Anything irreversible needs a human confirmation step.
- **Show the source.** A recommendation, a tag or an insight with no visible
  reason cannot be trusted or debugged.
- **Degrade cleanly.** The model is a dependency with latency and an error rate:
  design the version of the screen where it is unavailable.
- **Measure acceptance, not output.** How often a suggestion is kept unedited is
  the only quality signal that matters.

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-devops-testing](../rule-devops-testing/SKILL.md) - Test coverage thresholds for agent code
- [rule-devops-docker](../rule-devops-docker/SKILL.md) - Containerizing agent services

---
