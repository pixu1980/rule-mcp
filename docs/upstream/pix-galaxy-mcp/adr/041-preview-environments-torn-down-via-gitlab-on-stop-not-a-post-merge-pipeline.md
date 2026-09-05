# 041: Preview environments torn down via GitLab on_stop, not a post-merge pipeline

- **Date**: 2026-08-29
- **Status**: accepted
- **Tags**: devops, gitlab-ci, digitalocean, preview-environments
- **Author**: Alessandro Sarzina <alessandro.sarzina@rule.com>

## Context

The `rule-devops-deploy-preview` skill creates one ephemeral DigitalOcean App Platform app per merge request. Each app is billable, so teardown must be reliable.

The app is addressed by a name derived from `CI_MERGE_REQUEST_IID` (`review-mr-<iid>`), and that variable exists only inside merge request pipelines. Whatever deletes the app must therefore either still have the IID in scope, or be able to recover it.

## Decision

Teardown runs through the GitLab environment lifecycle. The deploy job declares `environment.on_stop` and `auto_stop_in`; a `stop_review_app` job declares `environment.action: stop` on the same environment name. GitLab stops `review/<iid>` when the source branch is deleted - which is what merging does, given the project setting "Delete source branch when merge request is accepted".

The stop job is the only teardown mechanism where `CI_MERGE_REQUEST_IID` is still in scope, so the app name is derived rather than looked up, and no GitLab API token is needed anywhere in the pipeline.

Two constraints follow and are enforced in the template:

- The stop job carries **no branch filter**. A rule stricter than the deploy job's would stop GitLab from creating the job at all, and nothing would ever be deleted.
- A `case "$APP_NAME" in review-mr-?*)` guard fails the job loudly if the IID is ever absent, instead of matching nothing and reporting success having deleted nothing.

`auto_stop_in` (3 days) is the safety net for merge requests that are abandoned rather than merged.

## Alternatives considered

- **A default-branch pipeline triggered after merge.** `CI_MERGE_REQUEST_IID` is out of scope there, so it would need a GitLab API call and an `api`-scoped token to recover the merge request id.
- **A GitLab webhook consumer.** Requires a hosted service holding the DigitalOcean token: new infrastructure to run and secure for a preview feature.
- **`auto_stop_in` alone, with no on_stop job.** Leaves every merged preview billing for up to three days.

## Consequences

**Positive.** No GitLab API token or bot account anywhere in the pipeline. The merge request URL is published through a dotenv artifact and `environment.url`, so teardown and the "View app" button both come free from GitLab's environment machinery. The delete is idempotent and tolerates an already-missing app.

**Negative.** Automatic cleanup depends on a GitLab project setting that lives outside the repository ("Delete source branch when merge request is accepted"); it is documented as a prerequisite in the skill. A merge request merged without deleting its branch falls back to `auto_stop_in` instead of immediate teardown.
