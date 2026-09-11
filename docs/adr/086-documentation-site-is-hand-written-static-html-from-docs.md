# 086: Documentation site is hand-written static HTML from docs

- **Date**: 2026-09-11
- **Status**: accepted
- **Tags**: docs, site
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

OSS-27: install instructions have no canonical URL because there is no documentation site. The interview decided the direction: build the site from scratch and publish it with GitHub Actions, so the deployed URL becomes the canonical install URL.

## Decision

The documentation site is hand-written: a small Node generator in scripts/docs-site/ renders docs/ Markdown to static HTML with marked (already a devDependency), served locally by a static preview server. No site framework, no new dependencies.

## Consequences

scripts/docs-site/ holds a small marked-based generator plus a static preview server; docs/ stays the source of truth; chapters map to /<slug>.html and ADRs to /adr/<slug>.html with an index; the Pages workflow uploads the emitted artifact.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Adopt a site generator (VitePress/Astro/Next) (rejected: heavy dependencies and a build toolchain for what is 15 chapters plus an ADR log; contradicts the no-build-step grain of the repo)
1. Publish docs from a branch (rejected: a second long-lived branch to keep in sync; the artifact deploys it)
