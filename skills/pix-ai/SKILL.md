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

# rule-ai — AI Agent Skills Index

## AI Agent Skills

| Skill                                                | Core Library              | Use when                                                                                                                                    |
| ---------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [rule-ai-agents](../rule-ai-agents/SKILL.md)           | `@rule/rule-mcp-core`    | Scaffolding AI Agent repositories on `@rule/rule-mcp-core`: providers, tools, registries, testing, containerization.                       |
| [rule-platform-agent](../rule-platform-agent/SKILL.md) | none (framework-agnostic) | Structuring an AI Agent project without prescribing a specific SDK or core library (LangChain, Vercel AI SDK, MCP clients, custom runners). |

## Quick Selection Guide

```
Need agents on @rule/rule-mcp-core (providers, tools, seed, Docker)?  → rule-ai-agents
Need framework-agnostic agent project structure (any SDK)?            → rule-platform-agent
```

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
- [rule-devops-testing](../rule-devops-testing/SKILL.md) — Test coverage thresholds for agent code
- [rule-devops-docker](../rule-devops-docker/SKILL.md) — Containerizing agent services

---
