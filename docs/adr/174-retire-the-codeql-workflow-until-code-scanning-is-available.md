# 174: Retire the CodeQL workflow until code scanning is available

- **Date**: 2026-10-24
- **Status**: accepted
- **Tags**: ci, security, governance
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The `Analyze` check failed on every pull request with "Code scanning is not enabled for this repository". The repository is private, `security_and_analysis` is null, and the default-setup API answers 403; enabling advanced security answers 422, "Advanced security has not been purchased." Without GitHub Advanced Security a private repository cannot store code-scanning results, so the CodeQL job has nowhere to upload the SARIF it produces.

## Decision

Delete `.github/workflows/codeql.yml`. The security surface keeps the dependency audit gate, Dependabot, zizmor and the license-header check; code scanning returns only when the repository can store its results.

## Consequences

No CodeQL alerts are produced. The `Analyze` check disappears from pull requests instead of failing forever, and the CI no longer pays a job that always ends in a configuration error. The workflow is in the git history and is restored verbatim when the capability exists.

## What would end this

Purchasing GitHub Advanced Security, or making the repository public, would let code scanning accept uploads; the workflow and its pinned action SHAs are restored then.

## Alternatives Considered

1. Buy GitHub Advanced Security (a cost decision outside the release)
1. Make the repository public (changes the distribution and support model)
1. Run CodeQL with `upload: false` (the analysis would run and its findings be discarded, which is the same security value as deleting the job)
