# 083: Governance is an explicit BDFL with a path to co-maintainers

- **Date**: 2026-09-10
- **Status**: accepted
- **Tags**: governance, community
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

OSS-9: no governance file exists and the bus factor is one. 80+ ADRs record what was decided but nothing records who decides, how a maintainer is added, or how a dispute escalates. Interview decision D6 settled the model: explicit BDFL with a documented path to co-maintainers.

## Decision

Governance is an explicit BDFL (pixu1980) with a documented path to co-maintainers. Disputes escalate ADR, then maintainer, then BDFL, whose word is final. A contributor becomes maintainer through sustained reviewed contributions plus a BDFL nomination recorded in MAINTAINERS.md.

## Consequences

GOVERNANCE.md, MAINTAINERS.md and CODEOWNERS record the model; docs/adr/ stays the decision log; branch protection (owner action 16.5) makes one-review-for-outsiders mechanical.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Consensus or committee voting (rejected: bus factor one - a committee of one is theater, and votes with no voters to count stall decisions)
1. External foundation stewardship (rejected: disproportionate for a single-maintainer project; revisit if co-maintainers arrive)
