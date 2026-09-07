---
name: pix-process
description: >-
  Use when following development methodologies to route to the correct process skill. Covers ADRs, BMAD, code review, documentation, feature workflow, and handoffs.
tags:
  - "process"
  - "methodology"
  - "adr"
  - "workflow"
  - "code-review"
  - "documentation"
  - "handoff"
  - "index"
frameworks: [all]
---

# pix-process - Process & Methodology Skills Index

## Available Skills

| Skill                                                          | Purpose                                             | When to Use                                                                       |
| -------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| [pix-process-ai-sdlc](../pix-process-ai-sdlc/SKILL.md)         | Intent to incident, plan before code, gates, review | Planning how AI fits the lifecycle, not one task                                  |
| [pix-process-adr](../pix-process-adr/SKILL.md)                 | Architecture Decision Records                       | After every scaffold/detect/detect call                                           |
| [pix-process-bmad](../pix-process-bmad/SKILL.md)               | BMAD Method Framework                               | Full-project AI-driven delivery lifecycle                                         |
| [pix-process-code-review](../pix-process-code-review/SKILL.md) | Code Review Workflow                                | Preparing and conducting risk-based PR/MR review                                  |
| [pix-process-changelog](../pix-process-changelog/SKILL.md)     | Changelog generated from the commits                | Adding a changelog, or fixing one that drifted from the history                   |
| [pix-process-handoff](../pix-process-handoff/SKILL.md)         | LLM Session Handoff                                 | Closing a session, resuming in new chat                                           |
| [pix-process-npm-release](../pix-process-npm-release/SKILL.md) | Secure npm Release                                  | Publishing a package: Trusted Publishing, staged releases, supply-chain hardening |
| [pix-process-simplicity](../pix-process-simplicity/SKILL.md)   | Build Only What Was Asked                           | Before and during implementation, to keep the change minimal                      |

## Quick Selection Guide

```
Need to record a decision?              → pix-process-adr
Need a development methodology?         → pix-process-bmad
Need PR/MR review guidance?             → pix-process-code-review
Need to close/resume a session?         → pix-process-handoff
Need to publish an npm package safely?  → pix-process-npm-release
Need to keep a change minimal?          → pix-process-simplicity
```

## See also

- [pix](../pix/SKILL.md) - Central skill index
