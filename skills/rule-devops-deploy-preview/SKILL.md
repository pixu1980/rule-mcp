---
name: rule-devops-deploy-preview
description: >-
  Use when every merge request must get its own ephemeral preview environment. Covers GitLab review apps on DigitalOcean App Platform: DOCR image build, App Spec template, dynamic environment URL, and automatic teardown on merge.
tags:
  - "devops"
  - "gitlab"
  - "preview"
  - "review-app"
  - "digitalocean"
  - "deploy"
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-mcp-engineering
  version: "1.0"
inherits: [rule-devops]
---

# Deploy preview

A **deploy preview** is a throwaway DigitalOcean App Platform app created when a merge request opens and destroyed when it merges. Reviewers open a real URL instead of checking out a branch.

Two files land in the target repository: `.gitlab-ci.yml` (three jobs) and `.do/review-app.yaml` (the App Spec template). The pipeline renders the template with `envsubst` and hands it to `doctl`.

## When to use a preview environment per merge request

Use it when reviewers must see the change running: UI work, API contract changes, anything a screenshot cannot settle.

Skip it when the merge request cannot be exercised through a URL, or when the project has no Dockerfile. **Every preview is a real billable app** - the branch filter in the pipeline exists to keep that bill bounded.

## Prerequisites

- A **Dockerfile** at the repository root that builds a runnable image. See [rule-devops-docker](../rule-devops-docker/SKILL.md).
- A **DigitalOcean Container Registry** (DOCR) with a repository for the project.
- GitLab **Settings > Merge requests > "Delete source branch when merge request is accepted"** enabled. Automatic cleanup hangs off branch deletion: without this, previews are never destroyed on merge and only `auto_stop_in` catches them.

## Step 1 - Generate the review app pipeline

Copy `assets/templates/.gitlab-ci.preview.yml` to `.gitlab-ci.yml` at the project root.

If the project already has a `.gitlab-ci.yml`, **merge** the three jobs into it rather than overwriting. Only two top-level keys collide:

- `stages` - add `build`, `deploy`, `cleanup` if missing.
- `variables` - add `APP_NAME`, `IMAGE_TAG`, `DOCKER_TLS_CERTDIR`.

Adapt the branch filter to the team convention, or drop its second condition to preview every merge request. The rule is duplicated verbatim in `build_review_image` and `deploy_review_app` rather than shared through a YAML anchor: anchors do not survive GitLab `include:`, and the two jobs must gate identically.

## Step 2 - Generate the DigitalOcean App Spec template

Copy `assets/templates/review-app.yaml` to `.do/review-app.yaml`, then adapt every `# TODO` marker to the target project. Run `rule_tool_detect` on the project path for the runtime and port instead of guessing.

| App Spec field           | Where it comes from in the target project                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services[].name`        | Name of the main service; `web` for a single-service app                                                                                                   |
| `http_port`              | The `EXPOSE` of the Dockerfile, or the port the server binds; default `3000`                                                                               |
| `health_check.http_path` | An existing health endpoint. **Remove the whole block if the project has none** - a check against a missing path fails the deploy instead of protecting it |
| `region`                 | Closest region to the team; default `fra`                                                                                                                  |
| `instance_size_slug`     | Leave `apps-s-1vcpu-0.5gb`, the smallest paid size                                                                                                         |
| `envs`                   | Runtime variables the project needs, plus the three merge request metadata entries. Secrets go into DigitalOcean as `type: SECRET`, never into this file   |

Every `${PLACEHOLDER}` added to the spec **must** be added to the `envsubst` whitelist in the deploy job. A placeholder missing from the whitelist is not substituted, reaches DigitalOcean literally, and provisions an app under the wrong name without failing.

## Step 3 - Configure GitLab CI variables

Set these in **Settings > CI/CD > Variables**:

| Variable             | Description                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `DIGITALOCEAN_TOKEN` | DigitalOcean API token with registry push/pull and App Platform create/read/update/delete. Masked, **Protected: no** |
| `DO_REGISTRY_NAME`   | DOCR registry name                                                                                                   |
| `DO_REPOSITORY_NAME` | Image repository name inside the registry                                                                            |

`DIGITALOCEAN_TOKEN` must **not** be Protected: merge request pipelines run on unprotected branches, and a protected variable is simply absent there. The token doubles as both Docker registry username and password, so no separate registry credentials are needed.

## How the merge request URL is published

The deploy job writes the app URL to `deploy.env`, exported as a `dotenv` report artifact, and the job declares `environment.url: $DYNAMIC_ENVIRONMENT_URL`. GitLab renders the "View app" button on the merge request from that.

No GitLab API token and no bot account: posting a merge request comment would need an `api`-scoped token, the dotenv artifact needs nothing.

## How the preview is destroyed on merge

Teardown runs through the GitLab environment lifecycle:

1. The deploy job declares `on_stop: stop_review_app` and `auto_stop_in: 3 days`.
2. `stop_review_app` declares `environment.action: stop` on the same environment name.
3. GitLab stops `review/<iid>` when the source branch is deleted - which is what merging does, given the project setting in **Prerequisites** - and running the stop job is how it does that.
4. `auto_stop_in` is the safety net for merge requests that are abandoned rather than merged.

`on_stop` is used rather than a default-branch pipeline or a webhook because it is the only mechanism where `CI_MERGE_REQUEST_IID` is still in scope, so the app name can be derived without a lookup.

## Edge cases

- **`doctl` is not on the PATH.** The `digitalocean/doctl` image exposes the binary only through its ENTRYPOINT at `/app/doctl`. With `entrypoint: [""]`, `export PATH="$PATH:/app"` is mandatory in both jobs.
- **`--wait` on create and update is mandatory.** Without waiting for provisioning, `default_ingress` is empty and the environment URL is broken.
- **Never parse the output of `doctl apps create`.** Re-read the id from `doctl apps list` and the URL from `doctl apps get`, so create and update converge on the same code path.
- **The stop job must not carry the branch filter.** If its `rules` are stricter than the deploy job's, GitLab never creates the job and nothing is ever deleted.
- **Silent no-op delete.** If `CI_MERGE_REQUEST_IID` is out of scope, `APP_NAME` becomes `review-mr-`, matches nothing, and the job succeeds having deleted nothing. The `case "$APP_NAME" in review-mr-?*)` guard fails loudly instead.
- **Idempotency.** The deploy job runs on every push to the merge request: look the app up by name and update it, never create blindly. The delete tolerates an already-missing app.
- **Apple Silicon.** Images built locally for testing need `docker build --platform linux/amd64`; an arm64 image does not run on App Platform. The CI runner is already amd64.
- **Shared resources are not isolated.** Every preview talks to the same database, auth provider and third-party callbacks as its siblings. Per-merge-request isolation - schema per app, tenant id, callback URL allowlist - is the target project's responsibility, not this pipeline's.
- **Orphaned apps.** `doctl apps list` filtered on names starting with `review-mr-` shows previews that outlived their merge request.

---

## See also

- [rule-devops](../rule-devops/SKILL.md) - DevOps skills index
- [rule-devops-docker](../rule-devops-docker/SKILL.md) - The Dockerfile the preview image is built from
- [rule-mcp](../rule/SKILL.md) - Central skill index and dispatcher
