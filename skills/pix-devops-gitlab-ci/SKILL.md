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

## Edge cases

- **Docker and deploy stages** only run on the default branch or tags.
- **Production deploy** requires manual trigger and depends on staging succeeding first.
- **Branch-specific rules**: If you need to run pipelines only on specific branches, add `rules` with `$CI_COMMIT_BRANCH` conditions to individual jobs.
- **Merge request pipelines**: Add `- if: $CI_PIPELINE_SOURCE == "merge_request_event"` to run lint and test on MRs without triggering docker/deploy.

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
