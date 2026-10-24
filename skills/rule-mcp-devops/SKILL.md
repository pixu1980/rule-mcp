---
name: rule-mcp-devops
description: >-
  Use when setting up CI/CD, Docker, testing, or production reliability infrastructure to route to the correct DevOps skill. Covers pipelines, containers, observability, and version management.
tags:
  - "devops"
  - "ci"
  - "cd"
  - "docker"
  - "preview"
  - "testing"
  - "observability"
  - "version"
  - "index"
frameworks: [all]
guardrails: [env-gitignore, secret-detection]
---

# rule-mcp-devops - DevOps & Engineering Skills Index

## Available Skills

| Skill                                                                      | Domain           | Best For                                                            |
| -------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| [rule-mcp-devops-docker](../rule-mcp-devops-docker/SKILL.md)               | Containerization | Dockerfile, docker-compose, multi-stage builds, security            |
| [rule-mcp-devops-observability](../rule-mcp-devops-observability/SKILL.md) | Reliability      | SLOs, telemetry, alerting, incident learning, rollback verification |
| [rule-mcp-devops-testing](../rule-mcp-devops-testing/SKILL.md)             | Quality          | Vitest, coverage thresholds, integration tests                      |

## Quick Selection Guide

```
Need container setup?                   → rule-mcp-devops-docker
Need a preview app per merge request?   → rule-mcp-devops-deploy-preview
Need production telemetry or SLOs?      → rule-mcp-devops-observability
Need test configuration?                → rule-mcp-devops-testing
```

## See also

- [rule-mcp-toolchain-biome](../rule-mcp-toolchain-biome/SKILL.md) - Linting & formatting
- [rule-mcp-toolchain-husky](../rule-mcp-toolchain-husky/SKILL.md) - Git hooks
- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index
