# Governance

rule-mcp is led by an explicit **BDFL** with a documented path to
co-maintainers (ADR 083). The bus factor is one today; this file exists so
that fact is stated, not discovered.

## Roles

- **Contributor** - anyone who opens an issue or a pull request. No
  invitation needed; the contribution path is in CONTRIBUTING.md.
- **Triager** - a contributor the maintainer trusts to label and route
  issues. Earned through sustained, well-scoped reports.
- **Maintainer** - earns merge rights through sustained reviewed
  contributions plus a BDFL nomination recorded in MAINTAINERS.md. There
  are no inactive maintainers: a maintainer who stops responding is
  moved back to contributor by the BDFL, in the open, with reasons.
- **BDFL** - pixu1980. Sets direction, has the final word, and owns the
  accounts (repository settings, releases, funding).

## How decisions are made

Small fixes need no ceremony: open the pull request and it gets reviewed.
Structural change needs an ADR first - `docs/adr/` is the record of
decisions, and a structural pull request without one is sent back for it.

Disagreements escalate in this order:

1. Write the disagreement down as an ADR, with the alternatives considered.
2. A maintainer rules on the ADR.
3. The BDFL rules last, and that ruling is final.

## Branch protection (target state)

`main` requires the `ci` checks plus the CodeQL and audit checks, and one
approving review for contributors outside the maintainer list. Enabling it
is owner action 16.5 of docs/plans/oss.md; this section records the exact
setting so it is auditable once enabled.

## Funding and neutrality

Donations do not buy roadmap priority and do not change this process.
Who controls the account is stated wherever funding is documented.
