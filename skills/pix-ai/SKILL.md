---
name: pix-ai
description: >-
  Use when building AI Agent applications to route to the correct skill. Covers agent scaffolding on @pix/pix-galaxy-core and framework-agnostic agent guidance.
tags:
  - "ai"
  - "agents"
  - "llm"
  - "index"
frameworks: [all]
compatibility: Designed for AI coding assistants
---

# pix-ai - AI Agent Skills Index

## AI Agent Skills

| Skill                                                | Core Library              | Use when                                                                                                                                    |
| ---------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [pix-ai-agents](../pix-ai-agents/SKILL.md)           | `@pix/pix-galaxy-core`    | Scaffolding AI Agent repositories on `@pix/pix-galaxy-core`: providers, tools, registries, testing, containerization.                       |
| [pix-platform-agent](../pix-platform-agent/SKILL.md) | none (framework-agnostic) | Structuring an AI Agent project without prescribing a specific SDK or core library (LangChain, Vercel AI SDK, MCP clients, custom runners). |

## Quick Selection Guide

```
Need agents on @pix/pix-galaxy-core (providers, tools, seed, Docker)?  → pix-ai-agents
Need framework-agnostic agent project structure (any SDK)?            → pix-platform-agent
```

## See also

- [pix](../pix/SKILL.md) - Central skill index and dispatcher
- [pix-devops-testing](../pix-devops-testing/SKILL.md) - Test coverage thresholds for agent code
- [pix-devops-docker](../pix-devops-docker/SKILL.md) - Containerizing agent services

---
