---
name: rule-mcp-process
description: >-
  Use when following development methodologies to route to the correct process
  skill. Covers ADRs, BMAD, code review, documentation, feature workflow,
  session handoff and handon, and prose/prompt compression via rule_tool_compress.
tags:
  - "process"
  - "methodology"
  - "adr"
  - "workflow"
  - "code-review"
  - "documentation"
  - "handoff"
  - "handon"
  - "resume"
  - "session"
  - "compress"
  - "compression"
  - "tokens"
  - "terse"
  - "index"
frameworks: [all]
---

# rule-mcp-process - Process & Methodology Skills Index

## Available Skills

| Skill                                                                    | Purpose                                                                         | When to Use                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [rule-mcp-process-ai](../rule-mcp-process-ai/SKILL.md)                   | Intent to incident, plan before code, gates, review, scope and prose discipline | Planning how AI fits the lifecycle, or writing anything a reader will see         |
| [rule-mcp-process-adr](../rule-mcp-process-adr/SKILL.md)                 | Architecture Decision Records                                                   | After every scaffold/detect/detect call                                           |
| [rule-mcp-process-bmad](../rule-mcp-process-bmad/SKILL.md)               | BMAD Method Framework                                                           | Full-project AI-driven delivery lifecycle                                         |
| [rule-mcp-process-code-review](../rule-mcp-process-code-review/SKILL.md) | Code Review Workflow                                                            | Preparing and conducting risk-based PR/MR review                                  |
| [rule-mcp-process-changelog](../rule-mcp-process-changelog/SKILL.md)     | Changelog generated from the commits                                            | Adding a changelog, or fixing one that drifted from the history                   |
| `rule_tool_compress` / `/rule-compress`                                  | Say it in fewer tokens                                                          | Writing answers, commits, reviews, docs without filler                            |
| `rule_tool_handoff` / `/rule-handoff`                                    | LLM Session Handoff                                                             | Closing a session, resuming in new chat                                           |
| [rule-mcp-process-npm-release](../rule-mcp-process-npm-release/SKILL.md) | Secure npm Release                                                              | Publishing a package: Trusted Publishing, staged releases, supply-chain hardening |
| [rule-mcp-process-readme](../rule-mcp-process-readme/SKILL.md)           | README structure for open source and internal repos                             | Writing or rewriting a project README                                             |

## Quick Selection Guide

```
Need to record a decision?              → rule-mcp-process-adr
Need a development methodology?         → rule-mcp-process-bmad
Need PR/MR review guidance?             → rule-mcp-process-code-review
Need shorter answers without losing facts? → rule_tool_compress
Need to close/resume a session?         → rule_tool_handoff
Need to publish an npm package safely?  → rule-mcp-process-npm-release
Need to keep a change minimal, or write English prose? → rule-mcp-process-ai
```

## See also

- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index
