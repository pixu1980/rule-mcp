---
name: rule-process
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

# rule-process - Process & Methodology Skills Index

## Available Skills

| Skill                                                          | Purpose                                             | When to Use                                                                       |
| -------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| [rule-process-ai-sdlc](../rule-process-ai-sdlc/SKILL.md)         | Intent to incident, plan before code, gates, review | Planning how AI fits the lifecycle, not one task                                  |
| [rule-process-adr](../rule-process-adr/SKILL.md)                 | Architecture Decision Records                       | After every scaffold/detect/detect call                                           |
| [rule-process-bmad](../rule-process-bmad/SKILL.md)               | BMAD Method Framework                               | Full-project AI-driven delivery lifecycle                                         |
| [rule-process-code-review](../rule-process-code-review/SKILL.md) | Code Review Workflow                                | Preparing and conducting risk-based PR/MR review                                  |
| [rule-process-changelog](../rule-process-changelog/SKILL.md)     | Changelog generated from the commits                | Adding a changelog, or fixing one that drifted from the history                   |
| `rule_tool_compress` / `/rule-compress` | Say it in fewer tokens                              | Writing answers, commits, reviews, docs without filler                            |
| `rule_tool_handoff` / `/rule-handoff`         | LLM Session Handoff                                 | Closing a session, resuming in new chat                                           |
| [rule-process-npm-release](../rule-process-npm-release/SKILL.md) | Secure npm Release                                  | Publishing a package: Trusted Publishing, staged releases, supply-chain hardening |
| [rule-process-simplicity](../rule-process-simplicity/SKILL.md)   | Build Only What Was Asked                           | Before and during implementation, to keep the change minimal                      |

## Quick Selection Guide

```
Need to record a decision?              → rule-process-adr
Need a development methodology?         → rule-process-bmad
Need PR/MR review guidance?             → rule-process-code-review
Need shorter answers without losing facts? → rule_tool_compress
Need to close/resume a session?         → rule_tool_handoff
Need to publish an npm package safely?  → rule-process-npm-release
Need to keep a change minimal?          → rule-process-simplicity
```

## See also

- [rule](../rule/SKILL.md) - Central skill index
