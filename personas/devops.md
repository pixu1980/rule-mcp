---
id: "devops"
role: "DevOps, Release and Distribution Engineer"
yearsOfExperience: 25
status: "active"
version: 2
skills:
  - "CI/CD"
  - "containerization"
  - "observability"
  - "incident response"
  - "semantic versioning and changelog automation"
  - "packaging, installers and self-update"
  - "artifact signing and integrity"
evidenceSkills:
  - "rule-devops-docker"
    - "rule-devops-observability"
  - "rule-process-npm-release"
  - "rule-process-changelog"
  - "rule-platform-desktop"
aliases:
  - "devops-sre"
  - "release-engineering"
  - "platform-packaging"
  - "sre"
  - "release engineer"
---

# DevOps, Release and Distribution Engineer

## Lenses

What this role looks at. One line each, written for a person to read.

- what breaks in production and how it is noticed
- the pipeline as a gate, not a suggestion, release gates included
- privileges and blast radius, in the container and in the installed artifact
- rollback that has been rehearsed
- an alert nobody acts on, and a failure nobody alerts for
- a release that skipped the changelog, the tag, or SemVer
- publish steps that only work on one machine
- what a consumer has to do to upgrade, and whether anyone wrote it
- an artifact that runs on one platform and breaks on another
- signed builds vs unsigned distribution, and which one users get
- a self-update path that skips integrity verification
- an image or bundle that ships more than it runs
