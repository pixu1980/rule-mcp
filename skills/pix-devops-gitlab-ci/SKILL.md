---
name: rule-devops-gitlab-ci
description: >-
  Use when creating or maintaining GitLab CI pipelines. Covers caching, Docker build/push, coverage reports, deploy stages, and workflow configuration.
tags:
  - "devops"
  - "gitlab"
  - "ci"
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# GitLab CI

## Pipeline stages

Every repository must have these stages in order:

1. **install** - Install dependencies with `pnpm install --frozen-lockfile`
2. **lint** - Run `pnpm lint` (Biome check or other)
3. **test** - Run `pnpm test:coverage` with coverage enforcement
4. **build** - Run `pnpm build` (TypeScript compilation or Vite build)
5. **docker** - Build and push Docker images to the GitLab container registry
6. **deploy** - Deploy to staging and production environments

Or use `pnpm` instead.

## Step 1 - Generate the complete .gitlab-ci.yml

Copy `assets/templates/.gitlab-ci.yml` to `.gitlab-ci.yml` at the project root.

## Step 2 - Adapt for monorepos

For monorepos with multiple packages, replace the `test` and `build` jobs with the per-package variants from `assets/templates/.gitlab-ci.monorepo.yml`. Adjust package names and coverage paths to match the actual monorepo structure.

Test jobs run in parallel. Build jobs depend on their respective test jobs.

## Step 3 - Configure CI variables in GitLab

Set these in **Settings > CI/CD > Variables**:

| Variable                  | Description                               |
| ------------------------- | ----------------------------------------- |
| `STAGING_DEPLOY_HOST`     | Staging deployment API host               |
| `STAGING_DEPLOY_TOKEN`    | Staging deployment auth token (masked)    |
| `PRODUCTION_DEPLOY_HOST`  | Production deployment API host            |
| `PRODUCTION_DEPLOY_TOKEN` | Production deployment auth token (masked) |

## Caching strategy

- Cache the pnpm store (`.pnpm-store/`) keyed by `package-lock.json` hash
- Alternatively cache the pnpm store (`.pnpm-store/`) keyed by `pnpm-lock.yaml` hash
- The `install` job uses `pull-push` policy (reads and writes cache)
- All other jobs use `pull` policy (read-only)
- Pass `node_modules/` as artifacts from install to downstream jobs

## Policy as code: releases that need no human at the keyboard

A human reviewer reading YAML will miss a nested misconfiguration, reliably and
through no fault of their own. The rules that must hold belong in a file next to
the code, evaluated by the pipeline, failing the job rather than producing a
comment somebody may act on.

The shape is the same whatever engine evaluates it:

1. **The rule lives in version control**, reviewed like any other change, so
   changing what is allowed is itself a reviewable event.
2. **The pipeline evaluates it against the manifest** before the artifact is
   built or the plan applied, which is the only point where refusing is cheap.
3. **A violation is a non-zero exit**, so the merge request is blocked by the
   same mechanism that blocks a failing test, and the message names the rule
   rather than the line.

```yaml
policy:
  stage: test
  image:
    name: openpolicyagent/conftest:latest
    entrypoint: [""]
  script:
    - conftest test k8s/ --policy policy/
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

The rule itself states what must be true and the message it fails with:

```rego
package main

import rego.v1

deny contains msg if {
  input.kind == "Deployment"
  not input.spec.template.spec.securityContext.runAsNonRoot
  msg := "Deployments must set runAsNonRoot: true"
}
```

Because the evaluation is over parsed structure rather than text, the same
approach covers an infrastructure plan, a container manifest and an application
configuration with one language and one place to look.

Three things decide whether this holds:

- **Write the message for the person who will read it at the moment they are
  blocked.** "Violation of rule 14" starts an investigation; naming the field and
  the expected value ends one.
- **Fail before the expensive stage**, so a rejection costs seconds rather than
  a build.
- **An exception is a rule change, not a bypass**, committed and reviewed. A
  pipeline that can be skipped is a suggestion, and it will be skipped on the
  day it matters.

## Edge cases

- **Docker and deploy stages** only run on the default branch or tags.
- **Production deploy** requires manual trigger and depends on staging succeeding first.
- **Branch-specific rules**: If you need to run pipelines only on specific branches, add `rules` with `$CI_COMMIT_BRANCH` conditions to individual jobs.
- **Merge request pipelines**: Add `- if: $CI_PIPELINE_SOURCE == "merge_request_event"` to run lint and test on MRs without triggering docker/deploy.

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
