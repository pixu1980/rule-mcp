---
name: rule-devops
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
guardrails: [secret-detection, env-gitignore]
---

# rule-devops - DevOps & Engineering Skills Index

## Available Skills

| Skill                                                            | Domain           | Best For                                                            |
| ---------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| [rule-devops-docker](../rule-devops-docker/SKILL.md)               | Containerization | Dockerfile, docker-compose, multi-stage builds, security            |
| [rule-devops-observability](../rule-devops-observability/SKILL.md) | Reliability      | SLOs, telemetry, alerting, incident learning, rollback verification |
| [rule-devops-testing](../rule-devops-testing/SKILL.md)             | Quality          | Vitest, coverage thresholds, integration tests                      |

## Quick Selection Guide

```
Need container setup?                   → rule-devops-docker
Need a preview app per merge request?   → rule-devops-deploy-preview
Need production telemetry or SLOs?      → rule-devops-observability
Need test configuration?                → rule-devops-testing
```

## See also

- [rule-toolchain-biome](../rule-toolchain-biome/SKILL.md) - Linting & formatting
- [rule-toolchain-husky](../rule-toolchain-husky/SKILL.md) - Git hooks
- [rule](../rule/SKILL.md) - Central skill index
