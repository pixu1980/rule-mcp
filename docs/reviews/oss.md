# oss review

- **Role**: oss v1
- **Date**: 2026-10-12

Findings distilled from [the audit](../audits/oss.md). A finding this run no longer reports is
flipped to resolved and kept one run for visibility, then removed.

| Finding | Severity | Status | Evidence                                  | Summary                                                                                                                 |
| ------- | -------- | ------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| OSS-01  | high     | open   | docs/audits/oss.md#release-provenance     | Release workflow accepts unsigned annotated tags despite signed-tag policy; v0.1.0 has no signature                     |
| OSS-02  | medium   | open   | docs/audits/oss.md#version-and-support    | Security support table names only 1.0.x as supported while package and tag are 0.1.0                                    |
| OSS-03  | medium   | open   | docs/audits/oss.md#conduct-and-governance | Code of conduct appeal routes from maintainer to the same BDFL with no independent alternative                          |
| OSS-05  | medium   | open   | docs/audits/oss.md#local-quality-gates    | Local lint and generated-document checks fail on this dirty working-tree snapshot; clean-branch CI status is unverified |
| OSS-07  | medium   | open   | docs/audits/oss.md#dco-and-license        | Contribution guide describes DCO certification as a license instead of identifying MIT as the inbound license           |
| OSS-04  | low      | open   | docs/audits/oss.md#contributor-path       | Contributor-facing issue and pull request response targets disagree with maintainer commitments                         |
| OSS-06  | low      | open   | docs/audits/oss.md#funding                | Funding document promises donor transparency without a public reporting cadence or location                             |
| OSS-08  | low      | open   | docs/audits/oss.md#discoverability        | README entry page has no direct links to contribution, governance, conduct or security policies                         |
