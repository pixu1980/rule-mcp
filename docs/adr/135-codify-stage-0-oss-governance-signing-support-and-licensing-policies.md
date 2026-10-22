# 135: Codify Stage 0 OSS governance, signing, support, and licensing policies

- **Date**: 2026-10-22
- **Status**: accepted
- **Tags**: governance, security, release
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Stage 0 of `plan-of-plans.md` required owner decisions on five open public commitments before cross-branch merges could proceed: cryptographic release-tag verification (`OSS-01`), pre-1.0 security support (`OSS-02`), Code of Conduct appeal routing when the BDFL is involved (`OSS-03`), contributor response targets (`OSS-04`), clean-checkout lint and census gates (`OSS-05`), funding transparency cadence (`OSS-06`), inbound contribution licensing versus DCO provenance (`OSS-07`), and policy discoverability from `README.md` (`OSS-08`).

## Decision

1. Sign release tags with a dedicated Ed25519 GPG key (fingerprint `37D68446F3ADCF1C8C37C07A15571530D4B63084`), commit the public key at `release-signing-key.asc` in `.github`, and verify tags with `git verify-tag` in `release.yml` without rewriting historical tag `v0.1.0`. 2. Support the active `0.1.x` minor line in `SECURITY.md` (`< 0.1.0` unsupported) until `1.0.0` ships. 3. Mandate BDFL recusal in `CODE_OF_CONDUCT.md` and `GOVERNANCE.md`, routing reports involving the BDFL to a non-conflicted co-maintainer when one exists and to GitHub Trust and Safety (`report-abuse` contact form) while the bus factor is one. 4. Standardize response targets at 2 business days for issue triage and 7 business days for pull request review in `CONTRIBUTING.md` and `MAINTAINERS.md`. 5. Keep GitHub Sponsors (`pixu1980`) active in `FUNDING.yml` with an annual aggregate summary in `GOVERNANCE.md` that never exposes individual donors. 6. Clarify inbound equals outbound licensing in `CONTRIBUTING.md` with the DCO `Signed-off-by` trailer serving solely as provenance certification. 7. Link all five governance documents from `README.md` and keep clean-checkout lint and census gates green.

## Consequences

Positive: `release.yml` rejects unsigned annotated tags before GitHub Release creation; `SECURITY.md`, `CODE_OF_CONDUCT.md`, `GOVERNANCE.md`, `CONTRIBUTING.md`, `MAINTAINERS.md`, and `README.md` agree on signing, supported versions, conduct escalation, response targets, funding disclosure, and permissive inbound licensing; clean-checkout lint, census, and test suites pass. Negative: maintainers must sign release tags with the committed GPG key or update `release-signing-key.asc` in `.github` when rotating keys.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Use SSH tag signing instead of a dedicated GPG key; rejected by owner decision in favor of a dedicated Ed25519 GPG key committed as `release-signing-key.asc` in `.github`.
1. Defer formal security support until `1.0.0`; rejected so the released `0.1.x` series has an explicit security support commitment today.
1. Keep internal-only conduct escalation while bus factor is one; rejected because a report involving the sole maintainer needs an external path (GitHub Trust and Safety) until a co-maintainer joins.
