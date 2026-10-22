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

## Conduct recusal and appeals

Code of Conduct reports follow `CODE_OF_CONDUCT.md`. Any moderator who is the
subject of a report or has a conflict of interest must recuse from intake,
investigation, enforcement, and appeal handling. When a co-maintainer is listed
in `MAINTAINERS.md`, reports or appeals involving the BDFL are handled
confidentially by that co-maintainer without BDFL participation. While the bus
factor is one and no independent internal moderator exists yet, reports or
appeals involving the BDFL go directly to GitHub Trust & Safety at
[https://github.com/contact/report-abuse](https://github.com/contact/report-abuse)
so reporter identity stays private.

## Branch protection (target state)

`main` requires the `ci` checks plus the CodeQL and audit checks, and one
approving review for contributors outside the maintainer list. Enabling it in
the repository host settings is owner action 16.5, tracked in
`docs/plans/plan-of-plans.md` (Stage 0) and recorded in this section so the
target setting stays auditable in-tree.

## Funding

The project is unfunded today: no donations have been received and no
expenses are covered by anyone but the maintainer. GitHub Sponsors (`pixu1980`
in `.github/FUNDING.yml`) is the only approved funding channel, controlled by
the BDFL, who publishes an annual aggregate summary in this section (total
received and expenses covered over the calendar year, never exposing individual
donor identities without consent). Sponsorship buys no roadmap priority.
Donations do not change the decision process above: an ADR still needs
its reasons, and money is never one of them.
